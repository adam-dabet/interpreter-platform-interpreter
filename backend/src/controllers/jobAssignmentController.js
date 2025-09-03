const db = require('../config/database');
const { validationResult } = require('express-validator');

class JobAssignmentController {
  // Interpreter accepts a job
  async acceptJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { jobId } = req.params;
      const interpreterId = req.user.interpreterId;
      const { agreed_rate } = req.body;

      // Check if job exists and is open
      const jobCheck = await db.query('SELECT * FROM jobs WHERE id = $1 AND status = $2', [jobId, 'open']);
      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Job not found or not available' });
      }

      // Check if interpreter already has an assignment for this job
      const existingAssignment = await db.query(
        'SELECT * FROM job_assignments WHERE job_id = $1 AND interpreter_id = $2',
        [jobId, interpreterId]
      );

      if (existingAssignment.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'You have already responded to this job' });
      }

      // Check if interpreter has the required languages and service types
      const job = jobCheck.rows[0];
      const interpreterLanguages = await db.query(
        'SELECT language_id FROM interpreter_languages WHERE interpreter_id = $1',
        [interpreterId]
      );
      
      const interpreterServiceTypes = await db.query(
        'SELECT service_type_id FROM interpreter_service_types WHERE interpreter_id = $1',
        [interpreterId]
      );

      const hasRequiredLanguage = interpreterLanguages.rows.some(
        lang => lang.language_id === job.source_language_id || lang.language_id === job.target_language_id
      );
      
      const hasRequiredServiceType = interpreterServiceTypes.rows.some(
        service => service.service_type_id === job.service_type_id
      );

      if (!hasRequiredLanguage) {
        return res.status(400).json({ 
          success: false, 
          message: 'You do not have the required language skills for this job' 
        });
      }

      if (!hasRequiredServiceType) {
        return res.status(400).json({ 
          success: false, 
          message: 'You do not have the required service type certification for this job' 
        });
      }

      // Create assignment
      const assignmentQuery = `
        INSERT INTO job_assignments (
          job_id, interpreter_id, status, agreed_rate, accepted_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const assignmentResult = await db.query(assignmentQuery, [
        jobId, 
        interpreterId, 
        'accepted', 
        agreed_rate || job.hourly_rate
      ]);

      // Update job status to assigned
      await db.query(
        'UPDATE jobs SET status = $1, assigned_interpreter_id = $2, assigned_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['assigned', interpreterId, jobId]
      );

      // Create notification for admin
      await db.query(`
        INSERT INTO job_notifications (
          job_id, interpreter_id, notification_type, subject, message, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        jobId,
        interpreterId,
        'job_accepted',
        'Job Accepted',
        `Interpreter has accepted job: ${job.title}`,
        'sent'
      ]);

      res.json({
        success: true,
        message: 'Job accepted successfully',
        data: assignmentResult.rows[0]
      });
    } catch (error) {
      console.error('Error accepting job:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Interpreter declines a job
  async declineJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { jobId } = req.params;
      const interpreterId = req.user.interpreterId;
      const { declined_reason } = req.body;

      // Check if job exists and is open
      const jobCheck = await db.query('SELECT * FROM jobs WHERE id = $1 AND status = $2', [jobId, 'open']);
      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Job not found or not available' });
      }

      // Check if interpreter already has an assignment for this job
      const existingAssignment = await db.query(
        'SELECT * FROM job_assignments WHERE job_id = $1 AND interpreter_id = $2',
        [jobId, interpreterId]
      );

      if (existingAssignment.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'You have already responded to this job' });
      }

      // Create assignment with declined status
      const assignmentQuery = `
        INSERT INTO job_assignments (
          job_id, interpreter_id, status, declined_reason, declined_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const assignmentResult = await db.query(assignmentQuery, [
        jobId, 
        interpreterId, 
        'declined', 
        declined_reason || 'No reason provided'
      ]);

      // Create notification for admin
      await db.query(`
        INSERT INTO job_notifications (
          job_id, interpreter_id, notification_type, subject, message, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        jobId,
        interpreterId,
        'job_declined',
        'Job Declined',
        `Interpreter has declined job: ${jobCheck.rows[0].title}. Reason: ${declined_reason || 'No reason provided'}`,
        'sent'
      ]);

      res.json({
        success: true,
        message: 'Job declined successfully',
        data: assignmentResult.rows[0]
      });
    } catch (error) {
      console.error('Error declining job:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Interpreter starts a job
  async startJob(req, res) {
    try {
      const { jobId } = req.params;
      const interpreterId = req.user.interpreterId;

      // Check if interpreter is assigned to this job
      const assignmentCheck = await db.query(
        'SELECT ja.*, j.status as job_status FROM job_assignments ja JOIN jobs j ON ja.job_id = j.id WHERE ja.job_id = $1 AND ja.interpreter_id = $2 AND ja.status = $3',
        [jobId, interpreterId, 'accepted']
      );

      if (assignmentCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Job assignment not found or not accepted' });
      }

      // Update job status to in_progress
      await db.query(
        'UPDATE jobs SET status = $1 WHERE id = $2',
        ['in_progress', jobId]
      );

      res.json({
        success: true,
        message: 'Job started successfully'
      });
    } catch (error) {
      console.error('Error starting job:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Interpreter completes a job
  async completeJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { jobId } = req.params;
      const interpreterId = req.user.interpreterId;
      const { actual_hours, notes } = req.body;

      // Check if interpreter is assigned to this job
      const assignmentCheck = await db.query(
        'SELECT ja.*, j.status as job_status, j.hourly_rate FROM job_assignments ja JOIN jobs j ON ja.job_id = j.id WHERE ja.job_id = $1 AND ja.interpreter_id = $2 AND ja.status = $3',
        [jobId, interpreterId, 'accepted']
      );

      if (assignmentCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Job assignment not found or not accepted' });
      }

      const assignment = assignmentCheck.rows[0];

      // Calculate total payment
      const total_payment = (actual_hours || 1) * (assignment.agreed_rate || assignment.hourly_rate);

      // Update assignment
      await db.query(
        'UPDATE job_assignments SET status = $1, actual_hours = $2, total_payment = $3 WHERE job_id = $4 AND interpreter_id = $5',
        ['completed', actual_hours || 1, total_payment, jobId, interpreterId]
      );

      // Update job status to completed
      await db.query(
        'UPDATE jobs SET status = $1, completed_at = CURRENT_TIMESTAMP, actual_duration_minutes = $2 WHERE id = $3',
        ['completed', (actual_hours || 1) * 60, jobId]
      );

      res.json({
        success: true,
        message: 'Job completed successfully',
        data: {
          actual_hours: actual_hours || 1,
          total_payment: total_payment
        }
      });
    } catch (error) {
      console.error('Error completing job:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get interpreter's earnings
  async getInterpreterEarnings(req, res) {
    try {
      const interpreterId = req.user.interpreterId;
      const { period = 'all' } = req.query; // all, month, week

      let dateFilter = '';
      if (period === 'month') {
        dateFilter = 'AND ja.accepted_at >= CURRENT_DATE - INTERVAL \'1 month\'';
      } else if (period === 'week') {
        dateFilter = 'AND ja.accepted_at >= CURRENT_DATE - INTERVAL \'1 week\'';
      }

      const earningsQuery = `
        SELECT 
          COALESCE(SUM(ja.total_payment), 0) as total_earnings,
          COUNT(ja.id) as completed_jobs,
          COALESCE(AVG(ja.total_payment), 0) as average_per_job,
          COALESCE(SUM(ja.actual_hours), 0) as total_hours
        FROM job_assignments ja
        WHERE ja.interpreter_id = $1 
        AND ja.status = 'completed'
        ${dateFilter}
      `;

      const result = await db.query(earningsQuery, [interpreterId]);

      // Get recent completed jobs
      const recentJobsQuery = `
        SELECT 
          j.title,
          j.scheduled_date,
          ja.actual_hours,
          ja.total_payment,
          ja.accepted_at
        FROM job_assignments ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.interpreter_id = $1 
        AND ja.status = 'completed'
        ORDER BY ja.accepted_at DESC
        LIMIT 10
      `;

      const recentJobs = await db.query(recentJobsQuery, [interpreterId]);

      // Get interpreter's service rates for display
      const serviceRatesQuery = `
        SELECT 
          isr.service_type_id,
          isr.rate_amount,
          isr.rate_unit,
          isr.rate_type,
          st.name as service_type_name
        FROM interpreter_service_rates isr
        JOIN service_types st ON isr.service_type_id = st.id
        WHERE isr.interpreter_id = $1
        ORDER BY st.name
      `;

      const serviceRates = await db.query(serviceRatesQuery, [interpreterId]);

      res.json({
        success: true,
        data: {
          summary: result.rows[0],
          recent_jobs: recentJobs.rows,
          service_rates: serviceRates.rows
        }
      });
    } catch (error) {
      console.error('Error fetching interpreter earnings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Admin assigns a job to an interpreter
  async assignJobToInterpreter(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { jobId } = req.params;
      const { interpreter_id, agreed_rate } = req.body;

      // Check if job exists and is open
      const jobCheck = await db.query('SELECT * FROM jobs WHERE id = $1 AND status = $2', [jobId, 'open']);
      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Job not found or not available' });
      }

      // Check if interpreter exists and is active
      const interpreterCheck = await db.query(
        'SELECT * FROM interpreters WHERE id = $1 AND is_active = true',
        [interpreter_id]
      );
      if (interpreterCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Interpreter not found or not active' });
      }

      // Check if interpreter already has an assignment for this job
      const existingAssignment = await db.query(
        'SELECT * FROM job_assignments WHERE job_id = $1 AND interpreter_id = $2',
        [jobId, interpreter_id]
      );

      if (existingAssignment.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Interpreter already has an assignment for this job' });
      }

      // Create assignment
      const assignmentQuery = `
        INSERT INTO job_assignments (
          job_id, interpreter_id, status, agreed_rate, accepted_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const assignmentResult = await db.query(assignmentQuery, [
        jobId, 
        interpreter_id, 
        'accepted', 
        agreed_rate || jobCheck.rows[0].hourly_rate
      ]);

      // Update job status to assigned
      await db.query(
        'UPDATE jobs SET status = $1, assigned_interpreter_id = $2, assigned_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['assigned', interpreter_id, jobId]
      );

      // Create notification for interpreter
      await db.query(`
        INSERT INTO job_notifications (
          job_id, interpreter_id, notification_type, subject, message, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        jobId,
        interpreter_id,
        'job_assigned',
        'Job Assigned',
        `You have been assigned to job: ${jobCheck.rows[0].title}`,
        'sent'
      ]);

      res.json({
        success: true,
        message: 'Job assigned successfully',
        data: assignmentResult.rows[0]
      });
    } catch (error) {
      console.error('Error assigning job:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get job assignments for admin view
  async getJobAssignments(req, res) {
    try {
      const { jobId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const offset = (page - 1) * limit;

      const query = `
        SELECT 
          ja.*,
          i.first_name || ' ' || i.last_name as interpreter_name,
          i.email as interpreter_email,
          i.phone as interpreter_phone,
          COUNT(*) OVER() as total_count
        FROM job_assignments ja
        JOIN interpreters i ON ja.interpreter_id = i.id
        WHERE ja.job_id = $1
        ORDER BY ja.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(query, [jobId, parseInt(limit), offset]);
      
      const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          assignments: result.rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_count: parseInt(totalCount),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching job assignments:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new JobAssignmentController();



