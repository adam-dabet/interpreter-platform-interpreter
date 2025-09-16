const AuditService = require('../services/auditService');

/**
 * Middleware to automatically log API requests
 * This should be used after authentication middleware
 */
const auditMiddleware = (options = {}) => {
  return async (req, res, next) => {
    // Skip audit logging for certain paths or methods
    const skipPaths = options.skipPaths || ['/health', '/status'];
    const skipMethods = options.skipMethods || [];
    
    if (skipPaths.some(path => req.path.startsWith(path)) || 
        skipMethods.includes(req.method)) {
      return next();
    }

    // Only audit admin routes
    if (!req.path.startsWith('/api/admin/')) {
      return next();
    }

    // Get user info from the request (set by auth middleware)
    const userId = req.user?.userId;
    const username = req.user?.username;

    if (!userId || !username) {
      return next();
    }

    // Determine action based on HTTP method and path
    const action = getActionFromRequest(req);
    const resourceType = getResourceTypeFromPath(req.path);
    const resourceId = getResourceIdFromPath(req.path);

    // Extract IP address
    const ipAddress = req.ip || 
                     req.connection?.remoteAddress || 
                     req.socket?.remoteAddress ||
                     (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim();

    // Extract user agent
    const userAgent = req.get('User-Agent');

    // Prepare details
    const details = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: sanitizeRequestBody(req.body),
      timestamp: new Date().toISOString()
    };

    // Log the action asynchronously (don't wait for it)
    setImmediate(async () => {
      try {
        console.log('Attempting to log audit action:', { userId, username, action, resourceType, resourceId });
        const result = await AuditService.logAction({
          userId,
          username,
          action,
          resourceType,
          resourceId,
          details,
          ipAddress,
          userAgent
        });
        console.log('Audit log result:', result);
      } catch (error) {
        console.error('Error in audit middleware:', error);
      }
    });

    next();
  };
};

/**
 * Determine action from HTTP method and path
 */
function getActionFromRequest(req) {
  const method = req.method;
  const path = req.path;

  // Special cases for specific paths
  if (path.includes('/login')) return 'LOGIN';
  if (path.includes('/logout')) return 'LOGOUT';
  if (path.includes('/password')) return 'PASSWORD_CHANGE';
  if (path.includes('/status/')) return 'STATUS_UPDATE';
  if (path.includes('/assign')) return 'ASSIGN';
  if (path.includes('/unassign')) return 'UNASSIGN';
  if (path.includes('/facility-confirmation')) return 'FACILITY_CONFIRMATION';
  if (path.includes('/sms/send')) return 'SMS_SEND';
  if (path.includes('/email/send')) return 'EMAIL_SEND';

  // Default actions based on HTTP method
  switch (method) {
    case 'GET':
      return 'VIEW';
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Determine resource type from path
 */
function getResourceTypeFromPath(path) {
  if (path.includes('/jobs')) return 'JOB';
  if (path.includes('/interpreters')) return 'INTERPRETER';
  if (path.includes('/customers')) return 'CUSTOMER';
  if (path.includes('/claimants')) return 'CLAIMANT';
  if (path.includes('/billing-accounts')) return 'BILLING_ACCOUNT';
  if (path.includes('/service-locations')) return 'SERVICE_LOCATION';
  if (path.includes('/users') || path.includes('/auth')) return 'USER';
  if (path.includes('/sms')) return 'SMS';
  if (path.includes('/email')) return 'EMAIL';
  if (path.includes('/reminders')) return 'REMINDER';
  return 'UNKNOWN';
}

/**
 * Extract resource ID from path
 */
function getResourceIdFromPath(path) {
  // Look for UUIDs or numeric IDs in the path
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const numericIdRegex = /\/(\d+)(?:\/|$)/;
  
  const uuidMatch = path.match(uuidRegex);
  if (uuidMatch) return uuidMatch[0];
  
  const numericMatch = path.match(numericIdRegex);
  if (numericMatch) return numericMatch[1];
  
  return null;
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  // Remove sensitive fields
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeRequestBody(sanitized[key]);
    }
  });
  
  return sanitized;
}

module.exports = {
  auditMiddleware
};
