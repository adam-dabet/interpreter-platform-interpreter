/**
 * Must stay aligned with backend/src/utils/passwordPolicy.js
 */

const ALLOWED_CHARSET_REGEX = /^[A-Za-z\d@$!%*?&]+$/;

/**
 * @param {string} password
 * @returns {string|null} Error message for the user, or null if valid.
 */
export function validateNewPasswordPolicy(password) {
  if (password == null || password === '') {
    return 'Password is required.';
  }
  if (typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (/\s/.test(password)) {
    return 'Password cannot contain spaces. Check for accidental spaces when pasting or using autofill.';
  }
  if (!ALLOWED_CHARSET_REGEX.test(password)) {
    return (
      'Password may only contain letters (A–Z, a–z), numbers (0–9), and these symbols: @ $ ! % * ? &. ' +
      'Remove characters like #, -, _, ., or other symbols—or any hidden characters from copy/paste.'
    );
  }

  const missing = [];
  if (!/[a-z]/.test(password)) missing.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter');
  if (!/\d/.test(password)) missing.push('a number');
  if (!/[@$!%*?&]/.test(password)) missing.push('a special character from @$!%*?&');

  if (missing.length > 0) {
    let list;
    if (missing.length === 1) list = missing[0];
    else if (missing.length === 2) list = `${missing[0]} and ${missing[1]}`;
    else list = `${missing.slice(0, -1).join(', ')}, and ${missing[missing.length - 1]}`;
    return `Password must include ${list}.`;
  }

  return null;
}
