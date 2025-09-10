const twilio = require('twilio');

async function verifyTwilio() {
  try {
    console.log('Verifying Twilio credentials...');
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    console.log('Account SID:', accountSid);
    console.log('Auth Token:', authToken ? '***' + authToken.slice(-4) : 'Not set');
    
    if (!accountSid || !authToken) {
      console.error('❌ Missing credentials');
      return;
    }
    
    const client = twilio(accountSid, authToken);
    
    // Test by fetching account info
    const account = await client.api.accounts(accountSid).fetch();
    console.log('✅ Twilio credentials are valid!');
    console.log('Account Name:', account.friendlyName);
    console.log('Account Status:', account.status);
    
  } catch (error) {
    console.error('❌ Twilio verification failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
  }
}

if (require.main === module) {
  verifyTwilio();
}

module.exports = verifyTwilio;
