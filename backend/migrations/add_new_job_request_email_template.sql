-- Migration: Add email template for new job requests
-- Date: 2024-12-19
-- Description: Adds email template for notifying admins about new job requests from customers

-- Insert email template for new job requests
INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, variables) VALUES
('new_job_request', 'admin_new_application', 
'New Job Request - {{jobTitle}}',
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">New Job Request</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Interpreter Platform</p>
</div>

<div style="padding: 30px; background-color: #f8f9fa;">
    <h2 style="color: #333; margin-bottom: 20px;">Job Request Details</h2>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="color: #667eea; margin-top: 0;">{{jobTitle}}</h3>
        <p><strong>Job ID:</strong> {{jobId}}</p>
        <p><strong>Appointment Date:</strong> {{appointmentDate}}</p>
        <p><strong>Appointment Time:</strong> {{appointmentTime}}</p>
        <p><strong>Appointment Type:</strong> {{appointmentType}}</p>
        <p><strong>Claimant ID:</strong> {{claimantId}}</p>
        <p><strong>Claim ID:</strong> {{claimId}}</p>
        <p><strong>Customer ID:</strong> {{customerId}}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{jobUrl}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Job in Admin Portal
        </a>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; border-left: 4px solid #2196f3;">
        <p style="margin: 0; color: #1976d2;"><strong>Action Required:</strong> Please review and authorize this job request to make it available to interpreters.</p>
    </div>
</div>

<div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 14px;">
    <p>This is an automated notification from the Interpreter Platform.</p>
    <p>Please do not reply to this email.</p>
</div>
</body></html>',
'New Job Request - {{jobTitle}}

Job Request Details:
- Job ID: {{jobId}}
- Appointment Date: {{appointmentDate}}
- Appointment Time: {{appointmentTime}}
- Appointment Type: {{appointmentType}}
- Claimant ID: {{claimantId}}
- Claim ID: {{claimId}}
- Customer ID: {{customerId}}

View Job in Admin Portal: {{jobUrl}}

Action Required: Please review and authorize this job request to make it available to interpreters.

This is an automated notification from the Interpreter Platform.
Please do not reply to this email.',
'["jobId", "jobTitle", "appointmentDate", "appointmentTime", "appointmentType", "claimantId", "claimId", "customerId", "jobUrl"]')
ON CONFLICT (template_name) DO NOTHING;

-- Add comment
COMMENT ON TABLE email_templates IS 'Email templates for various system notifications';

