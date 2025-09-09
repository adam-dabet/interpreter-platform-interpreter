const express = require('express');
const router = express.Router();
const magicLinkService = require('../services/magicLinkService');
const db = require('../config/database');
const loggerService = require('../services/loggerService');

/**
 * GET /api/magic-link/validate/:token
 * Validate a magic link token and return job information
 */
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const magicLinkData = await magicLinkService.validateMagicLink(token);
    
    if (!magicLinkData) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired magic link'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: magicLinkData.job_id,
        jobTitle: magicLinkData.job_title,
        scheduledDate: magicLinkData.scheduled_date,
        scheduledTime: magicLinkData.scheduled_time,
        status: magicLinkData.status,
        jobStartedAt: magicLinkData.job_started_at,
        jobEndedAt: magicLinkData.job_ended_at,
        interpreterName: `${magicLinkData.first_name} ${magicLinkData.last_name}`,
        canStart: !magicLinkData.used_for_start && !magicLinkData.job_started_at,
        canEnd: magicLinkData.job_started_at && !magicLinkData.used_for_end && !magicLinkData.job_ended_at
      }
    });
  } catch (error) {
    await loggerService.error('Failed to validate magic link', error, { req });
    res.status(500).json({
      success: false,
      message: 'Failed to validate magic link'
    });
  }
});

/**
 * POST /api/magic-link/start/:token
 * Start a job using magic link
 */
router.post('/start/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const magicLinkData = await magicLinkService.validateMagicLink(token);
    
    if (!magicLinkData) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired magic link'
      });
    }

    // Check if job can be started
    if (magicLinkData.used_for_start || magicLinkData.job_started_at) {
      return res.status(400).json({
        success: false,
        message: 'Job has already been started'
      });
    }

    if (magicLinkData.status !== 'assigned' && magicLinkData.status !== 'reminders_sent') {
      return res.status(400).json({
        success: false,
        message: 'Job is not in a state that allows starting'
      });
    }

    // Start the job
    const result = await db.query(`
      UPDATE jobs 
      SET 
        status = 'in_progress',
        job_started_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status, job_started_at
    `, [magicLinkData.job_id]);

    // Mark magic link as used for start
    await magicLinkService.markUsedForStart(magicLinkData.id);

    // Create notification for admin
    await db.query(`
      INSERT INTO job_notifications (job_id, interpreter_id, notification_type, message, status, sent_at)
      VALUES ($1, $2, 'job_started', $3, 'sent', CURRENT_TIMESTAMP)
    `, [magicLinkData.job_id, magicLinkData.interpreter_id, `Job "${magicLinkData.job_title}" has been started by interpreter ${magicLinkData.first_name} ${magicLinkData.last_name}.`]);

    await loggerService.info('Job started via magic link', {
      jobId: magicLinkData.job_id,
      interpreterId: magicLinkData.interpreter_id,
      tokenId: magicLinkData.id
    });

    res.json({
      success: true,
      message: 'Job started successfully',
      data: {
        jobId: result.rows[0].id,
        status: result.rows[0].status,
        startedAt: result.rows[0].job_started_at
      }
    });
  } catch (error) {
    await loggerService.error('Failed to start job via magic link', error, { req });
    res.status(500).json({
      success: false,
      message: 'Failed to start job'
    });
  }
});

/**
 * POST /api/magic-link/end/:token
 * End a job using magic link
 */
router.post('/end/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const magicLinkData = await magicLinkService.validateMagicLink(token);
    
    if (!magicLinkData) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired magic link'
      });
    }

    // Check if job can be ended
    if (!magicLinkData.job_started_at) {
      return res.status(400).json({
        success: false,
        message: 'Job has not been started yet'
      });
    }

    if (magicLinkData.used_for_end || magicLinkData.job_ended_at) {
      return res.status(400).json({
        success: false,
        message: 'Job has already been ended'
      });
    }

    // Calculate actual duration from start and end times
    const startTime = new Date(magicLinkData.job_started_at);
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const actualDurationMinutes = Math.round(durationMs / (1000 * 60));

    // End the job
    const result = await db.query(`
      UPDATE jobs 
      SET 
        status = 'completed',
        job_ended_at = CURRENT_TIMESTAMP,
        actual_duration_minutes = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status, job_ended_at, actual_duration_minutes
    `, [magicLinkData.job_id, actualDurationMinutes]);

    // Mark magic link as used for end
    await magicLinkService.markUsedForEnd(magicLinkData.id);

    // Create notification for admin
    await db.query(`
      INSERT INTO job_notifications (job_id, interpreter_id, notification_type, message, status, sent_at)
      VALUES ($1, $2, 'job_completed', $3, 'sent', CURRENT_TIMESTAMP)
    `, [magicLinkData.job_id, magicLinkData.interpreter_id, `Job "${magicLinkData.job_title}" has been completed by interpreter ${magicLinkData.first_name} ${magicLinkData.last_name}.`]);

    await loggerService.info('Job ended via magic link', {
      jobId: magicLinkData.job_id,
      interpreterId: magicLinkData.interpreter_id,
      tokenId: magicLinkData.id
    });

    res.json({
      success: true,
      message: 'Job ended successfully',
      data: {
        jobId: result.rows[0].id,
        status: result.rows[0].status,
        endedAt: result.rows[0].job_ended_at,
        actualDurationMinutes: result.rows[0].actual_duration_minutes
      }
    });
  } catch (error) {
    await loggerService.error('Failed to end job via magic link', error, { req });
    res.status(500).json({
      success: false,
      message: 'Failed to end job'
    });
  }
});

/**
 * POST /api/magic-link/cleanup
 * Clean up expired magic links (admin only)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const cleanedCount = await magicLinkService.cleanupExpiredLinks();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired magic links`,
      data: { cleanedCount }
    });
  } catch (error) {
    await loggerService.error('Failed to cleanup magic links', error, { req });
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup magic links'
    });
  }
});

module.exports = router;
