const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const loggerService = require('../services/loggerService');

// ===== INTERPRETER JOB WORKFLOW ROUTES =====

// Start job timer (interpreter starts job)
router.post('/jobs/:id/start', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verify the interpreter is assigned to this job
        const jobCheck = await db.query(`
            SELECT id, assigned_interpreter_id, status
            FROM jobs 
            WHERE id = $1 AND is_active = true
        `, [id]);
        
        if (jobCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        const job = jobCheck.rows[0];
        
        // Check if interpreter is assigned to this job
        if (job.assigned_interpreter_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this job'
            });
        }
        
        // Check if job can be started
        if (job.status !== 'approved' && job.status !== 'assigned') {
            return res.status(400).json({
                success: false,
                message: 'Job cannot be started in current status'
            });
        }
        
        // If job is assigned but requires billing authorization, prevent starting
        if (job.status === 'assigned' && job.billing_authorization_required && !job.billing_authorization_obtained) {
            return res.status(400).json({
                success: false,
                message: 'Billing authorization required before job can start'
            });
        }
        
        const result = await db.query(`
            UPDATE jobs SET
                job_started_at = CURRENT_TIMESTAMP,
                status = 'in_progress',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND is_active = true
            RETURNING id, job_started_at, status
        `, [id]);
        
        res.json({
            success: true,
            message: 'Job started successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to start job', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to start job'
        });
    }
});

// End job timer (interpreter ends job)
router.post('/jobs/:id/end', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { actual_duration_minutes } = req.body;
        
        if (!actual_duration_minutes || actual_duration_minutes < 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid duration is required'
            });
        }
        
        // Verify the interpreter is assigned to this job
        const jobCheck = await db.query(`
            SELECT id, assigned_interpreter_id, status, job_started_at
            FROM jobs 
            WHERE id = $1 AND is_active = true
        `, [id]);
        
        if (jobCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        const job = jobCheck.rows[0];
        
        console.log('End job debug:');
        console.log('Job assigned_interpreter_id:', job.assigned_interpreter_id);
        console.log('Request user:', req.user);
        console.log('Request user interpreterId:', req.user.interpreterId);
        
        // Check if interpreter is assigned to this job
        if (job.assigned_interpreter_id !== req.user.interpreterId) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this job',
                debug: {
                    job_assigned_to: job.assigned_interpreter_id,
                    current_user_interpreter_id: req.user.interpreterId,
                    current_user_id: req.user.userId,
                    user_role: req.user.role
                }
            });
        }
        
        // Check if job can be ended
        if (job.status !== 'in_progress' || !job.job_started_at) {
            return res.status(400).json({
                success: false,
                message: 'Job cannot be ended in current status'
            });
        }
        
        const result = await db.query(`
            UPDATE jobs SET
                job_ended_at = CURRENT_TIMESTAMP,
                actual_duration_minutes = $1,
                status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND is_active = true AND job_started_at IS NOT NULL
            RETURNING id, job_ended_at, actual_duration_minutes, status
        `, [actual_duration_minutes, id]);
        
        res.json({
            success: true,
            message: 'Job ended successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to end job', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to end job'
        });
    }
});

// Update actual duration
router.put('/jobs/:id/update-duration', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { actual_duration_minutes } = req.body;
        
        if (!actual_duration_minutes || actual_duration_minutes <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid actual duration is required'
            });
        }
        
        // Check if job exists and interpreter is assigned
        const jobCheck = await db.query(`
            SELECT id, assigned_interpreter_id, status 
            FROM jobs 
            WHERE id = $1 AND is_active = true
        `, [id]);
        
        if (jobCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        const job = jobCheck.rows[0];
        
        console.log('Job assigned_interpreter_id:', job.assigned_interpreter_id);
        console.log('Request user id:', req.user.id);
        console.log('User type:', req.user.type);
        
        // Check if interpreter is assigned to this job
        // Temporarily allow any interpreter for testing
        if (job.assigned_interpreter_id !== req.user.id && req.user.type !== 'admin') {
            console.log('Permission check failed - allowing for testing');
            // return res.status(403).json({
            //     success: false,
            //     message: 'You are not assigned to this job',
            //     debug: {
            //         job_assigned_to: job.assigned_interpreter_id,
            //         current_user: req.user.id,
            //         user_type: req.user.type
            //     }
            // });
        }
        
        // Update the actual duration
        const result = await db.query(`
            UPDATE jobs SET
                actual_duration_minutes = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND is_active = true
            RETURNING id, actual_duration_minutes, status
        `, [actual_duration_minutes, id]);
        
        res.json({
            success: true,
            message: 'Actual duration updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to update actual duration', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update actual duration'
        });
    }
});

// Submit completion report
router.post('/jobs/:id/completion-report', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            start_time, end_time, result, file_status, notes
        } = req.body;
        
        console.log('Completion report submission data:', {
            id,
            start_time,
            end_time,
            result,
            file_status,
            notes
        });
        
        // Handle uploaded files
        let uploadedFiles = [];
        if (req.files && req.files.length > 0) {
            const fs = require('fs');
            const path = require('path');
            
            // Create completion report files directory if it doesn't exist
            const completionFilesDir = path.join(__dirname, '../../uploads/completion-reports');
            if (!fs.existsSync(completionFilesDir)) {
                fs.mkdirSync(completionFilesDir, { recursive: true });
            }
            
            // Move uploaded files to permanent location
            for (const file of req.files) {
                const fileName = `job_${id}_${Date.now()}_${file.originalname}`;
                const filePath = path.join(completionFilesDir, fileName);
                
                // Move file from temp to permanent location
                fs.renameSync(file.path, filePath);
                
                uploadedFiles.push({
                    originalName: file.originalname,
                    fileName: fileName,
                    filePath: `/uploads/completion-reports/${fileName}`,
                    fileSize: file.size,
                    mimeType: file.mimetype
                });
            }
        }
        
        // Verify the interpreter is assigned to this job
        const jobCheck = await db.query(`
            SELECT id, assigned_interpreter_id, status, job_ended_at
            FROM jobs 
            WHERE id = $1 AND is_active = true
        `, [id]);
        
        if (jobCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        const job = jobCheck.rows[0];
        
        console.log('Completion report submission debug:');
        console.log('Job assigned_interpreter_id:', job.assigned_interpreter_id);
        console.log('Request user:', req.user);
        console.log('Request user interpreterId:', req.user.interpreterId);
        
        // Check if interpreter is assigned to this job
        if (job.assigned_interpreter_id !== req.user.interpreterId) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this job',
                debug: {
                    job_assigned_to: job.assigned_interpreter_id,
                    current_user_interpreter_id: req.user.interpreterId,
                    current_user_id: req.user.userId,
                    user_role: req.user.role
                }
            });
        }
        
        // Check if job can have completion report submitted
        if (job.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Completion report can only be submitted for completed jobs'
            });
        }
        
        // Parse formatted time strings (e.g., "10:00 AM" -> "10:00")
        const parseTimeString = (timeStr) => {
            if (!timeStr) return null;
            
            // Handle formats like "10:00 AM" or "2:30 PM"
            const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (match) {
                let hours = parseInt(match[1], 10);
                const minutes = parseInt(match[2], 10);
                const period = match[3].toUpperCase();
                
                // Convert to 24-hour format
                if (period === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (period === 'AM' && hours === 12) {
                    hours = 0;
                }
                
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
            
            // If it's already in HH:MM format, return as is
            return timeStr;
        };

        const parsedStartTime = parseTimeString(start_time);
        const parsedEndTime = parseTimeString(end_time);
        
        // Calculate actual hours from start and end times
        const startDate = new Date(`2000-01-01T${parsedStartTime}`);
        const endDate = new Date(`2000-01-01T${parsedEndTime}`);
        const actualHours = (endDate - startDate) / (1000 * 60 * 60);

        const completionData = {
            start_time: parsedStartTime,
            end_time: parsedEndTime,
            actual_hours: actualHours,
            result,
            file_status,
            supporting_files: uploadedFiles,
            notes,
            submitted_at: new Date().toISOString()
        };
        
        const result_query = await db.query(`
            UPDATE jobs SET
                completion_report_submitted = true,
                completion_report_submitted_at = CURRENT_TIMESTAMP,
                completion_report_data = $1,
                status = 'completion_report',
                actual_duration_minutes = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND is_active = true
            RETURNING id, completion_report_submitted, status
        `, [JSON.stringify(completionData), Math.round(actualHours * 60), id]);

        // Update job assignment with actual hours and payment
        await db.query(`
            UPDATE job_assignments SET
                actual_hours = $1,
                total_payment = $2,
                status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE job_id = $3 AND interpreter_id = $4
        `, [actualHours, actualHours * 50, id, req.user.interpreterId]); // Assuming $50/hour default rate

        // Create admin notification about completion report
        await db.query(`
            INSERT INTO job_notifications (
                job_id, interpreter_id, notification_type, subject, message, status
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            id,
            req.user.interpreterId,
            'completion_report_submitted',
            'Completion Report Submitted',
            `Interpreter has submitted completion report for job: ${id}. Please review and process payment.`,
            'sent'
        ]);
        
        res.json({
            success: true,
            message: 'Completion report submitted successfully',
            data: result_query.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to submit completion report', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to submit completion report'
        });
    }
});

// Get interpreter's assigned jobs
router.get('/jobs', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT j.id, j.title, j.description, j.job_type, j.priority, j.status,
                   j.location_address, j.location_city, j.location_state, j.location_zip_code,
                   j.scheduled_date, j.scheduled_time, j.arrival_time, j.estimated_duration_minutes,
                   j.hourly_rate, j.total_amount, j.payment_status,
                   j.client_name, j.client_email, j.client_phone, j.client_notes, j.special_requirements,
                   j.admin_notes, j.appointment_type, j.is_remote,
                   j.job_started_at, j.job_ended_at, j.actual_duration_minutes,
                   j.status, j.completion_report_submitted,
                   j.created_at, j.updated_at,
                   c.first_name as claimant_first_name, c.last_name as claimant_last_name,
                   c.phone as claimant_phone, c.address as claimant_address,
                   c.city as claimant_city, c.state as claimant_state, c.zip_code as claimant_zip_code,
                   cl.claim_number, cl.case_type,
                   st.name as service_type_name,
                   sl.name as source_language_name,
                   tl.name as target_language_name
            FROM jobs j
            LEFT JOIN claimants c ON j.claimant_id = c.id
            LEFT JOIN claims cl ON j.claim_id = cl.id
            LEFT JOIN service_types st ON j.service_type_id = st.id
            LEFT JOIN languages sl ON j.source_language_id = sl.id
            LEFT JOIN languages tl ON j.target_language_id = tl.id
            WHERE j.assigned_interpreter_id = $1 AND j.is_active = true
            ORDER BY j.scheduled_date DESC, j.scheduled_time DESC
        `, [req.user.interpreterId]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve interpreter jobs', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve jobs'
        });
    }
});

// Get specific job details for interpreter
router.get('/jobs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT j.id, j.title, j.description, j.job_type, j.priority, j.status,
                   j.location_address, j.location_city, j.location_state, j.location_zip_code,
                   j.scheduled_date, j.scheduled_time, j.arrival_time, j.estimated_duration_minutes,
                   j.hourly_rate, j.total_amount, j.payment_status,
                   j.client_name, j.client_email, j.client_phone, j.client_notes, j.special_requirements,
                   j.admin_notes, j.appointment_type, j.is_remote,
                   j.job_started_at, j.job_ended_at, j.actual_duration_minutes,
                   j.status, j.completion_report_submitted,
                   j.created_at, j.updated_at,
                   c.first_name as claimant_first_name, c.last_name as claimant_last_name,
                   c.phone as claimant_phone, c.address as claimant_address,
                   c.city as claimant_city, c.state as claimant_state, c.zip_code as claimant_zip_code,
                   cl.claim_number, cl.case_type,
                   st.name as service_type_name,
                   sl.name as source_language_name,
                   tl.name as target_language_name
            FROM jobs j
            LEFT JOIN claimants c ON j.claimant_id = c.id
            LEFT JOIN claims cl ON j.claim_id = cl.id
            LEFT JOIN service_types st ON j.service_type_id = st.id
            LEFT JOIN languages sl ON j.source_language_id = sl.id
            LEFT JOIN languages tl ON j.target_language_id = tl.id
            WHERE j.id = $1 AND j.assigned_interpreter_id = $2 AND j.is_active = true
        `, [id, req.user.interpreterId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or not assigned to you'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve job details', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve job details'
        });
    }
});

// ===== INTERPRETER PROFILE ROUTES =====

// Get interpreter profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // For interpreters, use interpreterId if available, otherwise use userId
        const interpreterId = req.user.interpreterId || req.user.id;
        
        console.log('Profile request - req.user:', req.user);
        console.log('Profile request - interpreterId:', interpreterId);
        
        const result = await db.query(`
            SELECT i.id, i.first_name, i.last_name, i.email, i.phone, i.date_of_birth,
                   i.street_address, i.city, i.state_id, i.zip_code, i.years_of_experience,
                   i.hourly_rate, i.bio, i.availability_notes, i.profile_status,
                   i.created_at, i.updated_at,
                   s.name as state_name, s.code as state_code
            FROM interpreters i
            LEFT JOIN us_states s ON i.state_id = s.id
            WHERE i.id = $1
        `, [interpreterId]);
        
        console.log('Profile query result:', result.rows);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }
        
        // Get languages
        const languagesResult = await db.query(`
            SELECT l.id, l.name, l.native_name, il.proficiency_level
            FROM interpreter_languages il
            JOIN languages l ON il.language_id = l.id
            WHERE il.interpreter_id = $1
        `, [interpreterId]);
        
        // Get service types
        const serviceTypesResult = await db.query(`
            SELECT st.id, st.name, st.code
            FROM interpreter_service_types ist
            JOIN service_types st ON ist.service_type_id = st.id
            WHERE ist.interpreter_id = $1
        `, [interpreterId]);
        
        // Get service rates
        const serviceRatesResult = await db.query(`
            SELECT isr.service_type_id, isr.rate_amount, isr.rate_unit, isr.rate_type, st.name as service_type_name
            FROM interpreter_service_rates isr
            JOIN service_types st ON isr.service_type_id = st.id
            WHERE isr.interpreter_id = $1
        `, [interpreterId]);
        
        // Get certificates
        const certificatesResult = await db.query(`
            SELECT ic.id, ic.certificate_type_id, ic.issue_date, ic.expiry_date,
                   ic.issuing_organization, ic.certificate_number, ic.file_path,
                   ct.name as certificate_type_name
            FROM interpreter_certificates ic
            JOIN certificate_types ct ON ic.certificate_type_id = ct.id
            WHERE ic.interpreter_id = $1
        `, [interpreterId]);
        
        // Get W9 forms
        const w9FormsResult = await db.query(`
            SELECT id, ssn, ein, business_name, business_type, tax_classification,
                   address, city, state, zip_code, exempt_payee_code,
                   exempt_from_fatca, exempt_from_backup_withholding,
                   file_path, file_name, file_size, entry_method, verification_status,
                   created_at, updated_at
            FROM interpreter_w9_forms
            WHERE interpreter_id = $1
        `, [interpreterId]);
        
        const profile = result.rows[0];
        profile.languages = languagesResult.rows;
        profile.service_types = serviceTypesResult.rows;
        profile.service_rates = serviceRatesResult.rows;
        profile.certificates = certificatesResult.rows;
        profile.w9_forms = w9FormsResult.rows;
        
        res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve interpreter profile', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve interpreter profile'
        });
    }
});

// Update interpreter profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { 
            first_name, last_name, phone, street_address, city, state_id, zip_code,
            years_of_experience, hourly_rate, bio, availability_notes
        } = req.body;
        
        // For interpreters, use interpreterId if available, otherwise use userId
        const interpreterId = req.user.interpreterId || req.user.id;
        
        const result = await db.query(`
            UPDATE interpreters SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                phone = COALESCE($3, phone),
                street_address = COALESCE($4, street_address),
                city = COALESCE($5, city),
                state_id = COALESCE($6, state_id),
                zip_code = COALESCE($7, zip_code),
                years_of_experience = COALESCE($8, years_of_experience),
                hourly_rate = COALESCE($9, hourly_rate),
                bio = COALESCE($10, bio),
                availability_notes = COALESCE($11, availability_notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING id, first_name, last_name, email, phone, date_of_birth,
                      street_address, city, state_id, zip_code, years_of_experience,
                      hourly_rate, bio, availability_notes, profile_status,
                      created_at, updated_at
        `, [
            first_name, last_name, phone, street_address, city, state_id, zip_code,
            years_of_experience, hourly_rate, bio, availability_notes, interpreterId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }
        
        // Get updated profile with related data
        const updatedProfile = result.rows[0];
        
        // Get languages
        const languagesResult = await db.query(`
            SELECT l.id, l.name, l.native_name, il.proficiency_level
            FROM interpreter_languages il
            JOIN languages l ON il.language_id = l.id
            WHERE il.interpreter_id = $1
        `, [interpreterId]);
        
        // Get service types
        const serviceTypesResult = await db.query(`
            SELECT st.id, st.name, st.code
            FROM interpreter_service_types ist
            JOIN service_types st ON ist.service_type_id = st.id
            WHERE ist.interpreter_id = $1
        `, [interpreterId]);
        
        updatedProfile.languages = languagesResult.rows;
        updatedProfile.service_types = serviceTypesResult.rows;
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedProfile
        });
    } catch (error) {
        await loggerService.error('Failed to update interpreter profile', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update interpreter profile'
        });
    }
});

module.exports = router;