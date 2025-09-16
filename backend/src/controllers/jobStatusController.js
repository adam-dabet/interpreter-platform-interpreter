const db = require('../config/database');
const loggerService = require('../services/loggerService');
const emailService = require('../services/emailService');
const pdfInvoiceService = require('../services/pdfInvoiceService');

class JobStatusController {
  // Transition job to a new status with validation
  async transitionJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const { status, reason, notes } = req.body;
      const userId = req.user?.id;

      // Validate input
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      // Get current job status
      const jobQuery = await db.query(
        'SELECT id, status, title FROM jobs WHERE id = $1 AND is_active = true',
        [jobId]
      );

      if (jobQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const currentJob = jobQuery.rows[0];
      const fromStatus = currentJob.status;

      // Validate transition using database function
      const validationQuery = await db.query(
        'SELECT can_transition_job_status($1, $2) as is_valid',
        [fromStatus, status]
      );

      if (!validationQuery.rows[0].is_valid) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from ${fromStatus} to ${status}`
        });
      }

      // If transitioning to 'billed', send invoice email first (before transaction)
      if (status === 'billed') {
        try {
          // Get job data for invoice email (before status change)
          const jobData = await db.query(
            'SELECT id, title, job_type, priority, status, scheduled_date, scheduled_time FROM jobs WHERE id = $1 AND is_active = true',
            [jobId]
          );

          if (jobData.rows.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Job not found for invoice email'
            });
          }

          // Send invoice email before updating status
          await this.sendInvoiceEmail(jobId, jobData.rows[0]);
          
          await loggerService.info('Invoice email sent successfully, proceeding with status update', {
            category: 'BILLING_EMAIL',
            jobId,
            userId
          });

        } catch (emailError) {
          // If invoice email fails, return error without updating status
          await loggerService.error('Failed to send invoice email, status update cancelled', emailError, {
            category: 'BILLING_EMAIL',
            jobId,
            userId
          });
          
          return res.status(500).json({
            success: false,
            message: 'Failed to send invoice email. Status cannot be changed to billed.',
            error: emailError.message
          });
        }
      }

      // Begin transaction for status update
      await db.query('BEGIN');

      try {
        // Update job status with additional fields based on new status
        let updateQuery = 'UPDATE jobs SET status = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2';
        let updateParams = [status, userId];
        let paramCount = 2;

        // Add status-specific fields
        switch (status) {
          case 'approved':
            updateQuery += `, approved_at = CURRENT_TIMESTAMP, approved_by = $${++paramCount}`;
            updateParams.push(userId);
            break;
          case 'rejected':
            updateQuery += `, rejected_at = CURRENT_TIMESTAMP, rejected_by = $${++paramCount}, rejection_reason = $${++paramCount}`;
            updateParams.push(userId, reason || 'No reason provided');
            break;
          case 'finding_interpreter':
            updateQuery += `, sent_to_interpreters_at = CURRENT_TIMESTAMP`;
            break;
          case 'reminders_sent':
            updateQuery += `, reminders_sent_at = CURRENT_TIMESTAMP`;
            break;
          case 'billed':
            updateQuery += `, billed_at = CURRENT_TIMESTAMP`;
            if (req.body.billed_amount) {
              updateQuery += `, billed_amount = $${++paramCount}, total_amount = $${++paramCount}`;
              updateParams.push(req.body.billed_amount, req.body.billed_amount);
            }
            break;
          case 'closed':
            updateQuery += `, closed_at = CURRENT_TIMESTAMP`;
            break;
          case 'interpreter_paid':
            updateQuery += `, interpreter_paid_at = CURRENT_TIMESTAMP`;
            if (req.body.paid_amount) {
              updateQuery += `, interpreter_paid_amount = $${++paramCount}`;
              updateParams.push(req.body.paid_amount);
            }
            break;
          case 'completion_report':
            if (req.body.completion_data) {
              updateQuery += `, completion_report_data = $${++paramCount}`;
              updateParams.push(JSON.stringify(req.body.completion_data));
            }
            break;
        }

        updateQuery += ` WHERE id = $${++paramCount} AND is_active = true RETURNING *`;
        updateParams.push(jobId);

        const result = await db.query(updateQuery, updateParams);

        if (result.rows.length === 0) {
          throw new Error('Failed to update job status');
        }

        const updatedJob = result.rows[0];

        // Log the status transition manually (in addition to trigger)
        await db.query(
          `INSERT INTO job_status_transitions (job_id, from_status, to_status, changed_by, reason, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [jobId, fromStatus, status, userId, reason, notes]
        );

        // Commit transaction
        await db.query('COMMIT');


        await loggerService.info('Job status updated', {
          category: 'JOB_STATUS',
          jobId,
          fromStatus,
          toStatus: status,
          userId,
          reason,
          notes
        });

        res.json({
          success: true,
          message: `Job status updated from ${fromStatus} to ${status}`,
          data: updatedJob
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      await loggerService.error('Failed to update job status', error, {
        category: 'JOB_STATUS',
        jobId: req.params.jobId,
        status: req.body.status,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update job status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get job status history
  async getJobStatusHistory(req, res) {
    try {
      const { jobId } = req.params;

      const result = await db.query(
        'SELECT * FROM get_job_status_history($1)',
        [jobId]
      );

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      await loggerService.error('Failed to get job status history', error, {
        category: 'JOB_STATUS',
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get job status history'
      });
    }
  }

  // Get valid status transitions for a job
  async getValidTransitions(req, res) {
    try {
      const { jobId } = req.params;

      // Get current job status
      const jobQuery = await db.query(
        'SELECT status FROM jobs WHERE id = $1 AND is_active = true',
        [jobId]
      );

      if (jobQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const currentStatus = jobQuery.rows[0].status;

      // Get valid transitions from our status constants
      const validTransitions = {
        'requested': ['approved', 'rejected'],
        'approved': ['finding_interpreter', 'cancelled'],
        'finding_interpreter': ['assigned', 'cancelled'],
        'assigned': ['reminders_sent', 'in_progress', 'cancelled', 'no_show'],
        'reminders_sent': ['in_progress', 'cancelled', 'no_show'],
        'in_progress': ['completed', 'cancelled'],
        'completed': ['completion_report', 'billed'],
        'completion_report': ['billed'],
        'billed': ['closed', 'interpreter_paid'],
        'closed': ['interpreter_paid'],
        'interpreter_paid': [],
        'cancelled': [],
        'no_show': ['billed'],
        'rejected': []
      };

      res.json({
        success: true,
        data: {
          currentStatus,
          validTransitions: validTransitions[currentStatus] || []
        }
      });

    } catch (error) {
      await loggerService.error('Failed to get valid transitions', error, {
        category: 'JOB_STATUS',
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get valid transitions'
      });
    }
  }

  // Admin-specific status management functions

  // Approve a job (requested -> approved)
  async approveJob(req, res) {
    try {
      const { jobId } = req.params;
      const { notes } = req.body;

      // Call our generic status transition method
      req.body.status = 'approved';
      req.body.notes = notes;
      
      return this.transitionJobStatus(req, res);

    } catch (error) {
      await loggerService.error('Failed to approve job', error, {
        category: 'ADMIN_ACTION',
        action: 'APPROVE_JOB',
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to approve job'
      });
    }
  }

  // Reject a job (requested -> rejected)
  async rejectJob(req, res) {
    try {
      const { jobId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      req.body.status = 'rejected';
      req.body.reason = reason;
      
      return this.transitionJobStatus(req, res);

    } catch (error) {
      await loggerService.error('Failed to reject job', error, {
        category: 'ADMIN_ACTION',
        action: 'REJECT_JOB',
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to reject job'
      });
    }
  }

  // Send job to interpreters (approved -> finding_interpreter)
  async sendToInterpreters(req, res) {
    try {
      const { jobId } = req.params;

      req.body.status = 'finding_interpreter';
      req.body.notes = 'Job sent to interpreters for assignment';
      
      return this.transitionJobStatus(req, res);

    } catch (error) {
      await loggerService.error('Failed to send job to interpreters', error, {
        category: 'ADMIN_ACTION',
        action: 'SEND_TO_INTERPRETERS',
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send job to interpreters'
      });
    }
  }

  // Send reminders (assigned -> reminders_sent)
  async sendReminders(req, res) {
    try {
      const { jobId } = req.params;

      req.body.status = 'reminders_sent';
      req.body.notes = 'Reminders sent to interpreter and claimant';
      
      return this.transitionJobStatus(req, res);

    } catch (error) {
      await loggerService.error('Failed to send reminders', error, {
        category: 'ADMIN_ACTION',
        action: 'SEND_REMINDERS',
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send reminders'
      });
    }
  }

  // Mark as billed
  async markAsBilled(req, res) {
    try {
      const { jobId } = req.params;
      const { amount, notes } = req.body;

      req.body.status = 'billed';
      req.body.billed_amount = amount;
      req.body.notes = notes || 'Job marked as billed';
      
      return this.transitionJobStatus(req, res);

    } catch (error) {
      await loggerService.error('Failed to mark job as billed', error, {
        category: 'ADMIN_ACTION',
        action: 'MARK_BILLED',
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to mark job as billed'
      });
    }
  }

  // Mark as closed
  async markAsClosed(req, res) {
    try {
      const { jobId } = req.params;
      const { notes } = req.body;

      req.body.status = 'closed';
      req.body.notes = notes || 'Job marked as closed';
      
      return this.transitionJobStatus(req, res);

    } catch (error) {
      await loggerService.error('Failed to mark job as closed', error, {
        category: 'ADMIN_ACTION',
        action: 'MARK_CLOSED',
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to mark job as closed'
      });
    }
  }

  // Mark interpreter as paid
  async markInterpreterPaid(req, res) {
    try {
      const { jobId } = req.params;
      const { amount, notes } = req.body;

      req.body.status = 'interpreter_paid';
      req.body.paid_amount = amount;
      req.body.notes = notes || 'Interpreter marked as paid';
      
      return this.transitionJobStatus(req, res);

    } catch (error) {
      await loggerService.error('Failed to mark interpreter as paid', error, {
        category: 'ADMIN_ACTION',
        action: 'MARK_INTERPRETER_PAID',
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to mark interpreter as paid'
      });
    }
  }

  // Get status statistics
  async getStatusStatistics(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          status,
          COUNT(*) as count,
          COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
        FROM jobs 
        WHERE is_active = true 
        GROUP BY status
        ORDER BY count DESC
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      await loggerService.error('Failed to get status statistics', error, {
        category: 'JOB_STATUS'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get status statistics'
      });
    }
  }

  // Send invoice email when job is marked as billed
  async sendInvoiceEmail(jobId, jobData) {
    try {
      // Get detailed job information including claimant, claim, and billing account data
      const jobQuery = await db.query(`
        SELECT 
          j.id, j.title, j.job_number, j.status,
          j.scheduled_date, j.scheduled_time, j.estimated_duration_minutes,
          j.actual_duration_minutes, j.total_amount, j.billed_amount,
          j.claimant_id, j.claim_id, j.billing_account_id,
          j.source_language_id, j.target_language_id, j.notes,
          j.appointment_type, j.interpreter_type_id,
          c.first_name as claimant_first_name,
          c.last_name as claimant_last_name,
          c.name as claimant_name,
          c.date_of_birth as claimant_dob,
          c.address as claimant_address,
          cl.claim_number as case_claim_number,
          cl.date_of_injury,
          c.employer,
          ba.name as billing_company,
          ba.email as billing_account_email,
          ba.address as billing_company_address,
          sl.name as language_name,
          st.name as service_type_name,
          it.name as interpreter_type_name,
          int_user.first_name as interpreter_first_name,
          int_user.last_name as interpreter_last_name
        FROM jobs j
        LEFT JOIN claimants c ON j.claimant_id = c.id
        LEFT JOIN claims cl ON j.claim_id = cl.id
        LEFT JOIN billing_accounts ba ON j.billing_account_id = ba.id
        LEFT JOIN languages sl ON j.source_language_id = sl.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN interpreter_types it ON j.interpreter_type_id = it.id
        LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
        LEFT JOIN users int_user ON i.user_id = int_user.id
        WHERE j.id = $1
      `, [jobId]);

      if (jobQuery.rows.length === 0) {
        throw new Error('Job not found for invoice email');
      }

      const job = jobQuery.rows[0];

      // Check if job has a billing account
      if (!job.billing_account_id) {
        await loggerService.warn('Job has no billing account, skipping invoice email', {
          category: 'BILLING_EMAIL',
          jobId,
          jobTitle: job.title
        });
        return; // Skip sending invoice email if no billing account
      }

      // Prepare email variables
      const emailVariables = {
        caseClaimNumber: job.case_claim_number || job.claimant_id || 'N/A',
        claimantFirstName: job.claimant_first_name || 'N/A',
        claimantLastName: job.claimant_last_name || 'N/A',
        claimantName: job.claimant_name || 'N/A',
        billingReference: job.job_number || job.id.substring(0, 8),
        billingCompany: job.billing_company || 'N/A',
        language: job.language_name || 'N/A',
        jobName: job.job_number || job.id.substring(0, 8)
      };

      // Generate PDF invoice
      let pdfPath = null;
      let attachments = [];
      
      try {
        // Prepare job data for PDF generation - use existing billing values
        const pdfJobData = {
          ...job,
          service_address: job.claimant_address, // Use claimant address as service address for now
          total_amount: job.total_amount || job.billed_amount || 0, // Use existing calculated values
          certification_number: '', // Add if available in database
          authorized_by: 'System', // Add if available in database
          authorized_date: new Date().toISOString().split('T')[0] // Current date
        };
        
        pdfPath = await pdfInvoiceService.generateInvoicePDF(pdfJobData);
        
        // Add PDF as attachment
        attachments = [{
          filename: `invoice_${job.job_number || job.id}.pdf`,
          path: pdfPath
        }];
        
        await loggerService.info('PDF invoice generated successfully', {
          category: 'BILLING_EMAIL',
          jobId,
          pdfPath
        });
        
      } catch (pdfError) {
        await loggerService.error('Failed to generate PDF invoice', pdfError, {
          category: 'BILLING_EMAIL',
          jobId
        });
        // Continue with email without attachment if PDF generation fails
      }

      // Determine recipient email - use billing account email if available
      const recipientEmail = job.billing_account_email || 'billing@integrityinterpreting.com';
      const recipientName = job.billing_company || 'Billing Department';

      // Queue the invoice email with PDF attachment
      await emailService.queueEmail(
        'invoice_email',
        recipientEmail,
        recipientName,
        emailVariables,
        'high', // High priority for invoices
        {
          jobId: jobId,
          emailType: 'invoice'
        },
        attachments // Pass attachments array
      );

      await loggerService.info('Invoice email queued successfully', {
        category: 'BILLING_EMAIL',
        jobId,
        recipientEmail,
        recipientName,
        emailVariables
      });

    } catch (error) {
      await loggerService.error('Failed to send invoice email', error, {
        category: 'BILLING_EMAIL',
        jobId
      });
      throw error;
    }
  }
}

module.exports = new JobStatusController();
