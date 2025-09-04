const db = require('../config/database');
const loggerService = require('../services/loggerService');

class CustomerController {
  /**
   * Get customer's claimants (by claims relationship AND billing account)
   */
  async getMyClaimants(req, res) {
    try {
      const customerId = req.customer.id;

      const claimantsResult = await db.query(`
        SELECT DISTINCT
          c.id, c.first_name, c.last_name, c.name, c.phone, 
          c.date_of_birth, c.language, c.gender, c.address,
          c.employer_insured, c.created_at, c.billing_account_id,
          -- Address fields
          c.city, c.state, c.zip_code,
          -- Additional fields for autofill
          c.date_of_injury, c.employer, c.examiner
        FROM claimants c
        LEFT JOIN claims cl ON c.id = cl.claimant_id
        WHERE c.is_active = true
          AND (
            -- Customer is the contact/claims handler for any claim of this claimant
            cl.contact_claims_handler_id = $1
            OR 
            -- Customer is the adjuster's assistant for any claim of this claimant
            cl.adjusters_assistant_id = $1
            OR
            -- Customer's billing account matches claimant's billing account
            c.billing_account_id = (
              SELECT billing_account_id 
              FROM customers 
              WHERE id = $1
            )
          )
        ORDER BY c.first_name, c.last_name
      `, [customerId]);

      res.json({
        success: true,
        data: claimantsResult.rows
      });

    } catch (error) {
      await loggerService.error('Failed to get customer claimants', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get claimants'
      });
    }
  }

  /**
   * Get customer's claims
   */
  async getMyClaims(req, res) {
    try {
      const customerId = req.customer.id;
      const { claimantId } = req.query;

      let query = `
        SELECT 
          cl.id, cl.claim_number, cl.case_type, cl.date_of_injury, 
          cl.diagnosis, cl.created_at,
          c.first_name as claimant_first_name,
          c.last_name as claimant_last_name,
          c.name as claimant_name,
          c.language as claimant_language
        FROM claims cl
        JOIN claimants c ON cl.claimant_id = c.id
        WHERE cl.is_active = true
          AND (
            -- Customer is the contact/claims handler for this claim
            cl.contact_claims_handler_id = $1
            OR 
            -- Customer is the adjuster's assistant for this claim
            cl.adjusters_assistant_id = $1
          )
      `;

      let params = [customerId];
      
      if (claimantId) {
        query += ' AND cl.claimant_id = $2';
        params.push(claimantId);
      }

      query += ' ORDER BY cl.created_at DESC';

      const claimsResult = await db.query(query, params);

      res.json({
        success: true,
        data: claimsResult.rows
      });

    } catch (error) {
      await loggerService.error('Failed to get customer claims', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get claims'
      });
    }
  }

  /**
   * Get customer's appointments (jobs)
   */
  async getMyAppointments(req, res) {
    try {
      const customerId = req.customer.id;
      const { status, limit = 20, offset = 0 } = req.query;

      let query = `
        SELECT 
          j.id, j.title, j.description, j.scheduled_date, j.scheduled_time,
          j.arrival_time, j.estimated_duration_minutes, j.actual_duration_minutes,
          j.appointment_type, j.status, j.workflow_status, j.location_address,
          j.location_city, j.location_state, j.is_remote, j.hourly_rate,
          j.created_at, j.completed_at,
          
          -- Claimant information
          c.first_name as claimant_first_name,
          c.last_name as claimant_last_name,
          c.name as claimant_name,
          c.language as claimant_language,
          
          -- Claim information
          cl.claim_number,
          cl.case_type,
          
          -- Service information
          st.name as service_type_name,
          l.name as language_name,
          it.name as interpreter_type_name,
          
          -- Interpreter information (if assigned)
          i.first_name as interpreter_first_name,
          i.last_name as interpreter_last_name,
          i.phone as interpreter_phone,
          i.email as interpreter_email,
          
          -- Job assignment information
          ja.status as assignment_status,
          ja.agreed_rate,
          ja.actual_hours,
          ja.total_payment,
          ja.accepted_at,
          ja.declined_at
          
        FROM jobs j
        LEFT JOIN claimants c ON j.claimant_id = c.id
        LEFT JOIN claims cl ON j.claim_id = cl.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN languages l ON j.source_language_id = l.id
        LEFT JOIN interpreter_types it ON j.interpreter_type_id = it.id
        LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
        LEFT JOIN job_assignments ja ON j.id = ja.job_id AND j.assigned_interpreter_id = ja.interpreter_id
        WHERE j.requested_by_id = $1
      `;

      let params = [customerId];
      let paramCount = 1;

      if (status && status !== 'all') {
        paramCount++;
        query += ` AND j.status = $${paramCount}`;
        params.push(status);
      }

      query += ` ORDER BY j.scheduled_date DESC, j.scheduled_time DESC`;
      
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));

      const appointmentsResult = await db.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM jobs j
        WHERE j.requested_by_id = $1
      `;
      let countParams = [customerId];

      if (status && status !== 'all') {
        countQuery += ' AND j.status = $2';
        countParams.push(status);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: {
          appointments: appointmentsResult.rows,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            total_pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      await loggerService.error('Failed to get customer appointments', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get appointments'
      });
    }
  }

  /**
   * Get a specific appointment details
   */
  async getAppointmentDetails(req, res) {
    try {
      const customerId = req.customer.id;
      const { appointmentId } = req.params;

      const appointmentResult = await db.query(`
        SELECT 
          j.*,
          
          -- Claimant information
          c.first_name as claimant_first_name,
          c.last_name as claimant_last_name,
          c.name as claimant_name,
          c.phone as claimant_phone,
          c.language as claimant_language,
          c.address as claimant_address,
          
          -- Claim information
          cl.claim_number,
          cl.case_type,
          cl.date_of_injury,
          cl.diagnosis,
          
          -- Service information
          st.name as service_type_name,
          st.description as service_type_description,
          l.name as language_name,
          it.name as interpreter_type_name,
          
          -- Interpreter information (if assigned)
          i.first_name as interpreter_first_name,
          i.last_name as interpreter_last_name,
          i.phone as interpreter_phone,
          i.email as interpreter_email,
          i.bio as interpreter_bio,
          
          -- Job assignment information
          ja.status as assignment_status,
          ja.agreed_rate,
          ja.actual_hours,
          ja.total_payment,
          ja.accepted_at,
          ja.declined_at,
          ja.declined_reason,
          
          -- Billing account
          ba.name as billing_account_name
          
        FROM jobs j
        LEFT JOIN claimants c ON j.claimant_id = c.id
        LEFT JOIN claims cl ON j.claim_id = cl.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN languages l ON j.source_language_id = l.id
        LEFT JOIN interpreter_types it ON j.interpreter_type_id = it.id
        LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
        LEFT JOIN job_assignments ja ON j.id = ja.job_id AND j.assigned_interpreter_id = ja.interpreter_id
        LEFT JOIN billing_accounts ba ON j.billing_account_id = ba.id
        WHERE j.id = $1 AND j.requested_by_id = $2
      `, [appointmentId, customerId]);

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      res.json({
        success: true,
        data: appointmentResult.rows[0]
      });

    } catch (error) {
      await loggerService.error('Failed to get appointment details', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id,
        appointmentId: req.params.appointmentId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get appointment details'
      });
    }
  }

  /**
   * Create a new job request
   */
  async createJobRequest(req, res) {
    try {
      const customerId = req.customer.id;
      const {
        title,
        description,
        appointmentType,
        scheduledDate,
        scheduledTime,
        arrivalTime,
        estimatedDurationMinutes,
        claimantId,
        claimId,
        serviceTypeId,
        sourceLanguageId,
        interpreterTypeId,
        locationAddress,
        locationCity,
        locationState,
        locationZipCode,
        isRemote,
        specialRequirements,
        billingAccountId
      } = req.body;

      // Validate required fields
      if (!title || !scheduledDate || !scheduledTime || !claimantId || !serviceTypeId) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: title, scheduledDate, scheduledTime, claimantId, serviceTypeId'
        });
      }

      // Verify claimant exists
      const claimantResult = await db.query(
        'SELECT id FROM claimants WHERE id = $1 AND is_active = true',
        [claimantId]
      );

      if (claimantResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid claimant ID'
        });
      }

      // Get service type rate information
      const serviceTypeResult = await db.query(
        'SELECT str.rate_amount FROM service_types st LEFT JOIN service_type_rates str ON st.id = str.service_type_id WHERE st.id = $1',
        [serviceTypeId]
      );

      const hourlyRate = serviceTypeResult.rows[0]?.rate_amount || null;

      // Create the job
      const jobResult = await db.query(`
        INSERT INTO jobs (
          title, description, job_type, priority, status,
          scheduled_date, scheduled_time, arrival_time, estimated_duration_minutes,
          appointment_type, claimant_id, claim_id, requested_by_id,
          service_type_id, source_language_id, interpreter_type_id,
          location_address, location_city, location_state, location_zip_code,
          is_remote, hourly_rate, billing_account_id, special_requirements,
          created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, CURRENT_TIMESTAMP
        ) RETURNING id, created_at
      `, [
        title,
        description || `${appointmentType} appointment`,
        'medical', // Default job type
        'normal', // Default priority
        'open', // Initial status
        scheduledDate,
        scheduledTime,
        arrivalTime,
        estimatedDurationMinutes,
        appointmentType,
        claimantId,
        claimId,
        customerId,
        serviceTypeId,
        sourceLanguageId,
        interpreterTypeId,
        locationAddress,
        locationCity,
        locationState,
        locationZipCode,
        isRemote || false,
        hourlyRate,
        billingAccountId,
        specialRequirements,
        null // created_by (system user ID would go here)
      ]);

      const jobId = jobResult.rows[0].id;

      await loggerService.info('Customer created job request', {
        category: 'CUSTOMER_JOB',
        customerId: customerId,
        jobId: jobId
      });

      res.status(201).json({
        success: true,
        message: 'Job request created successfully',
        data: {
          jobId: jobId,
          createdAt: jobResult.rows[0].created_at
        }
      });

    } catch (error) {
      await loggerService.error('Failed to create job request', error, {
        category: 'CUSTOMER_JOB',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create job request'
      });
    }
  }

  /**
   * Create a simple appointment request (frontend format)
   */
  async createSimpleAppointment(req, res) {
    try {
      
      const customerId = req.customer.id;
      const {
        appointmentDate,
        startTime,
        endTime,
        arrivalTime,
        appointmentType,
        appointmentNotes,
        doctorName,
        isRemote,
        locationAddress,
        locationCity,
        locationState,
        locationZipCode,
        phone,
        claimantId,
        claimId,
        serviceTypeId,
        language,
        interpreterType,
        specialRequirements
      } = req.body;

      // Validate required fields
      if (!appointmentDate || !startTime || !endTime || !appointmentType || 
          !claimantId || !claimId || !interpreterType) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: appointmentDate, startTime, endTime, appointmentType, claimantId, claimId, interpreterType'
        });
      }

      // Verify claimant exists and customer has access
      const claimantResult = await db.query(`
        SELECT c.id FROM claimants c
        LEFT JOIN claims cl ON c.id = cl.claimant_id
        WHERE c.id = $1 AND c.is_active = true
          AND (
            cl.contact_claims_handler_id = $2
            OR cl.adjusters_assistant_id = $2
            OR c.billing_account_id = (
              SELECT billing_account_id 
              FROM customers 
              WHERE id = $2
            )
          )
      `, [claimantId, customerId]);

      if (claimantResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid claimant ID or access denied'
        });
      }

      // Get service type rate information (if serviceTypeId is provided)
      let hourlyRate = null;
      if (serviceTypeId) {
        const serviceTypeResult = await db.query(
          'SELECT str.rate_amount FROM service_types st LEFT JOIN service_type_rates str ON st.id = str.service_type_id WHERE st.id = $1',
          [serviceTypeId]
        );
        hourlyRate = serviceTypeResult.rows[0]?.rate_amount || null;
      }

      // Get language ID (if language is provided)
      let sourceLanguageId = null;
      if (language) {
        // If it's already a UUID format, use it directly
        if (typeof language === 'string' && language.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          sourceLanguageId = language;
        } else {
          // Otherwise, look it up by name (for backward compatibility)
          const languageResult = await db.query(
            'SELECT id FROM languages WHERE name = $1',
            [language]
          );
          sourceLanguageId = languageResult.rows[0]?.id || null;
        }
      }

      // Convert interpreterType to UUID if it's a string
      let interpreterTypeId = null;
      if (interpreterType) {
        // If it's already a UUID format, use it directly
        if (typeof interpreterType === 'string' && interpreterType.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          interpreterTypeId = interpreterType;
        } else {
          // Otherwise, look it up by ID
          interpreterTypeId = interpreterType;
        }
      }

      // Get customer's billing account
      const customerResult = await db.query(
        'SELECT billing_account_id FROM customers WHERE id = $1',
        [customerId]
      );
      const billingAccountId = customerResult.rows[0]?.billing_account_id;

      // Create a job record for the appointment
      const title = `${appointmentType}${doctorName ? ` - ${doctorName}` : ''}`;
      let description = `${appointmentType} appointment`;
      if (doctorName) description += ` with ${doctorName}`;
      
      // Add appointment notes to description if provided
      if (appointmentNotes && appointmentNotes.trim()) {
        description += ` - ${appointmentNotes.trim()}`;
      }
      
      // Combine date and time for scheduled_date
      const scheduledDateTime = new Date(`${appointmentDate}T${startTime}`);
      
      // Calculate duration in minutes
      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      const durationMinutes = endMinutes - startMinutes;



      const jobResult = await db.query(`
        INSERT INTO jobs (
          title, description, job_type, priority, status,
          scheduled_date, scheduled_time, arrival_time, estimated_duration_minutes,
          appointment_type, claimant_id, claim_id, requested_by_id,
          service_type_id, source_language_id, interpreter_type_id,
          location_address, location_city, location_state, location_zip_code,
          is_remote, hourly_rate, billing_account_id, special_requirements, created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, CURRENT_TIMESTAMP
        ) RETURNING id, created_at
      `, [
        title,
        description,
        'medical', // Default job type
        'normal', // Default priority
        'pending_authorization', // Status for admin approval
        scheduledDateTime,
        startTime,
        arrivalTime || null,
        durationMinutes,
        appointmentType,
        claimantId,
        claimId,
        customerId,
        serviceTypeId,
        sourceLanguageId,
        interpreterTypeId,
        locationAddress || null,
        locationCity || null,
        locationState || null,
        locationZipCode || null,
        isRemote || false,
        hourlyRate,
        billingAccountId,
        specialRequirements || null,
        null // created_by should be null for customer requests
      ]);



      const jobId = jobResult.rows[0].id;

      // Send email notification to admins
      try {
        const emailService = require('../services/emailService');
        const emailServiceInstance = new emailService();
        
        // Get admin emails
        const adminResult = await db.query(
          'SELECT email, first_name, last_name FROM users WHERE role = $1 AND is_active = true',
          ['admin']
        );

        if (adminResult.rows.length > 0) {
          const adminPortalUrl = process.env.ADMIN_PORTAL_URL || 'http://localhost:3000';
          const jobUrl = `${adminPortalUrl}/jobs/${jobId}`;
          
          for (const admin of adminResult.rows) {
            await emailServiceInstance.queueEmail(
              'new_job_request',
              admin.email,
              `${admin.first_name} ${admin.last_name}`,
              {
                jobId: jobId,
                jobTitle: title,
                appointmentDate: appointmentDate,
                appointmentTime: startTime,
                appointmentType: appointmentType,
                claimantId: claimantId,
                claimId: claimId,
                jobUrl: jobUrl,
                customerId: customerId
              },
              'high'
            );
          }
        }
      } catch (emailError) {
        // Log email error but don't fail the appointment creation
        await loggerService.error('Failed to send admin notification email', emailError, {
          category: 'CUSTOMER_JOB',
          customerId: customerId,
          jobId: jobId
        });
      }

      await loggerService.info('Customer created appointment request', {
        category: 'CUSTOMER_JOB',
        customerId: customerId,
        jobId: jobId,
        status: 'pending_authorization'
      });

      res.status(201).json({
        success: true,
        message: 'Appointment request submitted successfully. It will be reviewed by our team.',
        data: {
          id: jobResult.rows[0].id,
          createdAt: jobResult.rows[0].created_at,
          status: 'pending_authorization'
        }
      });

    } catch (error) {
      console.log('=== CREATE SIMPLE APPOINTMENT ERROR ===');
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('Error details:', error);
      
      await loggerService.error('Failed to create simple appointment', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create appointment',
        error: error.message
      });
    }
  }

  /**
   * Create a new claimant for customer's billing account
   */
  async createClaimant(req, res) {
    try {
      const customerId = req.customer.id;
      const { 
        first_name, last_name, gender, date_of_birth, phone, language, 
        billing_account_id, address, address_latitude, address_longitude, employer_insured
      } = req.body;

      // Validate required fields
      if (!first_name || !last_name) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required'
        });
      }

      // Use provided billing account or get customer's billing account
      let billingAccountId = billing_account_id;
      
      if (!billingAccountId) {
        const customerResult = await db.query(
          'SELECT billing_account_id FROM customers WHERE id = $1',
          [customerId]
        );

        if (customerResult.rows.length === 0 || !customerResult.rows[0].billing_account_id) {
          return res.status(400).json({
            success: false,
            message: 'Customer must have a billing account to create claimants'
          });
        }

        billingAccountId = customerResult.rows[0].billing_account_id;
      }

      // Combine first and last name for the name field
      const name = `${first_name} ${last_name}`.trim();

      // Convert empty strings to null for optional fields
      const cleanAddressLatitude = address_latitude === '' ? null : address_latitude;
      const cleanAddressLongitude = address_longitude === '' ? null : address_longitude;
      const cleanDateOfBirth = date_of_birth === '' ? null : date_of_birth;
      const cleanGender = gender === '' ? null : gender;
      const cleanPhone = phone === '' ? null : phone;
      const cleanLanguage = language === '' ? null : language;
      const cleanAddress = address === '' ? null : address;
      const cleanEmployerInsured = employer_insured === '' ? null : employer_insured;
      const cleanCity = city === '' ? null : city;
      const cleanState = state === '' ? null : state;
      const cleanZipCode = zip_code === '' ? null : zip_code;
      const cleanDateOfInjury = date_of_injury === '' ? null : date_of_injury;
      const cleanEmployer = employer === '' ? null : employer;
      const cleanExaminer = examiner === '' ? null : examiner;

      const result = await db.query(`
        INSERT INTO claimants (
          first_name, last_name, name, gender, date_of_birth, phone, language, 
          billing_account_id, address, address_latitude, address_longitude, 
          employer_insured, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, first_name, last_name, name, gender, date_of_birth, phone, language, 
                  billing_account_id, address, address_latitude, address_longitude, 
                  employer_insured, is_active, created_at, updated_at
      `, [
        first_name, last_name, name, cleanGender, cleanDateOfBirth, cleanPhone, 
        cleanLanguage, billingAccountId, cleanAddress, cleanAddressLatitude, 
        cleanAddressLongitude, cleanEmployerInsured, customerId
      ]);

      res.status(201).json({
        success: true,
        message: 'Claimant created successfully',
        data: result.rows[0]
      });

    } catch (error) {
      await loggerService.error('Failed to create claimant', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create claimant'
      });
    }
  }

  /**
   * Create a new claim for customer's claimant
   */
  async createClaim(req, res) {
    try {
      const customerId = req.customer.id;
      const { 
        claimant_id, case_type, claim_number, date_of_injury, diagnosis,
        contact_claims_handler_id, adjusters_assistant_id
      } = req.body;

      // Validate required fields
      if (!claimant_id || !case_type || !claim_number) {
        return res.status(400).json({
          success: false,
          message: 'Claimant ID, case type, and claim number are required'
        });
      }

      // Check if customer has access to this claimant
      const claimantAccessCheck = await db.query(`
        SELECT c.id FROM claimants c
        LEFT JOIN claims cl ON c.id = cl.claimant_id
        WHERE c.id = $1 AND c.is_active = true
          AND (
            cl.contact_claims_handler_id = $2
            OR cl.adjusters_assistant_id = $2
            OR c.billing_account_id = (
              SELECT billing_account_id 
              FROM customers 
              WHERE id = $2
            )
          )
      `, [claimant_id, customerId]);

      if (claimantAccessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this claimant'
        });
      }

      // Convert empty strings to null for optional fields
      const cleanDateOfInjury = date_of_injury === '' ? null : date_of_injury;
      const cleanDiagnosis = diagnosis === '' ? null : diagnosis;

      const result = await db.query(`
        INSERT INTO claims (
          claimant_id, case_type, claim_number, date_of_injury, diagnosis, 
          contact_claims_handler_id, adjusters_assistant_id, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, claimant_id, case_type, claim_number, date_of_injury, 
                  diagnosis, contact_claims_handler_id, adjusters_assistant_id, is_active, created_at, updated_at
      `, [
        claimant_id, case_type, claim_number, cleanDateOfInjury, cleanDiagnosis, 
        contact_claims_handler_id || customerId, adjusters_assistant_id, customerId
      ]);

      res.status(201).json({
        success: true,
        message: 'Claim created successfully',
        data: result.rows[0]
      });

    } catch (error) {
      await loggerService.error('Failed to create claim', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create claim'
      });
    }
  }

  /**
   * Update a claimant (only if customer has access)
   */
  async updateClaimant(req, res) {
    try {
      
      const customerId = req.customer.id;
      const { id } = req.params;
      const { 
        first_name, last_name, gender, date_of_birth, phone, language, 
        address, address_latitude, address_longitude, employer_insured,
        city, state, zip_code, date_of_injury, employer, examiner, is_active 
      } = req.body;

      // Validate required fields
      if (!first_name || !last_name) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required'
        });
      }

      // Check if customer has access to this claimant
      const accessCheck = await db.query(`
        SELECT c.id FROM claimants c
        LEFT JOIN claims cl ON c.id = cl.claimant_id
        WHERE c.id = $1 AND c.is_active = true
          AND (
            cl.contact_claims_handler_id = $2
            OR cl.adjusters_assistant_id = $2
            OR c.billing_account_id = (
              SELECT billing_account_id 
              FROM customers 
              WHERE id = $2
            )
          )
      `, [id, customerId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this claimant'
        });
      }

      // Combine first and last name for the name field
      const name = `${first_name} ${last_name}`.trim();

      // Convert empty strings to null for optional fields
      const cleanAddressLatitude = address_latitude === '' ? null : address_latitude;
      const cleanAddressLongitude = address_longitude === '' ? null : address_longitude;
      const cleanDateOfBirth = date_of_birth === '' ? null : date_of_birth;
      const cleanGender = gender === '' ? null : gender;
      const cleanPhone = phone === '' ? null : phone;
      const cleanLanguage = language === '' ? null : language;
      const cleanAddress = address === '' ? null : address;
      const cleanEmployerInsured = employer_insured === '' ? null : employer_insured;
      const cleanCity = city === '' ? null : city;
      const cleanState = state === '' ? null : state;
      const cleanZipCode = zip_code === '' ? null : zip_code;
      const cleanDateOfInjury = date_of_injury === '' ? null : date_of_injury;
      const cleanEmployer = employer === '' ? null : employer;
      const cleanExaminer = examiner === '' ? null : examiner;


      const result = await db.query(`
        UPDATE claimants SET
          first_name = $1,
          last_name = $2,
          name = $3,
          gender = $4,
          date_of_birth = $5,
          phone = $6,
          language = $7,
          address = $8,
          address_latitude = $9,
          address_longitude = $10,
          employer_insured = $11,
          city = $12,
          state = $13,
          zip_code = $14,
          date_of_injury = $15,
          employer = $16,
          examiner = $17,
          is_active = $18,
          last_updated_by = $19,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $20
        RETURNING id, first_name, last_name, name, gender, date_of_birth, phone, language, 
                  billing_account_id, address, address_latitude, address_longitude, 
                  employer_insured, city, state, zip_code, date_of_injury, employer, examiner, 
                  is_active, created_at, updated_at
      `, [
        first_name, last_name, name, cleanGender, cleanDateOfBirth, cleanPhone, 
        cleanLanguage, cleanAddress, cleanAddressLatitude, cleanAddressLongitude, 
        cleanEmployerInsured, cleanCity, cleanState, cleanZipCode, cleanDateOfInjury, 
        cleanEmployer, cleanExaminer, is_active, null, id
      ]);


      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Claimant not found'
        });
      }

      res.json({
        success: true,
        message: 'Claimant updated successfully',
        data: result.rows[0]
      });

    } catch (error) {
      
      await loggerService.error('Failed to update claimant', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update claimant',
      });
    }
  }

  /**
   * Delete a claimant (soft delete, only if customer has access)
   */
  async deleteClaimant(req, res) {
    try {
      const customerId = req.customer.id;
      const { id } = req.params;

      // Check if customer has access to this claimant
      const accessCheck = await db.query(`
        SELECT c.id FROM claimants c
        LEFT JOIN claims cl ON c.id = cl.claimant_id
        WHERE c.id = $1 AND c.is_active = true
          AND (
            cl.contact_claims_handler_id = $2
            OR cl.adjusters_assistant_id = $2
            OR c.billing_account_id = (
              SELECT billing_account_id 
              FROM customers 
              WHERE id = $2
            )
          )
      `, [id, customerId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this claimant'
        });
      }

      // Soft delete the claimant
      const result = await db.query(`
        UPDATE claimants SET
          is_active = false,
          last_updated_by = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, is_active
      `, [customerId, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Claimant not found'
        });
      }

      res.json({
        success: true,
        message: 'Claimant deleted successfully'
      });

    } catch (error) {
      await loggerService.error('Failed to delete claimant', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete claimant'
      });
    }
  }

  /**
   * Get interpreter types for customer portal
   */
  async getInterpreterTypes(req, res) {
    try {
      const result = await db.query(`
        SELECT id, code, name, description, sort_order 
        FROM interpreter_types 
        WHERE is_active = true 
        ORDER BY sort_order ASC, name ASC
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      await loggerService.error('Failed to get interpreter types', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve interpreter types'
      });
    }
  }

  /**
   * Get languages for customer portal
   */
  async getLanguages(req, res) {
    try {
      const result = await db.query(`
        SELECT id, code, name, native_name, sort_order 
        FROM languages 
        WHERE is_active = true 
        ORDER BY sort_order ASC, name ASC
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      await loggerService.error('Failed to get languages', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve languages'
      });
    }
  }

  /**
   * Get claims for a specific claimant (customer portal)
   */
  async getClaimsForClaimant(req, res) {
    try {
      const { claimantId } = req.params;
      const customerId = req.customer.id;

      // Verify customer has access to this claimant
      const accessCheck = await db.query(`
        SELECT c.id FROM claimants c
        LEFT JOIN claims cl ON c.id = cl.claimant_id
        WHERE c.id = $1 AND c.is_active = true
          AND (
            cl.contact_claims_handler_id = $2
            OR cl.adjusters_assistant_id = $2
            OR c.billing_account_id = (
              SELECT billing_account_id 
              FROM customers 
              WHERE id = $2
            )
          )
      `, [claimantId, customerId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this claimant'
        });
      }

      const result = await db.query(`
        SELECT c.id, c.case_type, c.claim_number, c.date_of_injury, c.diagnosis, 
               c.contact_claims_handler_id, c.adjusters_assistant_id,
               c.is_active, c.created_at, c.updated_at,
               ch.name as contact_claims_handler_name,
               aa.name as adjusters_assistant_name
        FROM claims c
        LEFT JOIN customers ch ON c.contact_claims_handler_id = ch.id
        LEFT JOIN customers aa ON c.adjusters_assistant_id = aa.id
        WHERE c.claimant_id = $1 AND c.is_active = true
        ORDER BY c.created_at DESC
      `, [claimantId]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      await loggerService.error('Failed to get claims for claimant', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve claims'
      });
    }
  }

  /**
   * Get billing accounts for customer portal
   */
  async getMyBillingAccounts(req, res) {
    try {
      const customerId = req.customer.id;

      // First check if customer exists and has a billing account
      const customerCheck = await db.query(`
        SELECT c.id, c.billing_account_id, c.name
        FROM customers c
        WHERE c.id = $1 AND c.is_active = true
      `, [customerId]);

      if (customerCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const customer = customerCheck.rows[0];
      
      if (!customer.billing_account_id) {
        return res.status(400).json({
          success: false,
          message: 'Customer does not have a billing account assigned'
        });
      }

      // Get customer's billing account
      const result = await db.query(`
        SELECT ba.id, ba.name, ba.phone, ba.email, ba.is_active
        FROM billing_accounts ba
        WHERE ba.id = $1 AND ba.is_active = true
      `, [customer.billing_account_id]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      await loggerService.error('Failed to get billing accounts', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve billing accounts'
      });
    }
  }

  /**
   * Get customers for customer portal (for claims handler/assistant selection)
   */
  async getMyCustomers(req, res) {
    try {
      const customerId = req.customer.id;

      // Get customers from the same billing account
      const result = await db.query(`
        SELECT c.id, c.name, c.email
        FROM customers c
        INNER JOIN customers current_customer ON current_customer.billing_account_id = c.billing_account_id
        WHERE current_customer.id = $1 AND c.is_active = true
        ORDER BY c.name
      `, [customerId]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      await loggerService.error('Failed to get customers', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve customers'
      });
    }
  }

  /**
   * Update a claim
   */
  async updateClaim(req, res) {
    try {
      const { id } = req.params;
      const customerId = req.customer.id;
      const { case_type, claim_number, date_of_injury, diagnosis, contact_claims_handler_id, adjusters_assistant_id } = req.body;

      // Verify customer has access to this claim
      const accessCheck = await db.query(`
        SELECT c.id FROM claims c
        INNER JOIN claimants cl ON c.claimant_id = cl.id
        WHERE c.id = $1 AND c.is_active = true
          AND (
            c.contact_claims_handler_id = $2
            OR c.adjusters_assistant_id = $2
            OR cl.billing_account_id = (
              SELECT billing_account_id 
              FROM customers 
              WHERE id = $2
            )
          )
      `, [id, customerId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this claim'
        });
      }

      const result = await db.query(`
        UPDATE claims SET
          case_type = $1,
          claim_number = $2,
          date_of_injury = $3,
          diagnosis = $4,
          contact_claims_handler_id = $5,
          adjusters_assistant_id = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id, case_type, claim_number
      `, [case_type, claim_number, date_of_injury, diagnosis, contact_claims_handler_id, adjusters_assistant_id, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Claim not found'
        });
      }

      res.json({
        success: true,
        message: 'Claim updated successfully'
      });

    } catch (error) {
      await loggerService.error('Failed to update claim', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update claim'
      });
    }
  }

  /**
   * Delete a claim
   */
  async deleteClaim(req, res) {
    try {
      const { id } = req.params;
      const customerId = req.customer.id;

      // Verify customer has access to this claim
      const accessCheck = await db.query(`
        SELECT c.id FROM claims c
        INNER JOIN claimants cl ON c.claimant_id = cl.id
        WHERE c.id = $1 AND c.is_active = true
          AND (
            c.contact_claims_handler_id = $2
            OR c.adjusters_assistant_id = $2
            OR cl.billing_account_id = (
              SELECT billing_account_id 
              FROM customers 
              WHERE id = $2
            )
          )
      `, [id, customerId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this claim'
        });
      }

      // Soft delete the claim
      const result = await db.query(`
        UPDATE claims SET
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, is_active
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Claim not found'
        });
      }

      res.json({
        success: true,
        message: 'Claim deleted successfully'
      });

    } catch (error) {
      await loggerService.error('Failed to delete claim', error, {
        category: 'CUSTOMER',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete claim'
      });
    }
  }
}

module.exports = new CustomerController();
