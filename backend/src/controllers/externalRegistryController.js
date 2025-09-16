const externalRegistryService = require('../services/externalRegistryService');

class ExternalRegistryController {
  /**
   * Search for interpreters from external registries
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchExternalInterpreters(req, res) {
    try {
      const {
        language,
        state,
        city,
        zipCode,
        certificationType = 'CHI',
        radius = 50 // Search radius in miles
      } = req.body;

      // Validate required parameters
      if (!language) {
        return res.status(400).json({
          success: false,
          message: 'Language is required for interpreter search'
        });
      }

      if (!state) {
        return res.status(400).json({
          success: false,
          message: 'State is required for interpreter search'
        });
      }

      const jobRequirements = {
        language,
        state,
        city: city || '',
        zipCode: zipCode || '',
        certificationType,
        radius
      };

      console.log('Searching external registries for:', jobRequirements);

      // Search for suitable interpreters
      const searchResults = await externalRegistryService.findSuitableInterpreters(jobRequirements);

      res.json({
        success: true,
        data: searchResults
      });

    } catch (error) {
      console.error('Error searching external interpreters:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search external registries',
        error: error.message
      });
    }
  }

  /**
   * Get available certification types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCertificationTypes(req, res) {
    try {
      const certificationTypes = [
        { value: 'CHI', label: 'CHI (Certified Healthcare Interpreter)' },
        { value: 'CoreCHI', label: 'CoreCHI (Core Certification)' },
        { value: 'CoreCHI-P', label: 'CoreCHI-P (Pediatric Specialization)' },
        { value: 'Candidate', label: 'Candidate (In Progress)' }
      ];

      res.json({
        success: true,
        data: certificationTypes
      });

    } catch (error) {
      console.error('Error getting certification types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get certification types',
        error: error.message
      });
    }
  }

  /**
   * Get available languages from CCHI registry
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAvailableLanguages(req, res) {
    try {
      // These are the languages available in the CCHI registry
      const languages = [
        'Albanian', 'Amharic', 'Arabic', 'Armenian', 'ASL', 'Bengali', 'Bosnian',
        'Bulgarian', 'Burmese', 'Cambodian/Khmer', 'Cantonese', 'Cape Verdean',
        'Chuj', 'Croatian', 'Dari', 'Farsi', 'French', 'Fuzhou', 'German', 'Greek',
        'Gujarati', 'Haitian Creole', 'Hausa', 'Hindi', 'Hmong', 'Hungarian',
        'Ilocano', 'Indonesian', 'Italian', 'Japanese', 'Karen', 'K\'iche',
        'Kinyarwanda', 'Kirundi', 'Korean', 'Kurdish', 'Laotian', 'Lithuanian',
        'Mam', 'Mandarin', 'Marshallese', 'Mixteco', 'Navajo', 'Ndebele, Northern',
        'Nepali', 'Oromo', 'Pashto/Pushtu', 'Polish', 'Portuguese', 'Punjabi',
        'Q\'anjob\'al', 'Rohingya', 'Romanian', 'Russian', 'Serbian', 'Somali',
        'Spanish', 'Swahili', 'Swedish', 'Tagalog', 'Tamil', 'Telegu', 'Telugu',
        'Thai', 'Tibetan', 'Tigrinya', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese', 'Wolof'
      ];

      res.json({
        success: true,
        data: languages.map(lang => ({ value: lang, label: lang }))
      });

    } catch (error) {
      console.error('Error getting available languages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available languages',
        error: error.message
      });
    }
  }
}

module.exports = new ExternalRegistryController();
