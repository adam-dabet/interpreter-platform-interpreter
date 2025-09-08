const magicLinkService = require('../src/services/magicLinkService');
const loggerService = require('../src/services/loggerService');

async function cleanupMagicLinks() {
  try {
    console.log('Starting magic link cleanup...');
    
    const cleanedCount = await magicLinkService.cleanupExpiredLinks();
    
    console.log(`Magic link cleanup completed. Cleaned up ${cleanedCount} expired links.`);
    
    await loggerService.info('Magic link cleanup completed', {
      category: 'CLEANUP',
      cleanedCount
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error during magic link cleanup:', error);
    
    await loggerService.error('Magic link cleanup failed', {
      category: 'CLEANUP',
      error: error.message
    });
    
    process.exit(1);
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupMagicLinks();
}

module.exports = cleanupMagicLinks;
