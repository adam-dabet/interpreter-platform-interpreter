#!/bin/bash

# Setup Reminder Cron Job Script
# This script sets up a cron job to run reminder processing every hour

echo "Setting up reminder processing cron job..."

# Get the current directory (backend directory)
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="$BACKEND_DIR/scripts/processReminders.js"

# Make the script executable
chmod +x "$SCRIPT_PATH"

# Create a temporary cron file
TEMP_CRON_FILE="/tmp/reminder_cron_$$"

# Add the reminder processing job to run every hour
# This will run at minute 0 of every hour (e.g., 1:00, 2:00, 3:00, etc.)
echo "0 * * * * cd $BACKEND_DIR && node $SCRIPT_PATH >> /var/log/reminder_processing.log 2>&1" > "$TEMP_CRON_FILE"

# Add the cron job
crontab "$TEMP_CRON_FILE"

# Clean up
rm "$TEMP_CRON_FILE"

echo "✅ Reminder processing cron job has been set up!"
echo "📅 The job will run every hour at minute 0"
echo "📝 Logs will be written to /var/log/reminder_processing.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove the cron job: crontab -r"
echo ""
echo "To test the reminder processing manually:"
echo "  cd $BACKEND_DIR && node $SCRIPT_PATH"
