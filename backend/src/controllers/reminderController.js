const ReminderService = require('../services/reminderService');
const loggerService = require('../services/loggerService');

class ReminderController {
  constructor() {
    this.reminderService = new ReminderService();
    
    // Bind methods to preserve 'this' context
    this.processReminders = this.processReminders.bind(this);
    this.getUpcomingReminders = this.getUpcomingReminders.bind(this);
    this.getJobReminderStatus = this.getJobReminderStatus.bind(this);
    this.sendClaimantReminder = this.sendClaimantReminder.bind(this);
    this.sendInterpreter2DayReminder = this.sendInterpreter2DayReminder.bind(this);
    this.sendInterpreter1DayReminder = this.sendInterpreter1DayReminder.bind(this);
    this.sendInterpreter2HourReminder = this.sendInterpreter2HourReminder.bind(this);
    this.sendInterpreter5MinuteReminder = this.sendInterpreter5MinuteReminder.bind(this);
  }

  // Process all pending reminders
  async processReminders(req, res) {
    try {
      console.log('Admin triggered reminder processing...');
      
      const result = await this.reminderService.processReminders();
      
      await loggerService.info('Admin triggered reminder processing', {
        category: 'REMINDER',
        adminId: req.user.id,
        result
      });

      res.json({
        success: true,
        message: 'Reminder processing completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error processing reminders:', error);
      
      await loggerService.error('Failed to process reminders (admin triggered)', {
        category: 'REMINDER',
        adminId: req.user.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to process reminders',
        error: error.message
      });
    }
  }

  // Send claimant 2-day reminder for specific job
  async sendClaimantReminder(req, res) {
    try {
      const { jobId } = req.params;
      
      // Get the specific job directly (for admin-triggered reminders)
      const job = await this.reminderService.getJobById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const result = await this.reminderService.sendClaimantReminder(job, true); // Skip timing check for admin-triggered
      
      await loggerService.info('Admin sent claimant reminder', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: jobId,
        result
      });

      res.json({
        success: true,
        message: result.sent ? 'Claimant reminder sent successfully' : result.reason,
        data: result
      });
    } catch (error) {
      console.error('Error sending claimant reminder:', error);
      
      await loggerService.error('Failed to send claimant reminder (admin triggered)', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: req.params.jobId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send claimant reminder',
        error: error.message
      });
    }
  }

  // Send interpreter 2-day reminder for specific job
  async sendInterpreter2DayReminder(req, res) {
    try {
      const { jobId } = req.params;
      
      // Get the specific job directly (for admin-triggered reminders)
      const job = await this.reminderService.getJobById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const result = await this.reminderService.sendInterpreter2DayReminder(job, true); // Skip timing check for admin-triggered
      
      await loggerService.info('Admin sent interpreter 2-day reminder', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: jobId,
        result
      });

      res.json({
        success: true,
        message: result.sent ? 'Interpreter 2-day reminder sent successfully' : result.reason,
        data: result
      });
    } catch (error) {
      console.error('Error sending interpreter 2-day reminder:', error);
      
      await loggerService.error('Failed to send interpreter 2-day reminder (admin triggered)', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: req.params.jobId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send interpreter 2-day reminder',
        error: error.message
      });
    }
  }

  // Send interpreter 1-day reminder for specific job
  async sendInterpreter1DayReminder(req, res) {
    try {
      const { jobId } = req.params;
      
      // Get the specific job directly (for admin-triggered reminders)
      const job = await this.reminderService.getJobById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const result = await this.reminderService.sendInterpreter1DayReminder(job, true); // Skip timing check for admin-triggered
      
      await loggerService.info('Admin sent interpreter 1-day reminder', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: jobId,
        result
      });

      res.json({
        success: true,
        message: result.sent ? 'Interpreter 1-day reminder sent successfully' : result.reason,
        data: result
      });
    } catch (error) {
      console.error('Error sending interpreter 1-day reminder:', error);
      
      await loggerService.error('Failed to send interpreter 1-day reminder (admin triggered)', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: req.params.jobId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send interpreter 1-day reminder',
        error: error.message
      });
    }
  }

  // Send interpreter 2-hour reminder for specific job
  async sendInterpreter2HourReminder(req, res) {
    try {
      const { jobId } = req.params;
      
      // Get the specific job directly (for admin-triggered reminders)
      const job = await this.reminderService.getJobById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const result = await this.reminderService.sendInterpreter2HourReminder(job, true); // Skip timing check for admin-triggered
      
      await loggerService.info('Admin sent interpreter 2-hour reminder', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: jobId,
        result
      });

      res.json({
        success: true,
        message: result.sent ? 'Interpreter 2-hour reminder sent successfully' : result.reason,
        data: result
      });
    } catch (error) {
      console.error('Error sending interpreter 2-hour reminder:', error);
      
      await loggerService.error('Failed to send interpreter 2-hour reminder (admin triggered)', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: req.params.jobId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send interpreter 2-hour reminder',
        error: error.message
      });
    }
  }

  // Send 5-minute reminder with magic link
  async sendInterpreter5MinuteReminder(req, res) {
    try {
      const { jobId } = req.params;
      
      // Get the specific job directly (including deleted jobs for admin-triggered reminders)
      const job = await this.reminderService.getJobById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const result = await this.reminderService.sendInterpreter5MinuteReminder(job, true); // Skip timing check for admin-triggered
      
      await loggerService.info('Admin sent interpreter 5-minute reminder with magic link', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: jobId,
        result
      });

      res.json({
        success: true,
        message: result.sent ? 'Interpreter 5-minute reminder with magic link sent successfully' : result.reason,
        data: result
      });
    } catch (error) {
      console.error('Error sending interpreter 5-minute reminder:', error);
      
      await loggerService.error('Failed to send interpreter 5-minute reminder (admin triggered)', {
        category: 'REMINDER',
        adminId: req.user.id,
        jobId: req.params.jobId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send interpreter 5-minute reminder',
        error: error.message
      });
    }
  }

  // Get reminder status for a specific job
  async getJobReminderStatus(req, res) {
    try {
      const { jobId } = req.params;

      const result = await this.reminderService.getJobReminderStatus(jobId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting job reminder status:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get job reminder status',
        error: error.message
      });
    }
  }

  // Get upcoming jobs that need reminders
  async getUpcomingReminders(req, res) {
    try {
      const jobs = await this.reminderService.getJobsNeedingReminders();
      
      res.json({
        success: true,
        data: {
          jobs: jobs,
          total: jobs.length
        }
      });
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get upcoming reminders',
        error: error.message
      });
    }
  }
}

module.exports = new ReminderController();
