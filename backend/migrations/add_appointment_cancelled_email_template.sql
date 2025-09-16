-- Add appointment cancelled email template
INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, variables) VALUES
('appointment_cancelled', 'admin_notification',
'Appointment Cancelled: {{appointment_number}} by {{customer_name}}',
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center;">
    <h1 style="font-size: 24px; margin-bottom: 10px;">Appointment Cancelled!</h1>
    <p style="font-size: 16px;">A customer has cancelled an appointment.</p>
</div>
<div style="padding: 20px; background-color: #f9f9f9; border: 1px solid #e0e0e0;">
    <p>Hello Admin Team,</p>
    <p>This is an automated notification to inform you that an appointment has been cancelled by a customer.</p>
    
    <h3 style="color: #333; margin-top: 20px;">Customer Details:</h3>
    <ul>
        <li><strong>Name:</strong> {{customer_name}}</li>
        <li><strong>Company:</strong> {{customer_company}}</li>
    </ul>

    <h3 style="color: #333; margin-top: 20px;">Cancelled Appointment Details:</h3>
    <ul>
        <li><strong>Job Number:</strong> {{appointment_number}}</li>
        <li><strong>Title:</strong> {{appointment_title}}</li>
        <li><strong>Scheduled Date:</strong> {{appointment_date}}</li>
        <li><strong>Scheduled Time:</strong> {{appointment_time}}</li>
        <li><strong>Claimant:</strong> {{claimant_name}}</li>
    </ul>

    <p style="margin-top: 20px;">Please review the cancellation in the admin portal and take any necessary follow-up actions.</p>
    <p>Thank you,<br/>Interpreter Platform</p>
</div>
<div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
    <p>&copy; 2025 Interpreter Platform. All rights reserved.</p>
</div>
</body></html>',
'Appointment Cancelled: {{appointment_number}} by {{customer_name}}\n\n' ||
'Hello Admin Team,\n\n' ||
'This is an automated notification to inform you that an appointment has been cancelled by a customer.\n\n' ||
'Customer Details:\n' ||
'Name: {{customer_name}}\n' ||
'Company: {{customer_company}}\n\n' ||
'Cancelled Appointment Details:\n' ||
'Job Number: {{appointment_number}}\n' ||
'Title: {{appointment_title}}\n' ||
'Scheduled Date: {{appointment_date}}\n' ||
'Scheduled Time: {{appointment_time}}\n' ||
'Claimant: {{claimant_name}}\n\n' ||
'Please review the cancellation in the admin portal and take any necessary follow-up actions.\n\n' ||
'Thank you,\nInterpreter Platform',
'["customer_name", "customer_company", "appointment_number", "appointment_title", "appointment_date", "appointment_time", "claimant_name"]'
);
