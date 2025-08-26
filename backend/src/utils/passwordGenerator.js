const crypto = require('crypto');

/**
 * Generate a secure temporary password
 * @param {number} length - Length of the password (default: 12)
 * @returns {string} - Generated password
 */
function generateTemporaryPassword(length = 12) {
  // Use crypto.randomBytes for better randomness
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);
  
  // Convert bytes to password using charset
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

/**
 * Generate a username from first and last name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} - Generated username
 */
function generateUsername(firstName, lastName) {
  const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
  
  // Add random suffix to ensure uniqueness
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${baseUsername}${suffix}`;
}

module.exports = {
  generateTemporaryPassword,
  generateUsername
};


