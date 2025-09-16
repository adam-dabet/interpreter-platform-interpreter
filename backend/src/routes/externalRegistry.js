const express = require('express');
const router = express.Router();
const externalRegistryController = require('../controllers/externalRegistryController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Search external registries for interpreters
router.post('/search', 
  authenticateToken, 
  requireAdmin, 
  externalRegistryController.searchExternalInterpreters.bind(externalRegistryController)
);

// Get available certification types
router.get('/certification-types',
  authenticateToken,
  requireAdmin,
  externalRegistryController.getCertificationTypes.bind(externalRegistryController)
);

// Get available languages
router.get('/languages',
  authenticateToken,
  requireAdmin,
  externalRegistryController.getAvailableLanguages.bind(externalRegistryController)
);

module.exports = router;
