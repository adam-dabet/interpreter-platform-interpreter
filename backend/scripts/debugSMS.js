const smsService = require('../src/services/smsService');

async function debugSMS() {
  try {
    console.log('Testing SMS with actual phone number...');
    
    const phoneNumber = '(619) 707-5865';
    const formattedPhone = smsService.formatPhoneNumber(phoneNumber);
    const message = '🧪 Test SMS from Interpreter Platform - Debug test';
    
    console.log(`Original phone: ${phoneNumber}`);
    console.log(`Formatted phone: ${formattedPhone}`);
    console.log(`Message: ${message}`);
    
    // Test the SMS sending
    const result = await smsService.sendSMS(formattedPhone, message);
    console.log('SMS sent successfully:', result);
    
  } catch (error) {
    console.error('SMS error details:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
  }
}

if (require.main === module) {
  debugSMS();
}

module.exports = debugSMS;
