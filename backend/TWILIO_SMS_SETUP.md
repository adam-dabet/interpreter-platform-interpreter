# Twilio SMS Setup Guide

This guide explains how to set up Twilio SMS for sending reminder notifications.

## Prerequisites

1. **Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)
2. **Phone Number**: Purchase a Twilio phone number for sending SMS
3. **Account Credentials**: Get your Account SID and Auth Token

## Environment Variables

Add these variables to your `.env` file:

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Getting Your Twilio Credentials

1. **Account SID & Auth Token**:
   - Log into your Twilio Console
   - Go to Dashboard
   - Copy "Account SID" and "Auth Token"

2. **Phone Number**:
   - Go to Phone Numbers > Manage > Active Numbers
   - Purchase a phone number if you don't have one
   - Copy the phone number (format: +1234567890)

## SMS Features

The SMS service will send reminders for:

- **Claimant 2-day reminders** (if `client_phone` is provided)
- **Interpreter 2-day reminders** (if `interpreter_phone` is provided)
- **Interpreter 1-day reminders** (if `interpreter_phone` is provided)
- **Interpreter 2-hour reminders** (if `interpreter_phone` is provided)
- **Interpreter 5-minute reminders** (if `interpreter_phone` is provided)

## SMS Message Format

Messages are automatically formatted with:
- Appointment title
- Date and time
- Location (or "Remote")
- Appropriate urgency level (emojis)

Example:
```
📅 INTERPRETER REMINDER: You have an appointment "Medical Consultation" on Friday, September 12, 2025 at 12:02 PM. Location: 123 Main St, City, State. Please confirm your availability.
```

## Testing

1. Set up your environment variables
2. Restart the backend server
3. Run the reminder script: `node scripts/processReminders.js`
4. Check the logs for SMS delivery status

## Troubleshooting

- **"Twilio not configured"**: Check your environment variables
- **"Invalid phone number"**: Ensure phone numbers are in correct format
- **SMS not sending**: Check Twilio account balance and phone number verification
- **Rate limits**: Twilio has rate limits; check your account status

## Cost Considerations

- SMS messages cost approximately $0.0075 per message
- Consider implementing rate limiting for high-volume applications
- Monitor your Twilio usage in the console
