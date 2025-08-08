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
            } catch (parseError) {
                await loggerService.error('Failed to parse JSON fields', parseError, {
                    category: 'INTERPRETER',
                    req
                });
                
                return res.status(400).json({
                    success: false,
                    message: 'Invalid JSON format in languages or service_types'
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
            if (req.files && req.files.length > 0) {
                let certificateMetadata = [];
                
                // Parse certificate metadata if provided
                if (req.body.certificates_metadata) {
                    try {
                        certificateMetadata = JSON.parse(req.body.certificates_metadata);
                    } catch (e) {
                        await loggerService.error('Failed to parse certificate metadata', e, {
                            category: 'INTERPRETER',
                            req
                        });
                    }
                }
                
                req.files.forEach((file, index) => {
                    const metadata = certificateMetadata[index] || {};
                    certificates.push({
                        certificate_type_id: metadata.certificate_type_id || req.body.certificate_type_id || 1,
                        certificate_number: metadata.certificate_number || null,
                        issuing_organization: metadata.issuing_organization || null,
                        issue_date: metadata.issue_date || null,
                        expiry_date: metadata.expiry_date || null,
                        file_path: file.path,
                        file_name: file.originalname,
                        file_size: file.size
                    });
                });
            }

            // Create interpreter profile
            const profileData = {
                ...req.body,
                languages,
                service_types,
                certificates,
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

    // Get interpreter profile by ID
    async getProfile(req, res) {
        try {
            const { id } = req.params;
            
            const profile = await Interpreter.findById(id);
            
            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: 'Interpreter profile not found'
                });
            }

            await loggerService.info('Interpreter profile retrieved', {
                category: 'INTERPRETER',
                req,
                interpreterId: id
            });

            res.json({
                success: true,
                data: profile
            });

        } catch (error) {
            await loggerService.error('Failed to retrieve interpreter profile', error, {
                category: 'INTERPRETER',
                req,
                interpreterId: req.params.id
            });

            res.status(500).json({
                success: false,
                message: 'Failed to retrieve interpreter profile'
            });
        }
    }

    // Update interpreter profile
    async updateProfile(req, res) {
        try {
            const { id } = req.params;
            
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                await loggerService.logValidation('Interpreter profile update validation failed', errors.array(), {
                    req,
                    interpreterId: id
                });
                
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            // Check if profile exists
            const existingProfile = await Interpreter.findById(id);
            if (!existingProfile) {
                return res.status(404).json({
                    success: false,
                    message: 'Interpreter profile not found'
                });
            }

            // Prepare update data
            const updateData = {
                ...req.body,
                updated_by: req.user?.id
            };

            const updatedProfile = await Interpreter.update(id, updateData);

            await loggerService.info('Interpreter profile updated successfully', {
                category: 'INTERPRETER',
                req,
                interpreterId: id,
                email: updatedProfile.email
            });

            res.json({
                success: true,
                message: 'Interpreter profile updated successfully',
                data: updatedProfile
            });

        } catch (error) {
            await loggerService.error('Failed to update interpreter profile', error, {
                category: 'INTERPRETER',
                req,
                interpreterId: req.params.id
            });

            res.status(500).json({
                success: false,
                message: 'Failed to update interpreter profile'
            });
        }
    }

    // Get all interpreter profiles with filters
    async getAllProfiles(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                status, 
                language, 
                service_type, 
                state, 
                search 
            } = req.query;
            
            const offset = (page - 1) * limit;
            const filters = {
                status,
                language,
                service_type,
                state,
                search
            };

            // Remove undefined filters
            Object.keys(filters).forEach(key => {
                if (!filters[key]) delete filters[key];
            });

            const result = await Interpreter.getAll(filters, parseInt(limit), offset);

            await loggerService.info('Interpreter profiles list retrieved', {
                category: 'INTERPRETER',
                req,
                count: result.interpreters.length,
                totalCount: result.totalCount,
                filters
            });

            res.json({
                success: true,
                data: result.interpreters,
                pagination: {
                    currentPage: parseInt(page),
                    totalCount: result.totalCount,
                    hasMore: result.hasMore,
                    perPage: parseInt(limit),
                    totalPages: Math.ceil(result.totalCount / limit)
                }
            });

        } catch (error) {
            await loggerService.error('Failed to retrieve interpreter profiles', error, {
                category: 'INTERPRETER',
                req
            });

            res.status(500).json({
                success: false,
                message: 'Failed to retrieve interpreter profiles'
            });
        }
    }

    // Update profile status (admin only)
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            const updatedProfile = await Interpreter.updateStatus(
                id, 
                status, 
                req.user?.userId, 
                notes
            );

            if (!updatedProfile) {
                return res.status(404).json({
                    success: false,
                    message: 'Interpreter profile not found'
                });
            }

            await loggerService.info('Interpreter profile status updated', {
                category: 'INTERPRETER',
                req,
                interpreterId: id,
                newStatus: status,
                updatedBy: req.user?.userId
            });

            res.json({
                success: true,
                message: 'Profile status updated successfully',
                data: updatedProfile
            });

        } catch (error) {
            await loggerService.error('Failed to update profile status', error, {
                category: 'INTERPRETER',
                req,
                interpreterId: req.params.id
            });

            res.status(500).json({
                success: false,
                message: 'Failed to update profile status'
            });
        }
    }
}

module.exports = new InterpreterController();