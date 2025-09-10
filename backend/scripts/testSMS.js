const smsService = require('../src/services/smsService');

async function testSMS() {
  try {
    console.log('Testing Twilio SMS Service...');
    console.log('SMS Service Configured:', smsService.isConfigured());
    
    if (!smsService.isConfigured()) {
      console.log('❌ SMS service not configured. Please set up Twilio environment variables.');
      console.log('Required variables:');
      console.log('- TWILIO_ACCOUNT_SID');
      console.log('- TWILIO_AUTH_TOKEN');
      console.log('- TWILIO_PHONE_NUMBER');
      return;
    }

    // Test phone number formatting
    const testNumbers = [
      '1234567890',
      '123-456-7890',
      '(123) 456-7890',
      '+1234567890',
      '123.456.7890'
    ];

    console.log('\n📱 Testing phone number formatting:');
    testNumbers.forEach(number => {
      const formatted = smsService.formatPhoneNumber(number);
      console.log(`${number} → ${formatted}`);
    });

    // Test reminder message generation
    const testJob = {
      id: 'test-job-123',
      title: 'Medical Consultation',
      scheduled_date: '2025-09-12',
      scheduled_time: '12:02:00',
      location_address: '123 Main St',
      location_city: 'City',
      location_state: 'State',
      is_remote: false
    };

    console.log('\n📝 Testing reminder message generation:');
    const message = smsService.getReminderMessage('interpreter_2day_reminder', testJob);
    console.log('Message:', message);

    console.log('\n✅ SMS service test completed successfully!');
    console.log('To send actual SMS, call: smsService.sendSMS(phoneNumber, message)');

  } catch (error) {
    console.error('❌ SMS service test failed:', error.message);
  }
}

if (require.main === module) {
  testSMS();
}

module.exports = testSMS;
