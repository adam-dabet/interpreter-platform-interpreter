const twilio = require('twilio');
const loggerService = require('./loggerService');

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
  async sendSMS(to, message) {
    try {
      if (!this.client) {
        throw new Error('Twilio not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
      }

      if (!this.fromNumber) {
        throw new Error('TWILIO_PHONE_NUMBER environment variable not set.');
      }

      // Format phone number (add +1 if not present)
      const formattedTo = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedTo
      });

      await loggerService.info('SMS sent successfully', {
        category: 'SMS',
        to: formattedTo,
        messageSid: result.sid,
        status: result.status
      });

      return {
        success: true,
        messageSid: result.sid,
        status: result.status
      };

    } catch (error) {
      await loggerService.error('Failed to send SMS', {
        category: 'SMS',
        to: to,
        error: error.message
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
      return await this.sendSMS(phoneNumber, message);
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

  // Check if SMS is configured
  isConfigured() {
    return !!(this.client && this.fromNumber);
  }
}

module.exports = new SMSService();
