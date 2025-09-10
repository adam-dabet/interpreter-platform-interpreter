#!/usr/bin/env node

/**
 * Reminder Processing Script
 * 
 * This script processes and sends appointment reminders for:
 * - Claimants: 2-day reminder
 * - Interpreters: 2-day, 1-day, and 2-hour reminders
 * 
 * Usage:
 *   node scripts/processReminders.js
 * 
 * Can be run manually or scheduled via cron job
 */

require('dotenv').config();
const ReminderService = require('../src/services/reminderService');

async function main() {
  console.log('='.repeat(60));
  console.log('REMINDER PROCESSING SCRIPT');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    const reminderService = new ReminderService();
    const result = await reminderService.processReminders();
    
    console.log('REMINDER PROCESSING SUMMARY:');
    console.log('-'.repeat(40));
    console.log(`Total jobs processed: ${result.totalJobsProcessed}`);
    console.log(`Claimant reminders sent: ${result.claimantRemindersSent}`);
    console.log(`Interpreter 2-day reminders sent: ${result.interpreter2DayRemindersSent}`);
    console.log(`Interpreter 1-day reminders sent: ${result.interpreter1DayRemindersSent}`);
    console.log(`Interpreter 2-hour reminders sent: ${result.interpreter2HourRemindersSent}`);
    console.log(`Total reminders sent: ${result.totalRemindersSent}`);
    console.log('');
    console.log('✅ Reminder processing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error processing reminders:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
  
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = main;
