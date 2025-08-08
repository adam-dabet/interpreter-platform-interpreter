const emailService = require('../src/services/emailService');

async function processEmails() {
  try {
    console.log('Processing email queue...');
    const processed = await emailService.processEmailQueue(20);
    console.log(`Processed ${processed} emails`);
  } catch (error) {
    console.error('Email processing error:', error);
  }
}

// Process emails every 30 seconds
setInterval(processEmails, 30000);

// Initial run
processEmails();

console.log('Email worker started. Processing emails every 30 seconds...');