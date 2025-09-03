const db = require('../config/database');
const loggerService = require('../services/loggerService');

class CustomerController {
  /**
   * Get customer's claimants
   */
  async getMyClaimants(req, res) {
    try {
      const customerId = req.customer.id;

      const claimantsResult = await db.query(`
        SELECT DISTINCT
          c.id, c.first_name, c.last_name, c.name, c.phone, 
          c.date_of_birth, c.language, c.gender, c.address,
          c.employer_insured, c.created_at,
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
        'SELECT platform_rate_amount FROM service_types WHERE id = $1',
        [serviceTypeId]
      );

      const hourlyRate = serviceTypeResult.rows[0]?.platform_rate_amount || null;

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
}

module.exports = new CustomerController();
