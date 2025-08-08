const loggerService = require('../services/loggerService');
const { v4: uuidv4 } = require('uuid');

// Request logging middleware
const requestLogger = (req, res, next) => {
    // Add unique request ID
    req.id = uuidv4();
    
    // Start timer for response time
    req.startTime = loggerService.startTimer();
    
    // Log request
    const requestInfo = {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
        userAgent: req.get('User-Agent'),
        ip: loggerService.getClientIP(req),
        userId: req.user?.id,
        body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined
    };

    loggerService.info('Incoming request', {
        category: 'API',
        ...requestInfo
    });

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
        const responseTime = loggerService.endTimer(req.startTime);
        
        // Log response
        loggerService.logAPI(
            `${req.method} ${req.originalUrl || req.url} - ${res.statusCode}`,
            req,
            res,
            responseTime
        );

        return originalJson.call(this, data);
    };

    next();
};

// Error logging middleware
const errorLogger = (error, req, res, next) => {
    const responseTime = req.startTime ? loggerService.endTimer(req.startTime) : null;
    
    loggerService.error('Request error', error, {
        category: 'API',
        req,
        requestId: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode || 500,
        responseTime,
        userId: req.user?.id
    });

    next(error);
};

// Security logging middleware
const securityLogger = (req, res, next) => {
    // Log suspicious activities
    const suspiciousPatterns = [
        /\.\.\//,  // Path traversal
        /<script/i, // XSS attempts
        /union\s+select/i, // SQL injection
        /drop\s+table/i,   // SQL injection
    ];

    const userInput = JSON.stringify(req.body) + req.originalUrl + JSON.stringify(req.query);
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(userInput)) {
            loggerService.logSecurity('Suspicious request detected', 'Potential attack', {
                req,
                pattern: pattern.toString(),
                userInput: userInput.substring(0, 500) // Limit size
            });
            break;
        }
    }

    // Log failed authentication attempts
    if (req.originalUrl.includes('/auth/') && req.method === 'POST') {
        res.on('finish', () => {
            if (res.statusCode === 401 || res.statusCode === 403) {
                loggerService.logSecurity('Authentication failure', 'Failed login attempt', {
                    req,
                    email: req.body?.email,
                    statusCode: res.statusCode
                });
            }
        });
    }

    next();
};

// Rate limit logging middleware
const rateLimitLogger = (req, res, next) => {
    // This works with express-rate-limit
    res.on('finish', () => {
        if (res.statusCode === 429) {
            loggerService.warn('Rate limit exceeded', {
                category: 'SECURITY',
                req,
                ip: loggerService.getClientIP(req),
                userAgent: req.get('User-Agent')
            });
        }
    });

    next();
};

// Database operation logging middleware
const dbLogger = {
    logQuery: async (query, params, operation, table) => {
        await loggerService.debug('Database query executed', {
            category: 'DATABASE',
            query: query.substring(0, 200), // Limit query length
            operation,
            table,
            paramCount: params?.length
        });
    },

    logTransaction: async (operation, tables, recordCount) => {
        await loggerService.info('Database transaction completed', {
            category: 'DATABASE',
            operation,
            tables,
            recordCount
        });
    },

    logError: async (error, query, params) => {
        await loggerService.error('Database operation failed', error, {
            category: 'DATABASE',
            query: query?.substring(0, 200),
            paramCount: params?.length
        });
    }
};

// File upload logging middleware
const fileUploadLogger = (req, res, next) => {
    if (req.file || req.files) {
        const files = req.files || [req.file];
        
        files.forEach(file => {
            if (file) {
                loggerService.logFileUpload('File uploaded', file, {
                    req,
                    userId: req.user?.id
                });
            }
        });
    }

    next();
};

// Validation error logging middleware
const validationLogger = (errors, req) => {
    if (errors && errors.length > 0) {
        loggerService.logValidation('Validation errors occurred', errors, {
            req,
            userId: req.user?.id,
            endpoint: req.originalUrl || req.url
        });
    }
};

// Utility function to sanitize request body for logging
function sanitizeRequestBody(body) {
    if (!body) return undefined;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'ssn', 'ssn_last_four', 'token', 'secret'];
    
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });

    return sanitized;
}

// Performance monitoring middleware
const performanceLogger = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    
    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        // Log slow requests (> 1 second)
        if (duration > 1000) {
            loggerService.warn('Slow request detected', {
                category: 'PERFORMANCE',
                req,
                duration: `${duration.toFixed(2)}ms`,
                endpoint: req.originalUrl || req.url,
                method: req.method
            });
        }
    });

    next();
};

module.exports = {
    requestLogger,
    errorLogger,
    securityLogger,
    rateLimitLogger,
    dbLogger,
    fileUploadLogger,
    validationLogger,
    performanceLogger
};