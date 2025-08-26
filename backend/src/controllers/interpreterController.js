const path = require('path');
const Interpreter = require('../models/Interpreter');
const loggerService = require('../services/loggerService');
const emailService = require('../services/emailService');
const { validationResult } = require('express-validator');

class InterpreterController {
    // Create new interpreter profile
    async createProfile(req, res) {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                await loggerService.logValidation('Interpreter profile validation failed', errors.array(), {
                    req,
                    email: req.body?.email
                });
                
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            // Parse JSON fields if they exist
            let languages = [];
            let service_types = [];
            let service_rates = [];
            
            try {
                if (req.body.languages) {
                    languages = typeof req.body.languages === 'string' 
                        ? JSON.parse(req.body.languages) 
                        : req.body.languages;
                }
                
                if (req.body.service_types) {
                    service_types = typeof req.body.service_types === 'string' 
                        ? JSON.parse(req.body.service_types) 
                        : req.body.service_types;
                }
                
                if (req.body.service_rates) {
                    service_rates = typeof req.body.service_rates === 'string' 
                        ? JSON.parse(req.body.service_rates) 
                        : req.body.service_rates;
                }
            } catch (parseError) {
                await loggerService.error('Failed to parse JSON fields', parseError, {
                    category: 'INTERPRETER',
                    req
                });
                
                return res.status(400).json({
                    success: false,
                    message: 'Invalid JSON format in languages, service_types, or service_rates'
                });
            }

            // Check if email already exists
            const existingInterpreter = await Interpreter.findByEmail(req.body.email);
            if (existingInterpreter) {
                return res.status(409).json({
                    success: false,
                    message: 'An interpreter profile with this email already exists'
                });
            }

            // Prepare certificate data from uploaded files and metadata
            const certificates = [];
            let w9File = null;
            
            // Parse certificate metadata if provided
            let certificateMetadata = [];
            if (req.body.certificates_metadata) {
                try {
                    certificateMetadata = JSON.parse(req.body.certificates_metadata);
                    await loggerService.info('Certificate metadata parsed successfully', {
                        category: 'INTERPRETER',
                        certificateCount: certificateMetadata.length,
                        metadata: certificateMetadata,
                        req
                    });
                } catch (e) {
                    await loggerService.error('Failed to parse certificate metadata', e, {
                        category: 'INTERPRETER',
                        req
                    });
                }
            } else {
                await loggerService.info('No certificate metadata provided', {
                    category: 'INTERPRETER',
                    req
                });
            }
            
            if (req.files) {
                // Handle certificate files
                if (req.files.certificates && req.files.certificates.length > 0) {
                    req.files.certificates.forEach((file, index) => {
                        const metadata = certificateMetadata[index] || {};
                        // Convert absolute path to relative path for web access
                        const relativePath = file.path.replace(path.join(__dirname, '../../'), '');
                        certificates.push({
                            certificate_type_id: metadata.certificate_type_id || req.body.certificate_type_id || 1,
                            certificate_number: metadata.certificate_number || null,
                            issuing_organization: metadata.issuing_organization || null,
                            issue_date: metadata.issue_date || null,
                            expiry_date: metadata.expiry_date || null,
                            file_path: relativePath,
                            file_name: file.originalname,
                            file_size: file.size
                        });
                    });
                }
            }
            
            // Handle certificates without files (metadata only)
            if (certificateMetadata.length > 0) {
                await loggerService.info('Processing certificates without files', {
                    category: 'INTERPRETER',
                    certificateCount: certificateMetadata.length,
                    hasFiles: !!(req.files && req.files.certificates),
                    fileCount: req.files && req.files.certificates ? req.files.certificates.length : 0,
                    req
                });
                
                for (let index = 0; index < certificateMetadata.length; index++) {
                    const metadata = certificateMetadata[index];
                    // Check if this certificate already has a file (was processed above)
                    // If there are no files at all, or if there's no file at this index, process as metadata-only
                    const hasFile = req.files && req.files.certificates && req.files.certificates.length > index;
                    
                    if (!hasFile) {
                        // This certificate has metadata but no file
                        const certificateData = {
                            certificate_type_id: metadata.certificate_type_id || req.body.certificate_type_id || 1,
                            certificate_number: metadata.certificate_number || null,
                            issuing_organization: metadata.issuing_organization || null,
                            issue_date: metadata.issue_date || null,
                            expiry_date: metadata.expiry_date || null,
                            file_path: null,
                            file_name: null,
                            file_size: null
                        };
                        
                        certificates.push(certificateData);
                        
                        await loggerService.info('Added certificate without file', {
                            category: 'INTERPRETER',
                            certificateData,
                            index,
                            req
                        });
                    } else {
                        await loggerService.info('Skipping certificate - already has file', {
                            category: 'INTERPRETER',
                            index,
                            req
                        });
                    }
                }
            }
            
            await loggerService.info('Final certificates array prepared', {
                category: 'INTERPRETER',
                certificateCount: certificates.length,
                certificates,
                req
            });
            
            // Handle W9 file
            if (req.files && req.files.w9_file && req.files.w9_file.length > 0) {
                // Convert absolute path to relative path for web access
                const relativePath = req.files.w9_file[0].path.replace(path.join(__dirname, '../../'), '');
                w9File = {
                    file_path: relativePath,
                    file_name: req.files.w9_file[0].originalname,
                    file_size: req.files.w9_file[0].size
                };
            }

            // Create interpreter profile
            const profileData = {
                ...req.body,
                languages,
                service_types,
                service_rates,
                certificates,
                w9_file: w9File,
                created_by: req.user?.id || null  // Use null instead of undefined for database insertion
            };

            const result = await Interpreter.create(profileData);

            // Send confirmation email to the applicant
            try {
                await emailService.queueEmail(
                    'application_received',
                    req.body.email,
                    `${req.body.first_name} ${req.body.last_name}`,
                    {
                        first_name: req.body.first_name,
                        application_id: result.id,
                        submission_date: new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })
                    },
                    'normal'
                );

                await loggerService.logEmail('Confirmation email queued for new interpreter application', {
                    email: req.body.email,
                    template: 'application_received',
                    interpreterId: result.id
                });
            } catch (emailError) {
                // Log email error but don't fail the whole request
                await loggerService.error('Failed to queue confirmation email', emailError, {
                    category: 'EMAIL',
                    interpreterId: result.id,
                    email: req.body.email
                });
            }

            await loggerService.info('Interpreter profile created successfully', {
                category: 'INTERPRETER',
                req,
                interpreterId: result.id,
                email: req.body.email
            });

            res.status(201).json({
                success: true,
                message: 'Interpreter profile created successfully',
                data: result
            });

        } catch (error) {
            await loggerService.error('Failed to create interpreter profile', error, {
                category: 'INTERPRETER',
                req,
                email: req.body?.email
            });

            res.status(500).json({
                success: false,
                message: 'Failed to create interpreter profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get interpreter profile
    async getProfile(req, res) {
        try {
            const interpreterId = req.user.interpreterId;
            
            if (!interpreterId) {
                return res.status(401).json({
                    success: false,
                    message: 'Interpreter ID not found'
                });
            }

            // Get the interpreter profile with all related data
            const profile = await Interpreter.findById(interpreterId);

            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: 'Interpreter profile not found'
                });
            }

            await loggerService.info('Interpreter profile retrieved successfully', {
                category: 'INTERPRETER',
                interpreterId
            });

            res.json({
                success: true,
                message: 'Profile retrieved successfully',
                data: profile
            });

        } catch (error) {
            await loggerService.error('Failed to get interpreter profile', error, {
                category: 'INTERPRETER',
                interpreterId: req.user?.interpreterId
            });

            res.status(500).json({
                success: false,
                message: 'Failed to get profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update interpreter profile
    async updateProfile(req, res) {
        try {
            const interpreterId = req.user.interpreterId;
            
            console.log('Update profile request:', {
                interpreterId,
                body: req.body,
                user: req.user
            });
            
            if (!interpreterId) {
                return res.status(401).json({
                    success: false,
                    message: 'Interpreter ID not found'
                });
            }

            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('Validation errors:', errors.array());
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            // Prepare update data - only include fields that are provided
            const updateData = {
                updated_at: new Date()
            };

            // Only add fields that are provided in the request
            if (req.body.first_name !== undefined) updateData.first_name = req.body.first_name;
            if (req.body.last_name !== undefined) updateData.last_name = req.body.last_name;
            if (req.body.phone !== undefined) updateData.phone = req.body.phone;
            if (req.body.years_of_experience !== undefined) updateData.years_of_experience = req.body.years_of_experience;
            if (req.body.street_address !== undefined) updateData.street_address = req.body.street_address;
            if (req.body.street_address_2 !== undefined) updateData.street_address_2 = req.body.street_address_2;
            if (req.body.city !== undefined) updateData.city = req.body.city;
            if (req.body.state_id !== undefined) updateData.state_id = req.body.state_id;
            if (req.body.zip_code !== undefined) updateData.zip_code = req.body.zip_code;
            if (req.body.latitude !== undefined) updateData.latitude = req.body.latitude;
            if (req.body.longitude !== undefined) updateData.longitude = req.body.longitude;
            if (req.body.service_radius_miles !== undefined) updateData.service_radius_miles = req.body.service_radius_miles;
            if (req.body.hourly_rate !== undefined) updateData.hourly_rate = req.body.hourly_rate;
            if (req.body.bio !== undefined) updateData.bio = req.body.bio;
            if (req.body.availability_notes !== undefined) updateData.availability_notes = req.body.availability_notes;

            console.log('Update data being sent to database:', updateData);
            
            // Update the interpreter profile
            const result = await Interpreter.update(interpreterId, updateData);

            if (!result) {
                console.log('Interpreter update returned null/undefined');
                return res.status(404).json({
                    success: false,
                    message: 'Interpreter profile not found'
                });
            }

            // Get the updated profile with all related data
            const updatedProfile = await Interpreter.findById(interpreterId);

            await loggerService.info('Interpreter profile updated successfully', {
                category: 'INTERPRETER',
                interpreterId,
                updatedFields: Object.keys(updateData)
            });

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedProfile
            });

        } catch (error) {
            await loggerService.error('Failed to update interpreter profile', error, {
                category: 'INTERPRETER',
                interpreterId: req.user?.interpreterId
            });

            res.status(500).json({
                success: false,
                message: 'Failed to update profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

}

module.exports = new InterpreterController();