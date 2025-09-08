# Testing Automatic Reminders Guide

## Overview

This guide shows you how to test the automatic reminder system to ensure reminders are sent at the correct times based on appointment schedules.

## Testing Methods

### Method 1: Create Test Jobs with Future Appointments

#### Step 1: Create a Test Job
```sql
-- Create a test job scheduled for tomorrow (1 day from now)
INSERT INTO jobs (
  id, title, description, scheduled_date, scheduled_time,
  status, assigned_interpreter_id, claimant_id, client_email,
  service_type_id, source_language_id, target_language_id,
  hourly_rate, is_active
) VALUES (
  gen_random_uuid(),
  'Test Reminder Job - 1 Day',
  'Testing 1-day reminder system',
  CURRENT_DATE + INTERVAL '1 day',
  '14:00:00',
  'assigned',
  38, -- Your interpreter ID
  1,  -- Your claimant ID
  'test@example.com',
  30, -- Service type ID
  1,  -- Source language ID
  2,  -- Target language ID
  50.00,
  true
);
```

#### Step 2: Create Jobs for Different Time Windows
```sql
-- Job for 2-day reminder (2 days from now)
INSERT INTO jobs (
  id, title, description, scheduled_date, scheduled_time,
  status, assigned_interpreter_id, claimant_id, client_email,
  service_type_id, source_language_id, target_language_id,
  hourly_rate, is_active
) VALUES (
  gen_random_uuid(),
  'Test Reminder Job - 2 Days',
  'Testing 2-day reminder system',
  CURRENT_DATE + INTERVAL '2 days',
  '10:00:00',
  'assigned',
  38,
  1,
  'test@example.com',
  30, 1, 2, 50.00, true
);

-- Job for 2-hour reminder (2 hours from now)
INSERT INTO jobs (
  id, title, description, scheduled_date, scheduled_time,
  status, assigned_interpreter_id, claimant_id, client_email,
  service_type_id, source_language_id, target_language_id,
  hourly_rate, is_active
) VALUES (
  gen_random_uuid(),
  'Test Reminder Job - 2 Hours',
  'Testing 2-hour reminder system',
  CURRENT_DATE,
  (CURRENT_TIME + INTERVAL '2 hours')::time,
  'assigned',
  38,
  1,
  'test@example.com',
  30, 1, 2, 50.00, true
);
```

### Method 2: Modify Existing Job Times

#### Update the Acupuncture Job for Testing
```sql
-- Set acupuncture job to 2 hours from now for 2-hour reminder testing
UPDATE jobs 
SET scheduled_date = CURRENT_DATE,
    scheduled_time = (CURRENT_TIME + INTERVAL '2 hours')::time,
    claimant_reminder_sent = false,
    interpreter_2day_reminder_sent = false,
    interpreter_1day_reminder_sent = false,
    interpreter_2hour_reminder_sent = false,
    status = 'assigned'
WHERE id = '020cb8bc-38db-4a30-b663-95bad6a321d5';
```

### Method 3: Run Reminder Processing Script

#### Manual Testing
```bash
# Run the reminder processing script
cd backend
node scripts/processReminders.js
```

#### Expected Output for Different Scenarios:

**For 2-hour reminder (job in 2 hours):**
```
Email queued: interpreter_2hour_reminder to adam@theintegritycompanyinc.com
info: Interpreter 2-hour reminder sent
```

**For 1-day reminder (job tomorrow):**
```
Email queued: interpreter_1day_reminder to adam@theintegritycompanyinc.com
info: Interpreter 1-day reminder sent
```

**For 2-day reminder (job day after tomorrow):**
```
Email queued: claimant_2day_reminder to test@example.com
Email queued: interpreter_2day_reminder to adam@theintegritycompanyinc.com
info: Claimant reminder sent
info: Interpreter 2-day reminder sent
```

### Method 4: Check Email Queue

#### Verify Reminders Were Queued
```sql
-- Check recent reminder emails
SELECT 
  template_name,
  to_email,
  subject,
  status,
  created_at
FROM email_queue 
WHERE template_name LIKE '%reminder%'
ORDER BY created_at DESC
LIMIT 10;
```

#### Check Job Reminder Status
```sql
-- Check which reminders were sent for specific jobs
SELECT 
  id,
  title,
  scheduled_date,
  scheduled_time,
  claimant_reminder_sent,
  interpreter_2day_reminder_sent,
  interpreter_1day_reminder_sent,
  interpreter_2hour_reminder_sent,
  status
FROM jobs 
WHERE title LIKE '%Test Reminder%' OR id = '020cb8bc-38db-4a30-b663-95bad6a321d5';
```

### Method 5: Automated Testing with Cron

#### Set Up Test Cron Job
```bash
# Create a test cron job that runs every minute (for testing only)
cd backend
echo "* * * * * cd $(pwd) && node scripts/processReminders.js >> /tmp/reminder_test.log 2>&1" | crontab -

# Monitor the log
tail -f /tmp/reminder_test.log
```

#### Remove Test Cron Job
```bash
# Remove the test cron job when done
crontab -r
```

### Method 6: API Testing

#### Test Individual Reminder Endpoints
```bash
# Test claimant reminder
curl -X POST "http://localhost:3001/api/admin/reminders/job/JOB_ID/claimant" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Test interpreter 2-day reminder
curl -X POST "http://localhost:3001/api/admin/reminders/job/JOB_ID/interpreter-2day" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Test interpreter 1-day reminder
curl -X POST "http://localhost:3001/api/admin/reminders/job/JOB_ID/interpreter-1day" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Test interpreter 2-hour reminder
curl -X POST "http://localhost:3001/api/admin/reminders/job/JOB_ID/interpreter-2hour" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Testing Scenarios

### Scenario 1: 2-Day Reminder Window
- **Setup**: Create job scheduled 25-48 hours from now
- **Expected**: Only claimant and interpreter 2-day reminders should be sent
- **Test**: Run reminder script and verify only 2-day reminders are queued

### Scenario 2: 1-Day Reminder Window  
- **Setup**: Create job scheduled 2-24 hours from now
- **Expected**: Only interpreter 1-day reminder should be sent
- **Test**: Run reminder script and verify only 1-day reminder is queued

### Scenario 3: 2-Hour Reminder Window
- **Setup**: Create job scheduled 0-2 hours from now
- **Expected**: Only interpreter 2-hour reminder should be sent
- **Test**: Run reminder script and verify only 2-hour reminder is queued

### Scenario 4: Outside Reminder Windows
- **Setup**: Create job scheduled more than 48 hours from now
- **Expected**: No reminders should be sent
- **Test**: Run reminder script and verify no reminders are queued

### Scenario 5: Already Sent Reminders
- **Setup**: Use existing job with reminders already sent
- **Expected**: No duplicate reminders should be sent
- **Test**: Run reminder script and verify no new reminders are queued

## Verification Steps

### 1. Check Email Queue
```sql
-- Count reminders by type
SELECT 
  template_name,
  COUNT(*) as count,
  MAX(created_at) as latest_sent
FROM email_queue 
WHERE template_name LIKE '%reminder%'
GROUP BY template_name
ORDER BY latest_sent DESC;
```

### 2. Check Job Status Updates
```sql
-- Verify job status changes
SELECT 
  id,
  title,
  status,
  claimant_reminder_sent,
  interpreter_2day_reminder_sent,
  interpreter_1day_reminder_sent,
  interpreter_2hour_reminder_sent
FROM jobs 
WHERE status = 'reminders_sent' OR 
      claimant_reminder_sent = true OR
      interpreter_2day_reminder_sent = true OR
      interpreter_1day_reminder_sent = true OR
      interpreter_2hour_reminder_sent = true;
```

### 3. Check Logs
```bash
# Check application logs for reminder activities
grep -i "reminder" /var/log/your-app.log

# Or check the reminder processing log
tail -f /tmp/reminder_test.log
```

## Troubleshooting

### Common Issues

1. **No Reminders Sent**
   - Check if jobs have valid email addresses
   - Verify job status is 'assigned'
   - Ensure jobs are within reminder time windows

2. **Wrong Reminders Sent**
   - Check appointment times vs current time
   - Verify reminder logic in ReminderService

3. **Duplicate Reminders**
   - Check if reminder flags are properly set
   - Verify database constraints

### Debug Commands

```bash
# Check current time vs appointment times
psql -d interpreter_platform -c "
SELECT 
  id, title, scheduled_date, scheduled_time,
  (scheduled_date + scheduled_time) as appointment_datetime,
  NOW() as current_time,
  EXTRACT(EPOCH FROM ((scheduled_date + scheduled_time) - NOW()))/3600 as hours_until_appointment
FROM jobs 
WHERE status = 'assigned' 
ORDER BY scheduled_date, scheduled_time;
"

# Check reminder eligibility
psql -d interpreter_platform -c "
SELECT 
  id, title, status, assigned_interpreter_id,
  claimant_reminder_sent, interpreter_2day_reminder_sent,
  interpreter_1day_reminder_sent, interpreter_2hour_reminder_sent
FROM jobs 
WHERE status = 'assigned' 
  AND assigned_interpreter_id IS NOT NULL
  AND scheduled_date >= CURRENT_DATE
  AND scheduled_date <= CURRENT_DATE + INTERVAL '2 days';
"
```

## Production Testing

### Safe Production Testing
1. Create test jobs with your own email address
2. Use non-production email templates
3. Test during off-peak hours
4. Monitor email queue and logs closely
5. Clean up test data after testing

### Monitoring in Production
```bash
# Set up monitoring for reminder processing
# Add to your monitoring system:
# - Email queue size
# - Reminder processing success rate
# - Failed reminder attempts
# - Job status transitions
```

This comprehensive testing approach will help you verify that the automatic reminder system is working correctly across all scenarios!
