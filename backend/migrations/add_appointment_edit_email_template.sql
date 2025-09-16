-- Add email template for appointment edit notifications
INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, variables) VALUES
('appointment_edited', 'admin_notification', 
'Appointment Edited: {{appointment_number}}',
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #ff6b35; color: white; padding: 20px; text-align: center;">
    <h2 style="margin: 0;">Appointment Edited</h2>
</div>
<div style="padding: 20px; background: #f8f9fa;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Appointment Details</h3>
        <p><strong>Appointment:</strong> {{appointment_number}}</p>
        <p><strong>Date:</strong> {{appointment_date}}</p>
        <p><strong>Time:</strong> {{appointment_time}}</p>
        <p><strong>Claimant:</strong> {{claimant_name}}</p>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Customer Information</h3>
        <p><strong>Name:</strong> {{customer_name}}</p>
        <p><strong>Company:</strong> {{customer_company}}</p>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #856404; margin-top: 0;">Changes Made</h3>
        <div style="white-space: pre-line; color: #856404;">{{changes}}</div>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
        <p style="margin: 0; color: #1976d2;">
            <strong>Edit Time:</strong> {{edit_time}}
        </p>
        <p style="margin: 5px 0 0 0; color: #1976d2; font-size: 14px;">
            Please review these changes in the admin portal.
        </p>
    </div>
</div>
</body></html>',
'Appointment Edited: {{appointment_number}}

Appointment Details:
- Appointment: {{appointment_number}}
- Date: {{appointment_date}}
- Time: {{appointment_time}}
- Claimant: {{claimant_name}}

Customer Information:
- Name: {{customer_name}}
- Company: {{customer_company}}

Changes Made:
{{changes}}

Edit Time: {{edit_time}}

Please review these changes in the admin portal.',
'["appointment_number", "appointment_date", "appointment_time", "claimant_name", "customer_name", "customer_company", "changes", "edit_time"]');
