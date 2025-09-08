-- Add 5-minute reminder email template
INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, is_active, created_at, updated_at)
VALUES (
  'interpreter-5minute-reminder',
  'interpreter_reminder',
  'Your appointment starts in 5 minutes - {{jobTitle}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Starting Soon</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
        .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { background-color: #0056b3; }
        .urgent { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .info-box { background-color: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Your Appointment Starts in 5 Minutes!</h1>
        </div>
        
        <div class="content">
            <p>Hello {{interpreterName}},</p>
            
            <div class="urgent">
                <strong>🚨 URGENT:</strong> Your appointment is starting in just 5 minutes!
            </div>
            
            <h2>Appointment Details:</h2>
            <div class="info-box">
                <p><strong>Job Title:</strong> {{jobTitle}}</p>
                <p><strong>Date:</strong> {{appointmentDate}}</p>
                <p><strong>Time:</strong> {{appointmentTime}}</p>
                <p><strong>Location:</strong> {{location}}</p>
                <p><strong>Service Type:</strong> {{serviceType}}</p>
            </div>
            
            <h3>Quick Actions:</h3>
            <p>Click the button below to access your job timer and start/end your appointment:</p>
            
            <div style="text-align: center;">
                <a href="{{magicLinkUrl}}" class="button">🎯 Start/End Job Timer</a>
            </div>
            
            <div class="info-box">
                <p><strong>Note:</strong> This link allows you to start and end your job timing without logging in. It will expire in 24 hours for security.</p>
            </div>
            
            <p>If you have any issues or questions, please contact us immediately.</p>
            
            <p>Best regards,<br>
            The Interpreter Platform Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated reminder. Please do not reply to this email.</p>
            <p>If you need assistance, please contact our support team.</p>
        </div>
    </div>
</body>
</html>',
  'URGENT: Your appointment starts in 5 minutes!

Hello {{interpreterName}},

Your appointment is starting in just 5 minutes!

Appointment Details:
- Job Title: {{jobTitle}}
- Date: {{appointmentDate}}
- Time: {{appointmentTime}}
- Location: {{location}}
- Service Type: {{serviceType}}

Quick Actions:
Click this link to access your job timer: {{magicLinkUrl}}

Note: This link allows you to start and end your job timing without logging in. It will expire in 24 hours for security.

If you have any issues or questions, please contact us immediately.

Best regards,
The Interpreter Platform Team

---
This is an automated reminder. Please do not reply to this email.
If you need assistance, please contact our support team.',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (template_name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  updated_at = CURRENT_TIMESTAMP;
