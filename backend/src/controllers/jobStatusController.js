const db = require('../config/database');
const loggerService = require('../services/loggerService');

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
              updateQuery += `, billed_amount = $${++paramCount}`;
              updateParams.push(req.body.billed_amount);
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
}

module.exports = new JobStatusController();
