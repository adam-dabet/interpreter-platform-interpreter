const express = require('express');
const router = express.Router();
const loggerService = require('../services/loggerService');

// Redirect old application routes to new interpreter system
router.all('*', async (req, res) => {
  await loggerService.warn('Deprecated application endpoint accessed', {
    category: 'API',
    req,
    originalUrl: req.originalUrl,
    method: req.method
  });

  res.status(410).json({
    success: false,
    message: 'This endpoint has been deprecated. Please use the new interpreter profile system at /api/interpreters',
    redirect: '/api/interpreters',
    documentation: 'See the API documentation for the new interpreter profile endpoints'
  });
});

module.exports = router;