const db = require('../config/database');
const emailService = require('./emailService');
const loggerService = require('./loggerService');
const magicLinkService = require('./magicLinkService');

class ReminderService {
  constructor() {
    this.emailService = emailService;
  }

  // Get jobs that need reminders
  async getJobsNeedingReminders() {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000));
    const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));

    try {
      // Get jobs that are assigned and scheduled for the next 2 days
      const jobsQuery = `
        SELECT 
          j.id, j.title, j.description, j.scheduled_date, j.scheduled_time,
          j.location_address, j.location_city, j.location_state, j.is_remote,
          j.hourly_rate, j.assigned_interpreter_id, j.claimant_id, j.client_email,
          j.claimant_reminder_sent, j.claimant_reminder_sent_at,
          j.interpreter_2day_reminder_sent, j.interpreter_2day_reminder_sent_at,
          j.interpreter_1day_reminder_sent, j.interpreter_1day_reminder_sent_at,
          j.interpreter_2hour_reminder_sent, j.interpreter_2hour_reminder_sent_at,
          j.interpreter_5minute_reminder_sent, j.interpreter_5minute_reminder_sent_at,
          c.first_name as claimant_first_name, c.last_name as claimant_last_name,
          i.first_name as interpreter_first_name, i.last_name as interpreter_last_name, i.email as interpreter_email,
          st.name as service_type_name,
          sl.name as source_language_name, tl.name as target_language_name
        FROM jobs j
        LEFT JOIN claimants c ON j.claimant_id = c.id
        LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN languages sl ON j.source_language_id = sl.id
        LEFT JOIN languages tl ON j.target_language_id = tl.id
        WHERE j.status = 'assigned' 
          AND j.assigned_interpreter_id IS NOT NULL
          AND j.scheduled_date >= CURRENT_DATE
          AND j.scheduled_date <= CURRENT_DATE + INTERVAL '2 days'
          AND j.is_active = true
        ORDER BY j.scheduled_date, j.scheduled_time
      `;

      const result = await db.query(jobsQuery);
      return result.rows;
    } catch (error) {
      console.error('Error getting jobs needing reminders:', error);
      throw error;
    }
  }

  // Get a specific job by ID (for admin-triggered reminders, includes deleted jobs)
  async getJobById(jobId) {
    try {
      const jobQuery = `
        SELECT 
          j.id, j.title, j.description, j.scheduled_date, j.scheduled_time,
          j.location_address, j.location_city, j.location_state, j.is_remote,
          j.hourly_rate, j.assigned_interpreter_id, j.claimant_id, j.client_email,
          j.claimant_reminder_sent, j.claimant_reminder_sent_at,
          j.interpreter_2day_reminder_sent, j.interpreter_2day_reminder_sent_at,
          j.interpreter_1day_reminder_sent, j.interpreter_1day_reminder_sent_at,
          j.interpreter_2hour_reminder_sent, j.interpreter_2hour_reminder_sent_at,
          j.interpreter_5minute_reminder_sent, j.interpreter_5minute_reminder_sent_at,
          c.first_name as claimant_first_name, c.last_name as claimant_last_name,
          i.first_name as interpreter_first_name, i.last_name as interpreter_last_name, i.email as interpreter_email,
          st.name as service_type_name,
          sl.name as source_language_name, tl.name as target_language_name
        FROM jobs j
        LEFT JOIN claimants c ON j.claimant_id = c.id
        LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN languages sl ON j.source_language_id = sl.id
        LEFT JOIN languages tl ON j.target_language_id = tl.id
        WHERE j.id = $1
      `;

      const result = await db.query(jobQuery, [jobId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting job by ID:', error);
      throw error;
    }
  }

  // Send claimant 2-day reminder
  async sendClaimantReminder(job, skipTimingCheck = false) {
    try {
      if (job.claimant_reminder_sent) {
        return { sent: false, reason: 'Already sent' };
      }

      if (!job.client_email || job.client_email.trim() === '') {
        return { sent: false, reason: 'No client email address' };
      }

      const appointmentDate = new Date(job.scheduled_date);
      const appointmentTime = job.scheduled_time;
      // Fix date parsing - handle both Date objects and strings
      const dateStr = job.scheduled_date instanceof Date ? job.scheduled_date.toISOString() : job.scheduled_date;
      const dateOnly = dateStr.split('T')[0];
      const appointmentDateTime = new Date(`${dateOnly}T${appointmentTime}`);
      
      // Check timing restrictions only if not skipped (for admin-triggered reminders)
      if (!skipTimingCheck) {
        const now = new Date();
        const timeDiff = appointmentDateTime.getTime() - now.getTime();
        const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
        
        if (hoursUntilAppointment > 48 || hoursUntilAppointment < 24) {
          return { sent: false, reason: 'Not within 2-day window (24-48 hours)' };
        }
      }

      const location = job.is_remote ? 'Remote' : `${job.location_address}, ${job.location_city}, ${job.location_state}`;
      const languages = `${job.source_language_name} → ${job.target_language_name}`;

      const variables = {
        claimant_name: `${job.claimant_first_name} ${job.claimant_last_name}`,
        appointment_date: appointmentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        appointment_time: appointmentTime,
        appointment_location: location,
        service_type: job.service_type_name,
        languages: languages
      };

      await this.emailService.queueEmail(
        'claimant_2day_reminder',
        job.client_email,
        `${job.claimant_first_name} ${job.claimant_last_name}`,
        variables,
        'normal'
      );

      // Update job record
      await db.query(
        'UPDATE jobs SET claimant_reminder_sent = true, claimant_reminder_sent_at = CURRENT_TIMESTAMP, status = $2 WHERE id = $1',
        [job.id, 'reminders_sent']
      );

      await loggerService.info('Claimant reminder sent', {
        category: 'REMINDER',
        jobId: job.id,
        claimantEmail: job.client_email,
        appointmentDate: job.scheduled_date
      });

      return { sent: true, reason: 'Successfully sent' };
    } catch (error) {
      console.error('Error sending claimant reminder:', error);
      await loggerService.error('Failed to send claimant reminder', {
        category: 'REMINDER',
        jobId: job.id,
        error: error.message
      });
      throw error;
    }
  }

  // Send interpreter 2-day reminder
  async sendInterpreter2DayReminder(job, skipTimingCheck = false) {
    try {
      if (job.interpreter_2day_reminder_sent) {
        return { sent: false, reason: 'Already sent' };
      }

      if (!job.interpreter_email || job.interpreter_email.trim() === '') {
        return { sent: false, reason: 'No interpreter email address' };
      }

      const appointmentDate = new Date(job.scheduled_date);
      const appointmentTime = job.scheduled_time;
      // Fix date parsing - handle both Date objects and strings
      const dateStr = job.scheduled_date instanceof Date ? job.scheduled_date.toISOString() : job.scheduled_date;
      const dateOnly = dateStr.split('T')[0];
      const appointmentDateTime = new Date(`${dateOnly}T${appointmentTime}`);
      const now = new Date();
      
      // Check if it's within 2 days (48 hours) of the appointment
      const timeDiff = appointmentDateTime.getTime() - now.getTime();
      const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
      
      if (hoursUntilAppointment > 48 || hoursUntilAppointment < 24) {
        return { sent: false, reason: 'Not within 2-day window (24-48 hours)' };
      }

      const location = job.is_remote ? 'Remote' : `${job.location_address}, ${job.location_city}, ${job.location_state}`;
      const languages = `${job.source_language_name} → ${job.target_language_name}`;

      const variables = {
        interpreter_name: `${job.interpreter_first_name} ${job.interpreter_last_name}`,
        claimant_name: `${job.claimant_first_name} ${job.claimant_last_name}`,
        appointment_date: appointmentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        appointment_time: appointmentTime,
        appointment_location: location,
        service_type: job.service_type_name,
        languages: languages,
        hourly_rate: `$${job.hourly_rate}/hour`
      };

      await this.emailService.queueEmail(
        'interpreter_2day_reminder',
        job.interpreter_email,
        `${job.interpreter_first_name} ${job.interpreter_last_name}`,
        variables,
        'normal'
      );

      // Update job record
      await db.query(
        'UPDATE jobs SET interpreter_2day_reminder_sent = true, interpreter_2day_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
        [job.id]
      );

      await loggerService.info('Interpreter 2-day reminder sent', {
        category: 'REMINDER',
        jobId: job.id,
        interpreterEmail: job.interpreter_email,
        appointmentDate: job.scheduled_date
      });

      return { sent: true, reason: 'Successfully sent' };
    } catch (error) {
      console.error('Error sending interpreter 2-day reminder:', error);
      await loggerService.error('Failed to send interpreter 2-day reminder', {
        category: 'REMINDER',
        jobId: job.id,
        error: error.message
      });
      throw error;
    }
  }

  // Send interpreter 1-day reminder
  async sendInterpreter1DayReminder(job, skipTimingCheck = false) {
    try {
      if (job.interpreter_1day_reminder_sent) {
        return { sent: false, reason: 'Already sent' };
      }

      if (!job.interpreter_email || job.interpreter_email.trim() === '') {
        return { sent: false, reason: 'No interpreter email address' };
      }

      const appointmentDate = new Date(job.scheduled_date);
      const appointmentTime = job.scheduled_time;
      // Fix date parsing - handle both Date objects and strings
      const dateStr = job.scheduled_date instanceof Date ? job.scheduled_date.toISOString() : job.scheduled_date;
      const dateOnly = dateStr.split('T')[0];
      const appointmentDateTime = new Date(`${dateOnly}T${appointmentTime}`);
      const now = new Date();
      
      // Check if it's within 1 day (24 hours) of the appointment
      const timeDiff = appointmentDateTime.getTime() - now.getTime();
      const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
      
      if (hoursUntilAppointment > 24 || hoursUntilAppointment < 2) {
        return { sent: false, reason: 'Not within 1-day window (2-24 hours)' };
      }

      const location = job.is_remote ? 'Remote' : `${job.location_address}, ${job.location_city}, ${job.location_state}`;
      const languages = `${job.source_language_name} → ${job.target_language_name}`;

      const variables = {
        interpreter_name: `${job.interpreter_first_name} ${job.interpreter_last_name}`,
        claimant_name: `${job.claimant_first_name} ${job.claimant_last_name}`,
        appointment_date: appointmentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        appointment_time: appointmentTime,
        appointment_location: location,
        service_type: job.service_type_name,
        languages: languages,
        hourly_rate: `$${job.hourly_rate}/hour`
      };

      await this.emailService.queueEmail(
        'interpreter_1day_reminder',
        job.interpreter_email,
        `${job.interpreter_first_name} ${job.interpreter_last_name}`,
        variables,
        'normal'
      );

      // Update job record
      await db.query(
        'UPDATE jobs SET interpreter_1day_reminder_sent = true, interpreter_1day_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
        [job.id]
      );

      await loggerService.info('Interpreter 1-day reminder sent', {
        category: 'REMINDER',
        jobId: job.id,
        interpreterEmail: job.interpreter_email,
        appointmentDate: job.scheduled_date
      });

      return { sent: true, reason: 'Successfully sent' };
    } catch (error) {
      console.error('Error sending interpreter 1-day reminder:', error);
      await loggerService.error('Failed to send interpreter 1-day reminder', {
        category: 'REMINDER',
        jobId: job.id,
        error: error.message
      });
      throw error;
    }
  }

  // Send interpreter 2-hour reminder
  async sendInterpreter2HourReminder(job, skipTimingCheck = false) {
    try {
      if (job.interpreter_2hour_reminder_sent) {
        return { sent: false, reason: 'Already sent' };
      }

      if (!job.interpreter_email || job.interpreter_email.trim() === '') {
        return { sent: false, reason: 'No interpreter email address' };
      }

      const appointmentDate = new Date(job.scheduled_date);
      const appointmentTime = job.scheduled_time;
      // Fix date parsing - handle both Date objects and strings
      const dateStr = job.scheduled_date instanceof Date ? job.scheduled_date.toISOString() : job.scheduled_date;
      const dateOnly = dateStr.split('T')[0];
      const appointmentDateTime = new Date(`${dateOnly}T${appointmentTime}`);
      const now = new Date();
      
      // Check if it's within 2 hours of the appointment
      const timeDiff = appointmentDateTime.getTime() - now.getTime();
      const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
      
      if (hoursUntilAppointment > 2 || hoursUntilAppointment < 0) {
        return { sent: false, reason: 'Not within 2-hour window (0-2 hours)' };
      }

      const location = job.is_remote ? 'Remote' : `${job.location_address}, ${job.location_city}, ${job.location_state}`;
      const languages = `${job.source_language_name} → ${job.target_language_name}`;

      const variables = {
        interpreter_name: `${job.interpreter_first_name} ${job.interpreter_last_name}`,
        claimant_name: `${job.claimant_first_name} ${job.claimant_last_name}`,
        appointment_date: appointmentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        appointment_time: appointmentTime,
        appointment_location: location,
        service_type: job.service_type_name,
        languages: languages,
        hourly_rate: `$${job.hourly_rate}/hour`
      };

      await this.emailService.queueEmail(
        'interpreter_2hour_reminder',
        job.interpreter_email,
        `${job.interpreter_first_name} ${job.interpreter_last_name}`,
        variables,
        'high' // High priority for 2-hour reminder
      );

      // Update job record
      await db.query(
        'UPDATE jobs SET interpreter_2hour_reminder_sent = true, interpreter_2hour_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
        [job.id]
      );

      await loggerService.info('Interpreter 2-hour reminder sent', {
        category: 'REMINDER',
        jobId: job.id,
        interpreterEmail: job.interpreter_email,
        appointmentDate: job.scheduled_date
      });

      return { sent: true, reason: 'Successfully sent' };
    } catch (error) {
      console.error('Error sending interpreter 2-hour reminder:', error);
      await loggerService.error('Failed to send interpreter 2-hour reminder', {
        category: 'REMINDER',
        jobId: job.id,
        error: error.message
      });
      throw error;
    }
  }

  // Send 5-minute reminder with magic link
  async sendInterpreter5MinuteReminder(job, skipTimingCheck = false) {
    try {
      if (job.interpreter_5minute_reminder_sent) {
        return { sent: false, reason: 'Already sent' };
      }

      if (!job.interpreter_email || job.interpreter_email.trim() === '') {
        return { sent: false, reason: 'No interpreter email address' };
      }

      const appointmentDate = new Date(job.scheduled_date);
      const appointmentTime = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const now = new Date();
      
      // Check if it's within 5 minutes of appointment time (skip for admin-triggered reminders)
      if (!skipTimingCheck) {
        const timeDiff = appointmentTime.getTime() - now.getTime();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (timeDiff > fiveMinutes || timeDiff < 0) {
          return { sent: false, reason: 'Not within 5 minutes of appointment time' };
        }
      }

      // Create magic link
      const magicLink = await magicLinkService.createMagicLink(job.id, job.assigned_interpreter_id);
      const magicLinkUrl = magicLinkService.getMagicLinkUrl(magicLink.token);

      await this.emailService.queueEmail(
        'interpreter-5minute-reminder',
        job.interpreter_email,
        `${job.interpreter_first_name} ${job.interpreter_last_name}`,
        {
          interpreterName: `${job.interpreter_first_name} ${job.interpreter_last_name}`,
          jobTitle: job.title,
          appointmentDate: appointmentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          appointmentTime: appointmentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          location: job.is_remote ? 'Remote (Online)' : `${job.location_address}, ${job.location_city}, ${job.location_state}`,
          magicLinkUrl: magicLinkUrl,
          serviceType: job.service_type_name
        }
      );

      // Mark reminder as sent
      await db.query(`
        UPDATE jobs 
        SET 
          interpreter_5minute_reminder_sent = TRUE,
          interpreter_5minute_reminder_sent_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [job.id]);

      await loggerService.info('Interpreter 5-minute reminder with magic link sent', {
        category: 'REMINDER',
        jobId: job.id,
        interpreterEmail: job.interpreter_email,
        appointmentDate: job.scheduled_date,
        magicLinkToken: magicLink.token
      });

      return { sent: true, reason: 'Successfully sent with magic link' };
    } catch (error) {
      console.error('Error sending interpreter 5-minute reminder:', error);
      await loggerService.error('Failed to send interpreter 5-minute reminder', {
        category: 'REMINDER',
        jobId: job.id,
        error: error.message
      });
      throw error;
    }
  }

  // Process all pending reminders
  async processReminders() {
    try {
      console.log('Starting reminder processing...');
      const jobs = await this.getJobsNeedingReminders();
      
      let claimantRemindersSent = 0;
      let interpreter2DayRemindersSent = 0;
      let interpreter1DayRemindersSent = 0;
      let interpreter2HourRemindersSent = 0;
      let interpreter5MinuteRemindersSent = 0;

      for (const job of jobs) {
        // Send claimant reminder
        const claimantResult = await this.sendClaimantReminder(job);
        if (claimantResult.sent) claimantRemindersSent++;

        // Send interpreter reminders
        const interpreter2DayResult = await this.sendInterpreter2DayReminder(job);
        if (interpreter2DayResult.sent) interpreter2DayRemindersSent++;

        const interpreter1DayResult = await this.sendInterpreter1DayReminder(job);
        if (interpreter1DayResult.sent) interpreter1DayRemindersSent++;

        const interpreter2HourResult = await this.sendInterpreter2HourReminder(job);
        if (interpreter2HourResult.sent) interpreter2HourRemindersSent++;

        const interpreter5MinuteResult = await this.sendInterpreter5MinuteReminder(job);
        if (interpreter5MinuteResult.sent) interpreter5MinuteRemindersSent++;
      }

      const summary = {
        totalJobsProcessed: jobs.length,
        claimantRemindersSent,
        interpreter2DayRemindersSent,
        interpreter1DayRemindersSent,
        interpreter2HourRemindersSent,
        interpreter5MinuteRemindersSent,
        totalRemindersSent: claimantRemindersSent + interpreter2DayRemindersSent + interpreter1DayRemindersSent + interpreter2HourRemindersSent + interpreter5MinuteRemindersSent
      };

      console.log('Reminder processing completed:', summary);
      
      await loggerService.info('Reminder processing completed', {
        category: 'REMINDER',
        ...summary
      });

      return summary;
    } catch (error) {
      console.error('Error processing reminders:', error);
      await loggerService.error('Failed to process reminders', {
        category: 'REMINDER',
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ReminderService;
