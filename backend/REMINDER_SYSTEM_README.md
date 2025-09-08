# Reminder System Documentation

## Overview

The reminder system automatically sends email reminders to claimants and interpreters for upcoming appointments. The system is designed to ensure all parties are properly notified and prepared for their scheduled appointments.

## Reminder Schedule

### Claimants
- **2-day reminder**: Sent 48 hours before the appointment

### Interpreters  
- **2-day reminder**: Sent 48 hours before the appointment
- **1-day reminder**: Sent 24 hours before the appointment  
- **2-hour reminder**: Sent 2 hours before the appointment

## System Components

### 1. Email Templates

The system uses the following email templates stored in the `email_templates` table:

- `claimant_2day_reminder` - 2-day reminder for claimants
- `interpreter_2day_reminder` - 2-day reminder for interpreters
- `interpreter_1day_reminder` - 1-day reminder for interpreters
- `interpreter_2hour_reminder` - 2-hour reminder for interpreters

### 2. Database Schema

#### Jobs Table Additions
```sql
-- Reminder tracking fields
claimant_reminder_sent BOOLEAN DEFAULT FALSE
claimant_reminder_sent_at TIMESTAMP
interpreter_2day_reminder_sent BOOLEAN DEFAULT FALSE
interpreter_2day_reminder_sent_at TIMESTAMP
interpreter_1day_reminder_sent BOOLEAN DEFAULT FALSE
interpreter_1day_reminder_sent_at TIMESTAMP
interpreter_2hour_reminder_sent BOOLEAN DEFAULT FALSE
interpreter_2hour_reminder_sent_at TIMESTAMP
```

#### Email Types
```sql
-- Added to email_type_enum
'claimant_reminder'
'interpreter_reminder'
```

### 3. Core Services

#### ReminderService (`src/services/reminderService.js`)
- `getJobsNeedingReminders()` - Retrieves jobs eligible for reminders
- `sendClaimantReminder()` - Sends 2-day reminder to claimants
- `sendInterpreter2DayReminder()` - Sends 2-day reminder to interpreters
- `sendInterpreter1DayReminder()` - Sends 1-day reminder to interpreters
- `sendInterpreter2HourReminder()` - Sends 2-hour reminder to interpreters
- `processReminders()` - Main method to process all pending reminders

#### ReminderController (`src/controllers/reminderController.js`)
- `processReminders()` - API endpoint for manual reminder processing
- `getJobReminderStatus()` - Get reminder status for a specific job
- `getUpcomingReminders()` - Get list of jobs needing reminders

### 4. Scripts

#### Manual Processing Script (`scripts/processReminders.js`)
```bash
# Run reminder processing manually
node scripts/processReminders.js
```

#### Cron Setup Script (`scripts/setupReminderCron.sh`)
```bash
# Set up automated hourly processing
./scripts/setupReminderCron.sh
```

## Usage

### Manual Processing

Run the reminder processing script manually:
```bash
cd backend
node scripts/processReminders.js
```

### Automated Processing

Set up a cron job to run every hour:
```bash
cd backend
./scripts/setupReminderCron.sh
```

This will create a cron job that runs at minute 0 of every hour.

### API Endpoints

#### Process Reminders (Admin Only)
```http
POST /api/admin/reminders/process
Authorization: Bearer <admin_token>
```

#### Get Upcoming Reminders (Admin Only)
```http
GET /api/admin/reminders/upcoming
Authorization: Bearer <admin_token>
```

#### Get Job Reminder Status (Admin Only)
```http
GET /api/admin/reminders/job/:jobId
Authorization: Bearer <admin_token>
```

## Reminder Logic

### Job Eligibility
Jobs are eligible for reminders if they:
- Have status = 'assigned'
- Have an assigned interpreter
- Are scheduled within the next 2 days
- Are active (is_active = true)

### Timing Windows
- **2-day reminders**: Sent when appointment is 24-48 hours away
- **1-day reminders**: Sent when appointment is 2-24 hours away  
- **2-hour reminders**: Sent when appointment is 0-2 hours away

### Email Validation
- Claimant reminders require a valid `client_email` in the jobs table
- Interpreter reminders require a valid `email` in the interpreters table
- Jobs without email addresses are skipped with appropriate logging

### Duplicate Prevention
- Each reminder type can only be sent once per job
- Database fields track when each reminder was sent
- System checks these fields before sending reminders

## Email Templates

### Template Variables

All templates support the following variables:
- `{{claimant_name}}` - Full name of the claimant
- `{{interpreter_name}}` - Full name of the interpreter  
- `{{appointment_date}}` - Formatted appointment date
- `{{appointment_time}}` - Appointment time
- `{{appointment_location}}` - Location or "Remote"
- `{{service_type}}` - Type of service
- `{{languages}}` - Language pair (e.g., "Spanish → English")
- `{{hourly_rate}}` - Hourly rate for interpreter

### Template Examples

#### Claimant 2-Day Reminder
```
Subject: Reminder: Your Interpreter Appointment in 2 Days

Dear {{claimant_name}},

This is a friendly reminder that you have an interpreter appointment scheduled:

Date: {{appointment_date}}
Time: {{appointment_time}}
Location: {{appointment_location}}
Service Type: {{service_type}}
Languages: {{languages}}

Please ensure you are available at the scheduled time.
```

#### Interpreter 2-Hour Reminder
```
Subject: Final Reminder: Your Interpreter Assignment in 2 Hours

Dear {{interpreter_name}},

This is your final reminder that you have an interpreter assignment starting in 2 hours:

Date: {{appointment_date}}
Time: {{appointment_time}}
Location: {{appointment_location}}
Service Type: {{service_type}}
Languages: {{languages}}
Claimant: {{claimant_name}}
Rate: {{hourly_rate}}

Please ensure you are on your way and have all necessary documentation.
```

## Monitoring and Logging

### Log Categories
- `REMINDER` - All reminder-related activities
- `EMAIL` - Email sending activities

### Log Information
- Job ID and appointment details
- Email addresses (for tracking)
- Success/failure status
- Error details when applicable

### Database Tracking
- All reminder sends are logged in the database
- Timestamps track when each reminder was sent
- Boolean flags prevent duplicate sends

## Error Handling

### Common Issues
1. **Missing Email Addresses**: Jobs without email addresses are skipped
2. **Invalid Email Templates**: System logs errors and continues processing
3. **Database Connection Issues**: Script exits with error code 1
4. **Email Service Failures**: Errors are logged but don't stop processing

### Recovery
- Failed reminders can be retried by running the script again
- Database tracking prevents duplicate sends
- Logs provide detailed error information for debugging

## Configuration

### Environment Variables
- Standard email service configuration applies
- Database connection settings from existing configuration
- Logging configuration from existing setup

### Customization
- Reminder timing can be adjusted in the service methods
- Email templates can be modified in the database
- Additional reminder types can be added by extending the service

## Testing

### Manual Testing
```bash
# Test with a job scheduled for tomorrow
node scripts/processReminders.js
```

### Verification
- Check email queue for queued emails
- Verify database fields are updated
- Review logs for processing summary

## Maintenance

### Regular Tasks
- Monitor email queue processing
- Review reminder logs for errors
- Update email templates as needed
- Verify cron job is running

### Troubleshooting
- Check database connectivity
- Verify email service configuration
- Review job data for missing email addresses
- Check cron job status and logs
