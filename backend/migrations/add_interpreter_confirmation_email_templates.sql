-- Add email templates for interpreter confirmation system

-- Template for when interpreter confirms availability
INSERT INTO email_templates (
    template_name,
    template_type,
    subject,
    body_html,
    body_text,
    variables
) VALUES (
    'interpreter_confirmed_schedule_change',
    'admin_notification',
    'Interpreter Confirmed Availability - {{job_number}}',
    '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #10b981; color: white; padding: 20px; text-align: center;">
    <h2 style="margin: 0;">Interpreter Confirmed Availability</h2>
</div>
<div style="padding: 20px; background: #f8f9fa;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Appointment Details</h3>
        <p><strong>Job Number:</strong> {{job_number}}</p>
        <p><strong>Title:</strong> {{job_title}}</p>
        <p><strong>Date:</strong> {{appointment_date}}</p>
        <p><strong>Time:</strong> {{appointment_time}}</p>
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Billing Account:</strong> {{customer_company}}</p>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Interpreter Information</h3>
        <p><strong>Name:</strong> {{interpreter_name}}</p>
        <p><strong>Email:</strong> {{interpreter_email}}</p>
        <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">CONFIRMED</span></p>
        {{#if confirmation_notes}}
        <p><strong>Notes:</strong> {{confirmation_notes}}</p>
        {{/if}}
    </div>
    
    <div style="background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 8px;">
        <p style="margin: 0; color: #065f46; font-weight: bold;">
            ✓ The interpreter has confirmed they can still make the appointment with the new schedule.
        </p>
    </div>
</div>
</body></html>',
    'Interpreter Confirmed Availability - {{job_number}}\n\n' ||
    'Appointment Details:\n' ||
    '- Job Number: {{job_number}}\n' ||
    '- Title: {{job_title}}\n' ||
    '- Date: {{appointment_date}}\n' ||
    '- Time: {{appointment_time}}\n' ||
    '- Customer: {{customer_name}}\n' ||
    '- Billing Account: {{customer_company}}\n\n' ||
    'Interpreter Information:\n' ||
    '- Name: {{interpreter_name}}\n' ||
    '- Email: {{interpreter_email}}\n' ||
    '- Status: CONFIRMED\n' ||
    '{{#if confirmation_notes}}- Notes: {{confirmation_notes}}{{/if}}\n\n' ||
    'The interpreter has confirmed they can still make the appointment with the new schedule.',
    '["job_number", "job_title", "appointment_date", "appointment_time", "customer_name", "customer_company", "interpreter_name", "interpreter_email", "confirmation_notes"]'
);

-- Template for when interpreter declines availability
INSERT INTO email_templates (
    template_name,
    template_type,
    subject,
    body_html,
    body_text,
    variables
) VALUES (
    'interpreter_declined_schedule_change',
    'admin_notification',
    'Interpreter Declined Availability - {{job_number}}',
    '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #ef4444; color: white; padding: 20px; text-align: center;">
    <h2 style="margin: 0;">Interpreter Declined Availability</h2>
</div>
<div style="padding: 20px; background: #f8f9fa;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Appointment Details</h3>
        <p><strong>Job Number:</strong> {{job_number}}</p>
        <p><strong>Title:</strong> {{job_title}}</p>
        <p><strong>Date:</strong> {{appointment_date}}</p>
        <p><strong>Time:</strong> {{appointment_time}}</p>
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Billing Account:</strong> {{customer_company}}</p>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Interpreter Information</h3>
        <p><strong>Name:</strong> {{interpreter_name}}</p>
        <p><strong>Email:</strong> {{interpreter_email}}</p>
        <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">DECLINED</span></p>
        <p><strong>Reason:</strong> {{decline_reason}}</p>
    </div>
    
    <div style="background: #fef2f2; border: 1px solid #ef4444; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #dc2626; font-weight: bold;">
            ⚠️ The interpreter has declined the appointment due to the schedule change.
        </p>
        <p style="margin: 5px 0 0 0; color: #dc2626;">
            The job status has been changed back to "Finding Interpreter" and you may need to assign a new interpreter.
        </p>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
        <p style="margin: 0; color: #1976d2; font-weight: bold;">
            Action Required: Please assign a new interpreter to this job.
        </p>
    </div>
</div>
</body></html>',
    'Interpreter Declined Availability - {{job_number}}\n\n' ||
    'Appointment Details:\n' ||
    '- Job Number: {{job_number}}\n' ||
    '- Title: {{job_title}}\n' ||
    '- Date: {{appointment_date}}\n' ||
    '- Time: {{appointment_time}}\n' ||
    '- Customer: {{customer_name}}\n' ||
    '- Billing Account: {{customer_company}}\n\n' ||
    'Interpreter Information:\n' ||
    '- Name: {{interpreter_name}}\n' ||
    '- Email: {{interpreter_email}}\n' ||
    '- Status: DECLINED\n' ||
    '- Reason: {{decline_reason}}\n\n' ||
    'The interpreter has declined the appointment due to the schedule change.\n' ||
    'The job status has been changed back to "Finding Interpreter" and you may need to assign a new interpreter.\n\n' ||
    'Action Required: Please assign a new interpreter to this job.',
    '["job_number", "job_title", "appointment_date", "appointment_time", "customer_name", "customer_company", "interpreter_name", "interpreter_email", "decline_reason"]'
);
