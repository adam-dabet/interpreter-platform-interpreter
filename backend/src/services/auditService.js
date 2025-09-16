const db = require('../config/database');

class AuditService {
  /**
   * Log a user action to the audit trail
   * @param {Object} params - Audit log parameters
   * @param {string} params.userId - ID of the user performing the action
   * @param {string} params.username - Username of the user
   * @param {string} params.action - Action performed (CREATE, UPDATE, DELETE, VIEW, etc.)
   * @param {string} params.resourceType - Type of resource (JOB, INTERPRETER, CUSTOMER, etc.)
   * @param {string} params.resourceId - ID of the specific resource
   * @param {Object} params.details - Additional details about the action
   * @param {string} params.ipAddress - IP address of the user
   * @param {string} params.userAgent - User agent string
   */
  static async logAction({
    userId,
    username,
    action,
    resourceType,
    resourceId = null,
    details = {},
    ipAddress = null,
    userAgent = null
  }) {
    try {
      const query = `
        INSERT INTO audit_logs (user_id, username, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at
      `;
      
      const values = [
        userId,
        username,
        action,
        resourceType,
        resourceId,
        JSON.stringify(details),
        ipAddress,
        userAgent
      ];

      const result = await db.query(query, values);
      
      console.log(`Audit log created: ${action} on ${resourceType} by ${username}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw error to avoid breaking the main functionality
      return null;
    }
  }

  /**
   * Get audit logs with filtering and pagination
   * @param {Object} filters - Filter parameters
   * @param {string} filters.userId - Filter by user ID
   * @param {string} filters.action - Filter by action
   * @param {string} filters.resourceType - Filter by resource type
   * @param {string} filters.resourceId - Filter by resource ID
   * @param {Date} filters.startDate - Filter by start date
   * @param {Date} filters.endDate - Filter by end date
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Items per page (default: 50)
   */
  static async getAuditLogs(filters = {}) {
    try {
      const {
        userId,
        action,
        resourceType,
        resourceId,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = filters;

      let whereClause = '';
      const queryParams = [];
      let paramCounter = 1;

      // Build WHERE clause dynamically
      const conditions = [];

      if (userId) {
        conditions.push(`user_id = $${paramCounter}`);
        queryParams.push(userId);
        paramCounter++;
      }

      if (action) {
        conditions.push(`action = $${paramCounter}`);
        queryParams.push(action);
        paramCounter++;
      }

      if (resourceType) {
        conditions.push(`resource_type = $${paramCounter}`);
        queryParams.push(resourceType);
        paramCounter++;
      }

      if (resourceId) {
        conditions.push(`resource_id = $${paramCounter}`);
        queryParams.push(resourceId);
        paramCounter++;
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramCounter}`);
        queryParams.push(startDate);
        paramCounter++;
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramCounter}`);
        queryParams.push(endDate);
        paramCounter++;
      }

      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get audit logs
      const query = `
        SELECT 
          id,
          user_id,
          username,
          action,
          resource_type,
          resource_id,
          details,
          ip_address,
          user_agent,
          created_at
        FROM audit_logs 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;

      queryParams.push(limit, offset);
      const result = await db.query(query, queryParams);

      return {
        logs: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific resource
   * @param {string} resourceType - Type of resource
   * @param {string} resourceId - ID of the resource
   */
  static async getResourceAuditLogs(resourceType, resourceId) {
    try {
      const query = `
        SELECT 
          id,
          user_id,
          username,
          action,
          details,
          ip_address,
          user_agent,
          created_at
        FROM audit_logs 
        WHERE resource_type = $1 AND resource_id = $2
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, [resourceType, resourceId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching resource audit logs:', error);
      throw error;
    }
  }

  /**
   * Get user activity summary
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back (default: 30)
   */
  static async getUserActivitySummary(userId, days = 30) {
    try {
      const query = `
        SELECT 
          action,
          resource_type,
          COUNT(*) as count,
          MAX(created_at) as last_activity
        FROM audit_logs 
        WHERE user_id = $1 
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY action, resource_type
        ORDER BY count DESC
      `;

      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user activity summary:', error);
      throw error;
    }
  }

  /**
   * Get system activity statistics
   * @param {number} days - Number of days to look back (default: 7)
   */
  static async getSystemActivityStats(days = 7) {
    try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          action,
          resource_type,
          COUNT(*) as count
        FROM audit_logs 
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at), action, resource_type
        ORDER BY date DESC, count DESC
      `;

      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching system activity stats:', error);
      throw error;
    }
  }
}

module.exports = AuditService;


