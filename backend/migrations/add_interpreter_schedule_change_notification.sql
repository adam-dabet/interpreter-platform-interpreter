-- Add email template for interpreter schedule change notifications
INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, variables) VALUES
('interpreter_schedule_change', 'provider_notification', 
'URGENT: Appointment Schedule Changed - {{appointment_number}}',
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #ff6b35; color: white; padding: 20px; text-align: center;">
    <h2 style="margin: 0;">⚠️ Schedule Change Notification</h2>
    <p style="margin: 5px 0 0 0; font-size: 16px;">Your assigned appointment has been modified</p>
</div>
<div style="padding: 20px; background: #f8f9fa;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Appointment Details</h3>
        <p><strong>Job Number:</strong> {{appointment_number}}</p>
        <p><strong>Title:</strong> {{appointment_title}}</p>
        <p><strong>Claimant:</strong> {{claimant_name}}</p>
        <p><strong>Location:</strong> {{appointment_location}}</p>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #856404; margin-top: 0;">⚠️ Schedule Changes</h3>
        <div style="white-space: pre-line; color: #856404;">{{changes}}</div>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1976d2; margin-top: 0;">New Schedule</h3>
        <p><strong>Date:</strong> {{new_appointment_date}}</p>
        <p><strong>Time:</strong> {{new_appointment_time}}</p>
        <p><strong>Duration:</strong> {{new_duration}} hours</p>
    </div>
    
    <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #155724; margin-top: 0;">Action Required</h3>
        <p style="color: #155724; margin: 0 0 10px 0;">
            <strong>Please confirm if you can still attend this appointment with the new schedule.</strong>
        </p>
        <p style="color: #155724; margin: 0; font-size: 14px;">
            If you cannot attend, please unassign yourself from this job as soon as possible.
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
        <a href="{{interpreter_portal_link}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">
            View in Interpreter Portal
        </a>
        <a href="{{unassign_link}}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Unassign from Job
        </a>
    </div>
    
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
        <p>This notification was sent because the customer modified the appointment schedule.</p>
    </div>
</div>
</body></html>',
'URGENT: Appointment Schedule Changed - {{appointment_number}}

Schedule Change Notification
Your assigned appointment has been modified

Appointment Details:
- Job Number: {{appointment_number}}
- Title: {{appointment_title}}
- Claimant: {{claimant_name}}
- Location: {{appointment_location}}

Schedule Changes:
{{changes}}

New Schedule:
- Date: {{new_appointment_date}}
- Time: {{new_appointment_time}}
- Duration: {{new_duration}} hours

Action Required:
Please confirm if you can still attend this appointment with the new schedule.
If you cannot attend, please unassign yourself from this job as soon as possible.

View in Interpreter Portal: {{interpreter_portal_link}}
Unassign from Job: {{unassign_link}}

This notification was sent because the customer modified the appointment schedule.',
'["appointment_number", "appointment_title", "claimant_name", "appointment_location", "changes", "new_appointment_date", "new_appointment_time", "new_duration", "interpreter_portal_link", "unassign_link"]');
