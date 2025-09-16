const nodemailer = require('nodemailer');
const db = require('../config/database');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    if (process.env.EMAIL_SERVICE === 'sendgrid') {
      return nodemailer.createTransport({  // Changed from createTransporter
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else {
      // Default SMTP configuration
      return nodemailer.createTransport({  // Changed from createTransporter
        host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'localhost',
        port: process.env.EMAIL_PORT || process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_HOST_USER || process.env.SMTP_USER,
          pass: process.env.EMAIL_HOST_PASSWORD || process.env.SMTP_PASS
        }
      });
    } 
  }

  async queueEmail(templateName, toEmail, toName, variables = {}, priority = 'normal', trackingData = {}, attachments = []) {
    try {
      // Get email template
      const templateResult = await db.query(
        'SELECT * FROM email_templates WHERE template_name = $1 AND is_active = true',
        [templateName]
      );

      if (templateResult.rows.length === 0) {
        throw new Error(`Email template not found: ${templateName}`);
      }

      const template = templateResult.rows[0];
      
      // Process template variables
      let processedSubject = template.subject;
      let processedBodyHtml = template.body_html;
      let processedBodyText = template.body_text;

      // Replace variables in template
      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        const value = variables[key] || '';
        
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
        processedBodyHtml = processedBodyHtml.replace(new RegExp(placeholder, 'g'), value);
        processedBodyText = processedBodyText.replace(new RegExp(placeholder, 'g'), value);
      });

      // Queue email
      const fromEmail = process.env.EMAIL_HOST_USER || process.env.SENDGRID_FROM_EMAIL || 'noreply@interpreterplatform.com';
      const fromName = process.env.FROM_NAME || process.env.SENDGRID_FROM_NAME || 'Interpreter Platform';
      
      const result = await db.query(`
        INSERT INTO email_queue (
          to_email, to_name, subject, body_html, body_text,
          template_name, priority, from_email, from_name,
          job_id, interpreter_id, customer_id, reminder_type, attachments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        toEmail, toName, processedSubject, processedBodyHtml, 
        processedBodyText, templateName, priority, fromEmail, fromName,
        trackingData.jobId || null, trackingData.interpreterId || null, 
        trackingData.customerId || null, trackingData.reminderType || null,
        JSON.stringify(attachments)
      ]);

      console.log(`Email queued: ${templateName} to ${toEmail}`);
      return result.rows[0].id;
    } catch (error) {
      console.error('Error queueing email:', error);
      throw error;
    }
  }

  async processEmailQueue(batchSize = 10) {
    const emails = await db.query(`
      SELECT * FROM email_queue 
      WHERE status = 'pending' 
        AND scheduled_for <= CURRENT_TIMESTAMP
        AND attempts < max_attempts
      ORDER BY priority DESC, scheduled_for ASC
      LIMIT $1
    `, [batchSize]);

    let processedCount = 0;

    for (const email of emails.rows) {
      try {
        // Update status to sending
        await db.query(
          'UPDATE email_queue SET status = $1, attempts = attempts + 1 WHERE id = $2',
          ['sending', email.id]
        );

        // Prepare email options
        const mailOptions = {
          from: `${email.from_name} <${email.from_email}>`,
          to: `${email.to_name} <${email.to_email}>`,
          subject: email.subject,
          html: email.body_html,
          text: email.body_text
        };

        // Add attachments if any
        if (email.attachments && email.attachments.length > 0) {
          mailOptions.attachments = email.attachments.map(attachment => ({
            filename: attachment.filename,
            path: attachment.path
          }));
        }

        // Send email
        await this.transporter.sendMail(mailOptions);

        // Clean up temporary PDF files after successful email send
        if (email.attachments && email.attachments.length > 0) {
          email.attachments.forEach(attachment => {
            if (attachment.path && attachment.path.includes('invoice_') && attachment.path.includes('.pdf')) {
              try {
                const fs = require('fs');
                if (fs.existsSync(attachment.path)) {
                  fs.unlinkSync(attachment.path);
                  console.log(`Cleaned up temporary PDF: ${attachment.path}`);
                }
              } catch (cleanupError) {
                console.error('Error cleaning up PDF file:', cleanupError);
              }
            }
          });
        }

        // Track email in email_tracking table
        await this.trackEmail({
          emailType: email.template_name,
          recipientEmail: email.to_email,
          recipientName: email.to_name,
          subject: email.subject,
          content: email.body_html,
          status: 'sent',
          sentAt: new Date(),
          jobId: email.job_id || null,
          interpreterId: email.interpreter_id || null,
          customerId: email.customer_id || null,
          reminderType: email.reminder_type || null
        });

        // Mark as sent
        await db.query(
          'UPDATE email_queue SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['sent', email.id]
        );

        processedCount++;
        console.log(`Email sent: ${email.template_name} to ${email.to_email}`);

      } catch (error) {
        console.error(`Failed to send email ${email.id}:`, error);
        
        // Track failed email
        await this.trackEmail({
          emailType: email.template_name,
          recipientEmail: email.to_email,
          recipientName: email.to_name,
          subject: email.subject,
          content: email.body_html,
          status: 'failed',
          sentAt: null,
          jobId: email.job_id || null,
          interpreterId: email.interpreter_id || null,
          customerId: email.customer_id || null,
          reminderType: email.reminder_type || null,
          errorMessage: error.message
        });
        
        // Update error status
        const newStatus = email.attempts >= email.max_attempts ? 'failed' : 'pending';
        const nextSchedule = email.attempts < email.max_attempts 
          ? new Date(Date.now() + 15 * 60 * 1000) // Retry in 15 minutes
          : email.scheduled_for;
        
        await db.query(
          'UPDATE email_queue SET status = $1, last_error = $2, scheduled_for = $3 WHERE id = $4',
          [newStatus, error.message, nextSchedule, email.id]
        );
      }
    }

    return processedCount;
  }

  async trackEmail(emailData) {
    try {
      const {
        emailType,
        recipientEmail,
        recipientName,
        subject,
        content,
        status,
        sentAt,
        jobId,
        interpreterId,
        customerId,
        reminderType,
        errorMessage
      } = emailData;

      await db.query(`
        INSERT INTO email_tracking (
          email_type, recipient_email, recipient_name, subject, content,
          status, sent_at, job_id, interpreter_id, customer_id, reminder_type, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        emailType, recipientEmail, recipientName, subject, content,
        status, sentAt, jobId, interpreterId, customerId, reminderType, errorMessage
      ]);
    } catch (error) {
      console.error('Error tracking email:', error);
      // Don't throw error to avoid breaking email sending
    }
  }

  async sendInterpreterConfirmation(interpreterData) {
    return this.queueEmail(
      'application_received',
      applicationData.email,
      `${applicationData.first_name} ${applicationData.last_name}`,
      {
        first_name: applicationData.first_name,
        application_id: applicationData.id,
        submission_date: new Date(applicationData.submission_date).toLocaleDateString()
      }
    );
  }

  async sendAdminNotification(applicationData) {
    const languagesList = applicationData.languages 
      ? applicationData.languages.map(l => `${l.name} (${l.proficiency})`).join(', ')
      : 'Not specified';

    return this.queueEmail(
      'admin_new_application',
      'generalinbox@theintegritycompanyinc.com',
      'Admin Team',
      {
        applicant_name: `${applicationData.first_name} ${applicationData.last_name}`,
        applicant_email: applicationData.email,
        application_id: applicationData.id,
        service_types: Array.isArray(applicationData.preferred_service_types) 
          ? applicationData.preferred_service_types.join(', ')
          : applicationData.preferred_service_types,
        languages: languagesList,
        years_experience: applicationData.years_of_experience
      },
      'high'
    );
  }

  async sendInterpreterApproval(approvalData) {
    return this.queueEmail(
      'interpreter_approved',
      approvalData.email,
      approvalData.name,
      {
        name: approvalData.name,
        approval_date: new Date().toLocaleDateString(),
        notes: approvalData.notes || '',
        next_steps: 'You will receive further instructions on how to access your interpreter dashboard and start accepting assignments.',
        login_url: approvalData.loginUrl || process.env.INTERPRETER_LOGIN_URL || 'http://localhost:3000/login',
        username: approvalData.username || '',
        temp_password: approvalData.tempPassword || ''
      },
      'high'
    );
  }

  async sendInterpreterRejection(rejectionData) {
    return this.queueEmail(
      'interpreter_rejected',
      rejectionData.email,
      rejectionData.name,
      {
        name: rejectionData.name,
        rejection_date: new Date().toLocaleDateString(),
        rejection_reason: rejectionData.rejection_reason,
        notes: rejectionData.notes || '',
        reapply_info: 'You may reapply after addressing the issues mentioned above.'
      },
      'high'
    );
  }

  async sendCustomerMagicLink(magicLinkData) {
    return this.queueEmail(
      'customer_magic_link',
      magicLinkData.email,
      magicLinkData.customer_name,
      {
        customer_name: magicLinkData.customer_name,
        magic_link_url: magicLinkData.magic_link_url,
        expires_in_minutes: magicLinkData.expires_in_minutes || 30,
        platform_name: 'Interpreter Platform',
        support_email: process.env.SUPPORT_EMAIL || 'support@interpreterplatform.com'
      },
      'high'
    );
  }
}

module.exports = new EmailService();