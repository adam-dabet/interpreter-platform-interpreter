-- Update interpreter 2-day reminder email template to include confirmation requirement

UPDATE email_templates 
SET 
    subject = 'URGENT: Confirm Your Interpreter Assignment - {{appointment_date}}',
    body_html = '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #ff6b35; color: white; padding: 20px; text-align: center;">
    <h2 style="margin: 0;">🔔 Assignment Reminder & Confirmation Required</h2>
    <p style="margin: 5px 0 0 0; font-size: 16px;">Your interpreter assignment is in 2 days</p>
</div>
<div style="padding: 20px; background: #f8f9fa;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Assignment Details</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;"><strong>Date:</strong> {{appointment_date}}</li>
            <li style="margin-bottom: 8px;"><strong>Time:</strong> {{appointment_time}}</li>
            <li style="margin-bottom: 8px;"><strong>Location:</strong> {{appointment_location}}</li>
            <li style="margin-bottom: 8px;"><strong>Service Type:</strong> {{service_type}}</li>
            <li style="margin-bottom: 8px;"><strong>Languages:</strong> {{languages}}</li>
            <li style="margin-bottom: 8px;"><strong>Claimant:</strong> {{claimant_name}}</li>
            <li style="margin-bottom: 8px;"><strong>Rate:</strong> {{hourly_rate}}</li>
        </ul>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #856404; margin-top: 0;">⚠️ CONFIRMATION REQUIRED</h3>
        <p style="margin: 0; color: #856404; font-weight: bold;">
            You must confirm your availability for this assignment within 24 hours.
        </p>
        <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
            If you do not confirm, this assignment may be reassigned to another interpreter.
        </p>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1976d2; margin-top: 0;">Pre-Assignment Checklist</h3>
        <ul style="color: #1976d2; margin: 0; padding-left: 20px;">
            <li>Arrive 15 minutes early</li>
            <li>Bring all necessary documentation</li>
            <li>Review assignment details and location</li>
            <li>Confirm your availability below</li>
        </ul>
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
        <a href="{{interpreter_portal_link}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">
            ✓ CONFIRM AVAILABILITY
        </a>
        <a href="{{unassign_link}}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            ✗ CANNOT ATTEND
        </a>
    </div>
    
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
        <p>If you have any questions, please contact us immediately.</p>
        <p><strong>Interpreter Platform Team</strong></p>
    </div>
</div>
</body></html>',
    body_text = 'URGENT: Confirm Your Interpreter Assignment - {{appointment_date}}

Assignment Reminder & Confirmation Required
Your interpreter assignment is in 2 days

Assignment Details:
- Date: {{appointment_date}}
- Time: {{appointment_time}}
- Location: {{appointment_location}}
- Service Type: {{service_type}}
- Languages: {{languages}}
- Claimant: {{claimant_name}}
- Rate: {{hourly_rate}}

⚠️ CONFIRMATION REQUIRED
You must confirm your availability for this assignment within 24 hours.
If you do not confirm, this assignment may be reassigned to another interpreter.

Pre-Assignment Checklist:
- Arrive 15 minutes early
- Bring all necessary documentation
- Review assignment details and location
- Confirm your availability

CONFIRM AVAILABILITY: {{interpreter_portal_link}}
CANNOT ATTEND: {{unassign_link}}

If you have any questions, please contact us immediately.
Interpreter Platform Team',
    variables = '["interpreter_name", "appointment_date", "appointment_time", "appointment_location", "service_type", "languages", "claimant_name", "hourly_rate", "interpreter_portal_link", "unassign_link"]'
WHERE template_name = 'interpreter_2day_reminder';
