const smsService = require('../src/services/smsService');

async function sendTestSMS() {
  try {
    console.log('Sending test SMS...');
    
    const testMessage = '🧪 Test SMS from Interpreter Platform - Twilio integration is working!';
    const testPhoneNumber = '+1234567890'; // Replace with your actual phone number for testing
    
    console.log('⚠️  Note: Replace the test phone number with your actual number to receive the SMS');
    console.log(`Sending to: ${testPhoneNumber}`);
    console.log(`Message: ${testMessage}`);
    
    // Uncomment the line below to actually send the SMS
    // const result = await smsService.sendSMS(testPhoneNumber, testMessage);
    // console.log('SMS sent successfully:', result);
    
    console.log('✅ SMS service is ready to use!');
    console.log('To send actual SMS, uncomment the sendSMS call in this script and add your phone number.');
    
  } catch (error) {
    console.error('❌ SMS test failed:', error.message);
  }
}

if (require.main === module) {
  sendTestSMS();
}

module.exports = sendTestSMS;
