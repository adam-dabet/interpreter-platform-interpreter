# Magic Link System for Job Timing

## Overview

The Magic Link System allows interpreters to start and end their job timing without requiring login credentials. This system is designed to provide a seamless experience for interpreters who need quick access to job timing controls, especially when they're on-site or in situations where logging in is inconvenient.

## Features

- **Secure Token-Based Access**: Each magic link contains a unique, time-limited token
- **No Login Required**: Interpreters can access job timing directly via the magic link
- **Real-Time Updates**: Job status changes are immediately reflected in the admin portal
- **Automatic Expiration**: Magic links expire after 24 hours for security
- **Email Integration**: Magic links are automatically sent via email reminders

## System Architecture

### Database Schema

#### `job_magic_links` Table
```sql
CREATE TABLE job_magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_for_start BOOLEAN DEFAULT FALSE,
    used_for_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Job Timing Fields
```sql
ALTER TABLE jobs 
ADD COLUMN job_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN job_ended_at TIMESTAMP WITH TIME ZONE;
```

### API Endpoints

#### Magic Link Validation
```
GET /api/magic-link/validate/:token
```
Returns job information and current status for a valid magic link.

#### Start Job
```
POST /api/magic-link/start/:token
```
Starts a job and updates the status to 'in_progress'.

#### End Job
```
POST /api/magic-link/end/:token
```
Ends a job and updates the status to 'completed'.

#### Cleanup Expired Links
```
POST /api/magic-link/cleanup
```
Removes expired magic links from the database.

### Frontend Components

#### JobTimer Component
- **Location**: `frontend/src/pages/JobTimer.js`
- **Route**: `/job-timer/:token`
- **Features**:
  - Real-time job status display
  - Start/End job buttons
  - Live timer for in-progress jobs
  - Success/error messaging
  - Responsive design

## Email Integration

### 5-Minute Reminder Email
- **Template**: `interpreter-5minute-reminder`
- **Trigger**: 5 minutes before appointment time
- **Content**: Includes magic link for job timing
- **Features**:
  - Urgent styling with countdown
  - Direct access to job timer
  - Appointment details
  - Security notice about link expiration

### Email Template Variables
```javascript
{
  interpreterName: "John Doe",
  jobTitle: "Medical Appointment",
  appointmentDate: "Monday, September 9, 2024",
  appointmentTime: "2:00 PM",
  location: "123 Main St, City, State",
  magicLinkUrl: "http://localhost:3000/job-timer/abc123...",
  serviceType: "Medical Certified"
}
```

## Security Features

### Token Security
- **Random Generation**: 64-character hexadecimal tokens
- **Time-Limited**: 24-hour expiration
- **Single-Use Tracking**: Tracks start/end usage separately
- **Automatic Cleanup**: Expired tokens are removed

### Access Control
- **Job Validation**: Only assigned interpreters can use the link
- **Status Validation**: Jobs must be in correct status for timing actions
- **Expiration Checking**: Links are validated on each request

## Usage Workflow

### 1. Magic Link Generation
```javascript
// When 5-minute reminder is sent
const magicLink = await magicLinkService.createMagicLink(jobId, interpreterId);
const magicLinkUrl = magicLinkService.getMagicLinkUrl(magicLink.token);
```

### 2. Email Sending
```javascript
const emailData = {
  to: interpreterEmail,
  subject: 'Your appointment starts in 5 minutes',
  template: 'interpreter-5minute-reminder',
  data: {
    magicLinkUrl: magicLinkUrl,
    // ... other template variables
  }
};
```

### 3. Job Timing
1. Interpreter clicks magic link in email
2. JobTimer page loads with job information
3. Interpreter clicks "Start Job" when appointment begins
4. Real-time timer shows elapsed time
5. Interpreter clicks "End Job" when appointment ends
6. Success confirmation and duration display

## Admin Integration

### Reminder Management
- **5-Minute Reminder Button**: Available in admin job workflow
- **Status Tracking**: Shows if magic link has been sent
- **Real-Time Updates**: Job status changes immediately in admin portal

### Monitoring
- **Logging**: All magic link activities are logged
- **Notifications**: Admin receives notifications when jobs start/end
- **Audit Trail**: Complete history of job timing events

## Maintenance

### Cleanup Script
```bash
# Run cleanup manually
node scripts/cleanupMagicLinks.js

# Or via API
POST /api/magic-link/cleanup
```

### Monitoring
- Check for expired links: `SELECT COUNT(*) FROM job_magic_links WHERE expires_at < NOW();`
- Monitor usage: `SELECT * FROM job_magic_links WHERE used_for_start = TRUE OR used_for_end = TRUE;`

## Error Handling

### Common Issues
1. **Expired Link**: "Invalid or expired magic link"
2. **Already Started**: "Job has already been started"
3. **Not Started**: "Job has not been started yet"
4. **Invalid Status**: "Job is not in a state that allows starting"

### Troubleshooting
- Check token expiration: `SELECT * FROM job_magic_links WHERE token = '...';`
- Verify job status: `SELECT status FROM jobs WHERE id = '...';`
- Check interpreter assignment: `SELECT assigned_interpreter_id FROM jobs WHERE id = '...';`

## Testing

### Manual Testing
1. Create a test job with assigned interpreter
2. Manually trigger 5-minute reminder
3. Click magic link in email
4. Test start/end functionality
5. Verify admin portal updates

### Automated Testing
```javascript
// Test magic link creation
const magicLink = await magicLinkService.createMagicLink(jobId, interpreterId);
expect(magicLink.token).toBeDefined();
expect(magicLink.expiresAt).toBeDefined();

// Test validation
const validation = await magicLinkService.validateMagicLink(magicLink.token);
expect(validation.job_id).toBe(jobId);
```

## Configuration

### Environment Variables
```env
# Base URL for magic links (used in email templates)
MAGIC_LINK_BASE_URL=http://localhost:3000

# Token expiration (in hours)
MAGIC_LINK_EXPIRY_HOURS=24
```

### Email Service
Ensure email service is configured and templates are loaded:
```sql
SELECT * FROM email_templates WHERE template_name = 'interpreter-5minute-reminder';
```

## Future Enhancements

### Potential Improvements
1. **SMS Integration**: Send magic links via SMS
2. **QR Codes**: Generate QR codes for easy mobile access
3. **Push Notifications**: Real-time notifications for job status changes
4. **Offline Support**: Cache job data for offline timing
5. **Multi-Language**: Support for multiple languages in timer interface

### Performance Optimizations
1. **Token Caching**: Cache valid tokens in Redis
2. **Batch Cleanup**: Process expired links in batches
3. **Connection Pooling**: Optimize database connections
4. **CDN Integration**: Serve static assets via CDN

## Support

For issues or questions about the Magic Link System:
1. Check the logs: `SELECT * FROM activity_logs WHERE category = 'MAGIC_LINK';`
2. Verify email delivery: Check email service logs
3. Test API endpoints: Use Postman or curl
4. Contact development team with specific error messages

## Changelog

### Version 1.0.0
- Initial implementation of magic link system
- 5-minute reminder email integration
- JobTimer React component
- Admin portal integration
- Security and cleanup features
