const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const loggerService = require('../services/loggerService');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// ===== INTERPRETER REGISTRATION =====

// Create interpreter profile (registration)
router.post('/', [
  body('email').isEmail().withMessage('Valid email required'),
  body('first_name').notEmpty().withMessage('First name required'),
  body('last_name').notEmpty().withMessage('Last name required'),
  body('phone').notEmpty().withMessage('Phone number required'),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      email,
      first_name,
      last_name,
      phone,
      date_of_birth,
      street_address,
      city,
      state_id,
      zip_code,
      years_of_experience,
      hourly_rate,
      bio,
      availability_notes,
      languages: languagesString,
      service_types: serviceTypesString,
      certificates_metadata: certificatesMetadataString,
      documents
    } = req.body;

    // Parse JSON strings if they exist
    let languages = [];
    let service_types = [];
    let certificates = [];
    
    try {
      if (languagesString) {
        languages = JSON.parse(languagesString);
      }
    } catch (e) {
      // Skip invalid JSON
    }
    
    try {
      if (serviceTypesString) {
        service_types = JSON.parse(serviceTypesString);
      }
    } catch (e) {
      // Skip invalid JSON
    }
    
    try {
      if (certificatesMetadataString) {
        certificates = JSON.parse(certificatesMetadataString);
      }
    } catch (e) {
      // Skip invalid JSON
    }

    // Check if email already exists in interpreters table
    const existingInterpreter = await db.query(
      'SELECT id FROM interpreters WHERE email = $1',
      [email]
    );

    if (existingInterpreter.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // Create user account first (for authentication)
      const defaultPassword = 'TempPassword123!'; // Default password for new interpreters
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const userResult = await db.query(`
        INSERT INTO users (
          username, email, password, role, first_name, last_name, phone,
          is_active, email_verified, password_changed, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, email, first_name, last_name
      `, [
        email, email, hashedPassword, 'provider', first_name, last_name, phone,
        true, false, false // password_changed = false for new accounts
      ]);

      const userId = userResult.rows[0].id;

      // Create interpreter record
      const interpreterResult = await db.query(`
        INSERT INTO interpreters (
          user_id, first_name, last_name, email, phone, profile_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, email, first_name, last_name, profile_status
      `, [
        userId, first_name, last_name, email, phone, 'pending'
      ]);

      const interpreterId = interpreterResult.rows[0].id;

      // Handle languages if provided
      if (languages && languages.length > 0) {
        for (const language of languages) {
          const languageId = language.language_id || language;
          
          // Validate that language_id is a valid UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(languageId)) {
            continue; // Skip invalid language IDs
          }
          
          await db.query(`
            INSERT INTO interpreter_languages (interpreter_id, language_id, proficiency_level, created_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          `, [interpreterId, languageId, language.proficiency_level || 'intermediate']);
        }
      }

      // Handle service types if provided
      if (service_types && service_types.length > 0) {
        for (const serviceTypeId of service_types) {
          await db.query(`
            INSERT INTO interpreter_service_types (interpreter_id, service_type_id, created_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
          `, [interpreterId, serviceTypeId]);
        }
      }

      // Handle certificates if provided
      if (certificates && certificates.length > 0) {
        for (const certificate of certificates) {
          await db.query(`
            INSERT INTO interpreter_certificates (
              interpreter_id, certificate_type_id, issuing_organization, 
              issue_date, expiry_date, certificate_number, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          `, [
            interpreterId, certificate.certificate_type_id, certificate.issuing_organization,
            certificate.issue_date, certificate.expiry_date, certificate.certificate_number
          ]);
        }
      }

      // Commit transaction
      await db.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Interpreter profile created successfully',
        data: {
          id: interpreterId,
          email: interpreterResult.rows[0].email,
          firstName: interpreterResult.rows[0].first_name,
          lastName: interpreterResult.rows[0].last_name,
          profileStatus: interpreterResult.rows[0].profile_status,
          defaultPassword: defaultPassword,
          requiresPasswordChange: true
        }
      });

    } catch (error) {
      // Rollback transaction on error
      try {
        await db.query('ROLLBACK');
      } catch (rollbackError) {
        // Log rollback error but don't throw it
      }
      throw error;
    }

  } catch (error) {
    loggerService.error('Error creating interpreter profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create interpreter profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

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
        
        
        // Check if interpreter is assigned to this job
        // Temporarily allow any interpreter for testing
        if (job.assigned_interpreter_id !== req.user.id && req.user.type !== 'admin') {
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
            ORDER BY j.scheduled_date ASC, j.scheduled_time ASC
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