/**
 * Token Expiration Handler Utility
 * Provides consistent token expiration handling across all portals
 */

import toast from 'react-hot-toast';

export class TokenExpirationHandler {
  constructor(portalType = 'app') {
    this.portalType = portalType;
    this.isHandlingExpiration = false;
  }

  /**
   * Handle token expiration with user notification and logout
   * @param {Function} logoutFunction - Function to call for logout
   * @param {string} customMessage - Optional custom message to show
   */
  handleTokenExpiration(logoutFunction, customMessage = null) {
    if (this.isHandlingExpiration) {
      return; // Prevent multiple simultaneous expiration handlers
    }

    this.isHandlingExpiration = true;

    // Show user-friendly notification
    const message = customMessage || this.getDefaultExpirationMessage();
    toast.error(message, {
      duration: 8000, // Show for 8 seconds
      position: 'top-center',
      style: {
        background: '#ef4444',
        color: '#fff',
        fontSize: '16px',
        padding: '16px',
        borderRadius: '8px',
        maxWidth: '500px'
      }
    });

    // Clear any existing toasts after a delay
    setTimeout(() => {
      toast.dismiss();
    }, 8000);

    // Perform logout after a short delay to let user see the message
    setTimeout(() => {
      if (logoutFunction && typeof logoutFunction === 'function') {
        logoutFunction();
      }
      this.isHandlingExpiration = false;
    }, 2000);
  }

  /**
   * Get default expiration message based on portal type
   */
  getDefaultExpirationMessage() {
    const messages = {
      customer: 'Your session has expired. Please log in again to continue.',
      admin: 'Your admin session has expired. Please log in again to continue.',
      interpreter: 'Your interpreter session has expired. Please log in again to continue.',
      app: 'Your session has expired. Please log in again to continue.'
    };

    return messages[this.portalType] || messages.app;
  }

  /**
   * Check if a response indicates token expiration
   * @param {Response} response - Fetch response object
   * @returns {boolean} - True if token is expired
   */
  isTokenExpired(response) {
    if (!response) return false;
    
    // Check for 401 Unauthorized status
    if (response.status === 401) {
      return true;
    }

    // Check response body for token expiration messages
    if (response.status === 400 || response.status === 403) {
      // We'll need to check the response body for specific error messages
      return false; // Will be handled by response parsing
    }

    return false;
  }

  /**
   * Parse response body to check for token expiration messages
   * @param {Object} responseData - Parsed response data
   * @returns {boolean} - True if token is expired
   */
  isTokenExpiredFromResponse(responseData) {
    if (!responseData || !responseData.message) {
      return false;
    }

    const message = responseData.message.toLowerCase();
    const expirationKeywords = [
      'token expired',
      'session expired',
      'authentication failed',
      'invalid token',
      'token invalid',
      'unauthorized',
      'access denied'
    ];

    return expirationKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Enhanced fetch wrapper that handles token expiration
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @param {Function} logoutFunction - Function to call on token expiration
   * @returns {Promise<Response>} - Fetch response
   */
  async fetchWithExpirationHandling(url, options = {}, logoutFunction) {
    try {
      const response = await fetch(url, options);
      
      // Check for immediate 401 response
      if (this.isTokenExpired(response)) {
        this.handleTokenExpiration(logoutFunction);
        throw new Error('Token expired');
      }

      // For other error statuses, check the response body
      if (!response.ok && (response.status === 400 || response.status === 403)) {
        try {
          const responseData = await response.clone().json();
          if (this.isTokenExpiredFromResponse(responseData)) {
            this.handleTokenExpiration(logoutFunction);
            throw new Error('Token expired');
          }
        } catch (parseError) {
          // If we can't parse the response, continue with original error
          console.warn('Could not parse error response:', parseError);
        }
      }

      return response;
    } catch (error) {
      // Re-throw the error if it's not a token expiration
      if (error.message !== 'Token expired') {
        throw error;
      }
      // Token expiration is handled by handleTokenExpiration
      throw error;
    }
  }

  /**
   * Reset the handler state (useful for testing or manual reset)
   */
  reset() {
    this.isHandlingExpiration = false;
  }
}

// Create singleton instances for each portal
export const customerTokenHandler = new TokenExpirationHandler('customer');
export const adminTokenHandler = new TokenExpirationHandler('admin');
export const interpreterTokenHandler = new TokenExpirationHandler('interpreter');
export const defaultTokenHandler = new TokenExpirationHandler('app');

export default TokenExpirationHandler;
