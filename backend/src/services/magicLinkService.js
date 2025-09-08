const crypto = require('crypto');
const db = require('../config/database');
const loggerService = require('./loggerService');

class MagicLinkService {
  constructor() {
    this.tokenExpiryHours = 24; // Magic links expire in 24 hours
  }

  /**
   * Generate a secure magic link token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a magic link for a job
   */
  async createMagicLink(jobId, interpreterId) {
    try {
      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.tokenExpiryHours);

      const result = await db.query(`
        INSERT INTO job_magic_links (job_id, interpreter_id, token, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, token, expires_at
      `, [jobId, interpreterId, token, expiresAt]);

      await loggerService.info('Magic link created', {
        jobId,
        interpreterId,
        tokenId: result.rows[0].id,
        expiresAt: expiresAt.toISOString()
      });

      return {
        id: result.rows[0].id,
        token: result.rows[0].token,
        expiresAt: result.rows[0].expires_at
      };
    } catch (error) {
      await loggerService.error('Failed to create magic link', error, {
        jobId,
        interpreterId
      });
      throw error;
    }
  }

  /**
   * Validate and get magic link data
   */
  async validateMagicLink(token) {
    try {
      const result = await db.query(`
        SELECT 
          jml.id,
          jml.job_id,
          jml.interpreter_id,
          jml.expires_at,
          jml.used_for_start,
          jml.used_for_end,
          j.title as job_title,
          j.scheduled_date,
          j.scheduled_time,
          j.status,
          j.job_started_at,
          j.job_ended_at,
          i.first_name,
          i.last_name,
          i.email
        FROM job_magic_links jml
        JOIN jobs j ON jml.job_id = j.id
        JOIN interpreters i ON jml.interpreter_id = i.id
        WHERE jml.token = $1 AND jml.expires_at > CURRENT_TIMESTAMP
      `, [token]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      await loggerService.error('Failed to validate magic link', error, { token });
      throw error;
    }
  }

  /**
   * Mark magic link as used for start
   */
  async markUsedForStart(tokenId) {
    try {
      await db.query(`
        UPDATE job_magic_links 
        SET used_for_start = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [tokenId]);

      await loggerService.info('Magic link marked as used for start', { tokenId });
    } catch (error) {
      await loggerService.error('Failed to mark magic link as used for start', error, { tokenId });
      throw error;
    }
  }

  /**
   * Mark magic link as used for end
   */
  async markUsedForEnd(tokenId) {
    try {
      await db.query(`
        UPDATE job_magic_links 
        SET used_for_end = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [tokenId]);

      await loggerService.info('Magic link marked as used for end', { tokenId });
    } catch (error) {
      await loggerService.error('Failed to mark magic link as used for end', error, { tokenId });
      throw error;
    }
  }

  /**
   * Clean up expired magic links
   */
  async cleanupExpiredLinks() {
    try {
      const result = await db.query(`
        DELETE FROM job_magic_links 
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING id
      `);

      if (result.rows.length > 0) {
        await loggerService.info('Cleaned up expired magic links', {
          count: result.rows.length
        });
      }

      return result.rows.length;
    } catch (error) {
      await loggerService.error('Failed to cleanup expired magic links', error);
      throw error;
    }
  }

  /**
   * Get magic link URL for a job
   */
  getMagicLinkUrl(token, baseUrl = 'http://localhost:3000') {
    return `${baseUrl}/job-timer/${token}`;
  }
}

module.exports = new MagicLinkService();
