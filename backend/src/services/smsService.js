const twilio = require('twilio');
const loggerService = require('./loggerService');
const db = require('../config/database');

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      } catch (error) {
        console.error('Failed to initialize Twilio client:', error.message);
        this.client = null;
      }
    }
  }

  // Send SMS message
  async sendSMS(to, message, trackingData = {}) {
    let trackingId = null;
    
    try {
      if (!this.client) {
        throw new Error('Twilio not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
      }

      if (!this.fromNumber) {
        throw new Error('TWILIO_PHONE_NUMBER environment variable not set.');
      }

      // Format phone number (add +1 if not present)
      const formattedTo = this.formatPhoneNumber(to);
      
      // Track SMS before sending
      if (trackingData.smsType) {
        trackingId = await this.trackSMS({
          smsType: trackingData.smsType,
          recipientPhone: formattedTo,
          recipientName: trackingData.recipientName || null,
          message: message,
          status: 'pending',
          jobId: trackingData.jobId || null,
          interpreterId: trackingData.interpreterId || null,
          customerId: trackingData.customerId || null,
          reminderType: trackingData.reminderType || null
        });
      }
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedTo
      });

      // Update tracking with Twilio details
      if (trackingId) {
        await db.query(`
          UPDATE sms_tracking 
          SET status = $1, sent_at = CURRENT_TIMESTAMP, twilio_message_sid = $2, twilio_status = $3
          WHERE id = $4
        `, ['sent', result.sid, result.status, trackingId]);
      }

      await loggerService.info('SMS sent successfully', {
        category: 'SMS',
        to: formattedTo,
        messageSid: result.sid,
        status: result.status,
        trackingId: trackingId
      });

      return {
        success: true,
        messageSid: result.sid,
        status: result.status,
        trackingId: trackingId
      };

    } catch (error) {
      // Update tracking with error if we have a tracking ID
      if (trackingId) {
        await db.query(`
          UPDATE sms_tracking 
          SET status = $1, failed_at = CURRENT_TIMESTAMP, error_message = $2
          WHERE id = $3
        `, ['failed', error.message, trackingId]);
      }

      await loggerService.error('Failed to send SMS', {
        category: 'SMS',
        to: to,
        error: error.message,
        trackingId: trackingId
      });
      
      throw error;
    }
  }

  // Format phone number for Twilio
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it's 10 digits, add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it's 11 digits and starts with 1, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it already has +, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // Default: add +1
    return `+1${digits}`;
  }

  // Send reminder SMS with template
  async sendReminderSMS(phoneNumber, reminderType, jobData) {
    try {
      const message = this.getReminderMessage(reminderType, jobData);
      
      // Determine recipient name based on reminder type
      let recipientName = null;
      if (reminderType.startsWith('claimant_')) {
        recipientName = jobData?.client_name || 'Claimant';
      } else if (reminderType.startsWith('interpreter_')) {
        recipientName = jobData?.interpreter_name || 'Interpreter';
      }
      
      return await this.sendSMS(phoneNumber, message, {
        smsType: reminderType,
        recipientName: recipientName,
        jobId: jobData?.id,
        interpreterId: jobData?.interpreter_id,
        customerId: jobData?.customer_id,
        reminderType: reminderType
      });
    } catch (error) {
      await loggerService.error('Failed to send reminder SMS', {
        category: 'SMS',
        reminderType: reminderType,
        jobId: jobData?.id,
        error: error.message
      });
      throw error;
    }
  }

  // Get formatted reminder message based on type
  getReminderMessage(reminderType, jobData) {
    const { title, scheduled_date, scheduled_time, is_remote } = jobData;
    
    const appointmentDate = new Date(scheduled_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    const appointmentTime = new Date(`2000-01-01T${scheduled_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const location = is_remote ? 'Remote' : 'On-site';

    switch (reminderType) {
      case 'claimant_2day_reminder':
        return `Reminder: "${title}" on ${appointmentDate} at ${appointmentTime}. ${location}. Confirm attendance.`;

      case 'interpreter_2day_reminder':
        return `Appointment: "${title}" on ${appointmentDate} at ${appointmentTime}. ${location}. Confirm availability.`;

      case 'interpreter_1day_reminder':
        return `Tomorrow: "${title}" at ${appointmentTime}. ${location}. Prepare accordingly.`;

      case 'interpreter_2hour_reminder':
        return `URGENT: "${title}" in 2 hours at ${appointmentTime}. ${location}. Get ready.`;

      case 'interpreter_5minute_reminder':
        return `NOW: "${title}" starts in 5 min at ${appointmentTime}. ${location}.`;

      default:
        return `Reminder: "${title}" on ${appointmentDate} at ${appointmentTime}. ${location}.`;
    }
  }

  // Track SMS in database
  async trackSMS(trackingData) {
    try {
      const {
        smsType,
        recipientPhone,
        recipientName,
        message,
        status = 'pending',
        sentAt = null,
        twilioMessageSid = null,
        twilioStatus = null,
        jobId = null,
        interpreterId = null,
        customerId = null,
        reminderType = null,
        errorMessage = null
      } = trackingData;

      const result = await db.query(`
        INSERT INTO sms_tracking (
          sms_type, recipient_phone, recipient_name, message, status,
          sent_at, twilio_message_sid, twilio_status, job_id, interpreter_id,
          customer_id, reminder_type, error_message, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        smsType,
        recipientPhone,
        recipientName,
        message,
        status,
        sentAt,
        twilioMessageSid,
        twilioStatus,
        jobId,
        interpreterId,
        customerId,
        reminderType,
        errorMessage
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error tracking SMS:', error);
      throw error;
    }
  }

  // Update SMS status (for webhooks)
  async updateSMSStatus(twilioMessageSid, status, deliveredAt = null, errorMessage = null) {
    try {
      const updateFields = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
      const params = [twilioMessageSid, status];
      let paramCount = 2;

      if (deliveredAt) {
        paramCount++;
        updateFields.push(`delivered_at = $${paramCount}`);
        params.push(deliveredAt);
      }

      if (errorMessage) {
        paramCount++;
        updateFields.push(`error_message = $${paramCount}`);
        params.push(errorMessage);
      }

      if (status === 'failed') {
        paramCount++;
        updateFields.push(`failed_at = CURRENT_TIMESTAMP`);
      }

      await db.query(`
        UPDATE sms_tracking 
        SET ${updateFields.join(', ')}
        WHERE twilio_message_sid = $1
      `, params);

    } catch (error) {
      console.error('Error updating SMS status:', error);
      throw error;
    }
  }

  // Check if SMS is configured
  isConfigured() {
    return !!(this.client && this.fromNumber);
  }
}

module.exports = new SMSService();
