const winston = require('winston');
const path = require('path');
const db = require('../config/database');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Winston configuration
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'interpreter-platform' },
    transports: [
        // Error logs
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

class LoggerService {
    constructor() {
        this.logger = logger;
    }

    // Safe JSON stringify that handles circular references
    safeStringify(obj) {
        const seen = new Set();
        return JSON.stringify(obj, (key, value) => {
            // Skip circular references and large objects
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
                
                // Skip problematic Express objects that cause circular references
                if (key === 'req' || key === 'res' || key === 'socket' || key === 'client' || key === '_server') {
                    return '[Express Object]';
                }
                
                // Limit object size for database storage
                if (Object.keys(value).length > 50) {
                    return '[Large Object]';
                }
            }
            return value;
        });
    }

    // Database logging method
    async logToDatabase(logData) {
        try {
            const {
                level,
                category,
                message,
                details = null,
                userId = null,
                sessionId = null,
                ipAddress = null,
                userAgent = null,
                requestId = null,
                endpoint = null,
                method = null,
                statusCode = null,
                responseTime = null
            } = logData;

            const query = `
                INSERT INTO system_logs (
                    log_level, category, message, details, user_id, session_id, 
                    ip_address, user_agent, request_id, endpoint, method, 
                    status_code, response_time
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `;

            const values = [
                level.toUpperCase(),
                category.toUpperCase(),
                message,
                details ? this.safeStringify(details) : null,
                userId,
                sessionId,
                ipAddress,
                userAgent,
                requestId,
                endpoint,
                method,
                statusCode,
                responseTime
            ];

            await db.query(query, values);
        } catch (error) {
            // Don't let logging errors break the application
            this.logger.error('Failed to log to database:', error);
        }
    }

    // Enhanced logging methods with database integration
    async info(message, meta = {}) {
        this.logger.info(message, meta);
        await this.logToDatabase({
            level: 'info',
            category: meta.category || 'GENERAL',
            message,
            details: meta,
            ...this.extractRequestInfo(meta)
        });
    }

    async warn(message, meta = {}) {
        this.logger.warn(message, meta);
        await this.logToDatabase({
            level: 'warn',
            category: meta.category || 'GENERAL',
            message,
            details: meta,
            ...this.extractRequestInfo(meta)
        });
    }

    async error(message, error, meta = {}) {
        const errorDetails = {
            ...meta,
            error: {
                message: error?.message,
                stack: error?.stack,
                code: error?.code
            }
        };

        this.logger.error(message, errorDetails);
        await this.logToDatabase({
            level: 'error',
            category: meta.category || 'ERROR',
            message,
            details: errorDetails,
            ...this.extractRequestInfo(meta)
        });
    }

    async debug(message, meta = {}) {
        this.logger.debug(message, meta);
        if (process.env.NODE_ENV === 'development') {
            await this.logToDatabase({
                level: 'debug',
                category: meta.category || 'DEBUG',
                message,
                details: meta,
                ...this.extractRequestInfo(meta)
            });
        }
    }

    // Specific logging methods for different categories
    async logAuth(message, userId, action, meta = {}) {
        await this.info(message, {
            category: 'AUTH',
            userId,
            action,
            ...meta
        });
    }

    async logAPI(message, req, res, responseTime) {
        const statusCode = res?.statusCode;
        const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
        
        await this[level](message, {
            category: 'API',
            endpoint: req?.originalUrl || req?.url,
            method: req?.method,
            statusCode,
            responseTime,
            userId: req?.user?.id,
            sessionId: req?.sessionID,
            ipAddress: this.getClientIP(req),
            userAgent: req?.get('User-Agent'),
            requestId: req?.id
        });
    }

    async logDatabase(message, operation, table, recordId, meta = {}) {
        await this.info(message, {
            category: 'DATABASE',
            operation,
            table,
            recordId,
            ...meta
        });
    }

    async logValidation(message, errors, meta = {}) {
        await this.warn(message, {
            category: 'VALIDATION',
            errors,
            ...meta
        });
    }

    async logSecurity(message, threat, meta = {}) {
        await this.error(message, new Error(threat), {
            category: 'SECURITY',
            threat,
            ...meta
        });
    }

    async logEmail(message, emailData, meta = {}) {
        await this.info(message, {
            category: 'EMAIL',
            to: emailData?.to,
            subject: emailData?.subject,
            templateName: emailData?.templateName,
            ...meta
        });
    }

    async logFileUpload(message, fileInfo, meta = {}) {
        await this.info(message, {
            category: 'FILE_UPLOAD',
            fileName: fileInfo?.originalname,
            fileSize: fileInfo?.size,
            mimeType: fileInfo?.mimetype,
            ...meta
        });
    }

    // Activity logging for audit trail
    async logActivity(tableName, recordId, action, oldValues, newValues, userId, req) {
        try {
            const changedFields = this.getChangedFields(oldValues, newValues);
            
            const query = `
                INSERT INTO activity_logs (
                    table_name, record_id, action, old_values, new_values, 
                    changed_fields, user_id, ip_address, user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `;

            const values = [
                tableName,
                recordId,
                action.toUpperCase(),
                oldValues ? this.safeStringify(oldValues) : null,
                newValues ? this.safeStringify(newValues) : null,
                changedFields,
                userId,
                this.getClientIP(req),
                req?.get('User-Agent')
            ];

            await db.query(query, values);

            await this.info(`${action.toUpperCase()} operation on ${tableName}`, {
                category: 'ACTIVITY',
                table: tableName,
                recordId,
                action,
                changedFields,
                userId
            });
        } catch (error) {
            this.logger.error('Failed to log activity:', error);
        }
    }

    // Utility methods
    extractRequestInfo(meta) {
        const req = meta.req;
        if (!req) return {};

        return {
            userId: req.user?.id,
            sessionId: req.sessionID,
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            requestId: req.id,
            endpoint: req.originalUrl || req.url,
            method: req.method
        };
    }

    getClientIP(req) {
        if (!req) return null;
        return req.ip || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               (req.connection?.socket ? req.connection.socket.remoteAddress : null);
    }

    getChangedFields(oldValues, newValues) {
        if (!oldValues || !newValues) return [];
        
        const changed = [];
        for (const key in newValues) {
            if (oldValues[key] !== newValues[key]) {
                changed.push(key);
            }
        }
        return changed;
    }

    // Performance monitoring
    startTimer() {
        return Date.now();
    }

    endTimer(startTime) {
        return Date.now() - startTime;
    }

    // Log aggregation methods for analytics
    async getLogStats(timeframe = '24h') {
        try {
            const interval = timeframe === '24h' ? '24 hours' : 
                           timeframe === '7d' ? '7 days' : 
                           timeframe === '30d' ? '30 days' : '24 hours';

            const query = `
                SELECT 
                    log_level,
                    category,
                    COUNT(*) as count,
                    DATE_TRUNC('hour', created_at) as hour
                FROM system_logs 
                WHERE created_at >= NOW() - INTERVAL '${interval}'
                GROUP BY log_level, category, DATE_TRUNC('hour', created_at)
                ORDER BY hour DESC, count DESC
            `;

            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            this.logger.error('Failed to get log stats:', error);
            return [];
        }
    }

    async getErrorSummary(limit = 10) {
        try {
            const query = `
                SELECT 
                    message,
                    category,
                    COUNT(*) as occurrences,
                    MAX(created_at) as last_occurrence
                FROM system_logs 
                WHERE log_level = 'ERROR' 
                    AND created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY message, category
                ORDER BY occurrences DESC, last_occurrence DESC
                LIMIT $1
            `;

            const result = await db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            this.logger.error('Failed to get error summary:', error);
            return [];
        }
    }
}

// Create singleton instance
const loggerService = new LoggerService();

module.exports = loggerService;