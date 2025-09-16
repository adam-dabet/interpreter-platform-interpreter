-- Migration: Add invoice email template
-- Date: 2024-12-19
-- Description: Adds email template for sending invoices when jobs are marked as billed

-- Insert invoice email template
INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, variables) VALUES
('invoice_email', 'billing', 
'Integrity Invoice: {{caseClaimNumber}} {{claimantFirstName}} {{claimantLastName}} - Interpreter Order - {{jobName}}',
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #f8f9fa; padding: 30px;">
    <h1 style="color: #333; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Invoice</h1>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p><strong>Re:</strong> Interpreter Services</p>
        <br>
        <p><strong>Claim/Case #:</strong> {{caseClaimNumber}}</p>
        <p><strong>Claimant Name:</strong> {{claimantFirstName}} {{claimantLastName}} {{claimantName}}</p>
        <p><strong>Billing Reference:</strong> {{billingReference}}</p>
        <p><strong>Billing Company:</strong> {{billingCompany}}</p>
        <br>
        <p><strong>Language:</strong> {{language}}</p>
        <p><strong>Integrity Order #:</strong> {{jobName}}</p>
        <p><strong>Order Status:</strong> Billed</p>
        <br>
        <p>Please find attached invoice for interpreter {{jobName}}</p>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; border-left: 4px solid #2196f3; margin-bottom: 20px;">
        <p style="margin: 0; color: #1976d2;">
            <strong>Contact Information:</strong><br>
            If you have any questions or would like to request additional services please reply to this e-mail or call 888-418-2565.
        </p>
    </div>
    
    <div style="text-align: center; margin: 20px 0;">
        <p>Thank you,</p>
        <p><strong>Integrity Interpreting Services</strong></p>
    </div>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-top: 20px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">We provide:</p>
        <ul style="margin: 0; padding-left: 20px;">
            <li>Transportation</li>
            <li>DME</li>
            <li>On-Site Interpreting</li>
            <li>Over-the-Phone Interpreting</li>
            <li>Translations</li>
            <li>Video Interpreting</li>
        </ul>
    </div>
</div>

<div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 14px;">
    <p>This is an automated invoice from Integrity Interpreting Services.</p>
    <p>Please do not reply to this email.</p>
</div>
</body></html>',
'Integrity Invoice: {{caseClaimNumber}} {{claimantFirstName}} {{claimantLastName}} - Interpreter Order - {{jobName}}

Re: Interpreter Services

Claim/Case #: {{caseClaimNumber}}

Claimant Name: {{claimantFirstName}} {{claimantLastName}} {{claimantName}}

Billing Reference: {{billingReference}}

Billing Company: {{billingCompany}}

Language: {{language}}

Integrity Order # {{jobName}}

Order Status: Billed

Please find attached invoice for interpreter {{jobName}}

If you have any questions or would like to request additional services please reply to this e-mail or call 888-418-2565.

Thank you,

Integrity Interpreting Services

We provide:
*Transportation *DME *On-Site Interpreting *Over-the-Phone Interpreting *Translations *Video Interpreting

This is an automated invoice from Integrity Interpreting Services.
Please do not reply to this email.',
'["caseClaimNumber", "claimantFirstName", "claimantLastName", "claimantName", "billingReference", "billingCompany", "language", "jobName"]')
ON CONFLICT (template_name) DO UPDATE SET
    template_type = EXCLUDED.template_type,
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text,
    variables = EXCLUDED.variables,
    updated_at = CURRENT_TIMESTAMP;

-- Add comment
COMMENT ON TABLE email_templates IS 'Email templates for various system notifications including invoices';
