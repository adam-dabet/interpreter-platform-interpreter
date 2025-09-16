const axios = require('axios');
const cheerio = require('cheerio');

class ExternalRegistryService {
  constructor() {
    this.cchiBaseUrl = 'https://cchi.learningbuilder.com/Search/Public/MemberRole/Registry';
    this.requestDelay = 2000; // 2 seconds delay between requests
    this.lastRequestTime = 0;
  }

  /**
   * Add delay between requests to be respectful to the CCHI server
   */
  async addRequestDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const delay = this.requestDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Generate CCHI search URL for manual search
   * @param {Object} searchCriteria - Search parameters
   * @param {string} searchCriteria.state - State abbreviation (e.g., 'CA', 'NY')
   * @param {string} searchCriteria.city - City name
   * @param {string} searchCriteria.zipCode - ZIP code
   * @param {string} searchCriteria.language - Primary language
   * @param {string} searchCriteria.certificationStatus - Certification status filter
   * @returns {string} CCHI search URL
   */
  generateCCHISearchUrl(searchCriteria) {
    const {
      state = '',
      city = '',
      zipCode = '',
      language = '',
      certificationStatus = 'CHI'
    } = searchCriteria;

    // For ZIP code, if it's only 2 digits, we'll use it as a prefix for broader search
    // If it's a full ZIP code, we'll use the first 2 digits
    let zipCodeForSearch = zipCode;
    if (zipCode && zipCode.length > 2) {
      zipCodeForSearch = zipCode.substring(0, 2);
    }

    const params = new URLSearchParams({
      'model.FirstName': '',
      'model.LastName': '',
      'model.City': city,
      'model.State': state,
      'model.MailCode': zipCodeForSearch,
      'model.PrimaryLanguage': language,
      'model.MemberRoleStatus': certificationStatus
    });

    return `${this.cchiBaseUrl}?${params.toString()}`;
  }

  /**
   * Search CCHI registry for interpreters based on job requirements
   * Note: Due to CCHI's terms of use, this method provides a search URL and instructions
   * for manual verification rather than automated scraping
   * @param {Object} searchCriteria - Search parameters
   * @param {string} searchCriteria.state - State abbreviation (e.g., 'CA', 'NY')
   * @param {string} searchCriteria.city - City name
   * @param {string} searchCriteria.zipCode - ZIP code
   * @param {string} searchCriteria.language - Primary language
   * @param {string} searchCriteria.certificationStatus - Certification status filter
   * @returns {Promise<Object>} Search instructions and URL
   */
  async searchCCHIRegistry(searchCriteria) {
    try {
      const {
        state = '',
        city = '',
        zipCode = '',
        language = '',
        certificationStatus = 'CHI'
      } = searchCriteria;

      console.log('Generating CCHI search URL for criteria:', searchCriteria);

      // Generate the search URL
      const searchUrl = this.generateCCHISearchUrl(searchCriteria);

      // Return instructions for manual search instead of scraping
      return {
        searchUrl: searchUrl,
        instructions: {
          title: 'Manual CCHI Registry Search Required',
          message: 'Due to CCHI\'s terms of use, automated scraping is not permitted. Please use the provided URL to search manually.',
          steps: [
            'Click the search URL below to open the CCHI registry',
            'Review the search results for certified interpreters',
            'Contact interpreters directly using their provided contact information',
            'Verify certification status using the "Download verification" links',
            'Add suitable interpreters to your internal system manually'
          ],
          searchCriteria: searchCriteria,
          alternativeActions: [
            'Contact CCHI directly for bulk data access',
            'Use the registry for individual verification only',
            'Consider building relationships with local interpreter associations'
          ]
        }
      };

    } catch (error) {
      console.error('Error generating CCHI search URL:', error.message);
      throw new Error(`Failed to generate CCHI search URL: ${error.message}`);
    }
  }

  /**
   * Parse interpreter data from a table row
   * @param {Object} $row - Cheerio object for the row
   * @param {Object} $ - Cheerio root object
   * @returns {Object|null} Parsed interpreter data or null
   */
  parseInterpreterRow($row, $) {
    const $cells = $row.find('td, .cell, .field');
    if ($cells.length < 3) return null;

    const text = $row.text().trim();
    const parts = text.split(/\s+/).filter(part => part.length > 0);

    // Try to identify name patterns
    let firstName = '';
    let lastName = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let primaryLanguage = '';
    let certificationStatus = '';
    let email = '';
    let verificationLink = '';

    // Look for email addresses
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      email = emailMatch[1];
    }

    // Look for verification links
    const verificationMatch = $row.find('a[href*="verification"], a[href*="download"]').attr('href');
    if (verificationMatch) {
      verificationLink = verificationMatch.startsWith('http') ? verificationMatch : `https://cchi.learningbuilder.com${verificationMatch}`;
    }

    // Try to parse structured data from cells
    $cells.each((index, cell) => {
      const cellText = $(cell).text().trim();
      
      // Look for name patterns (usually first two non-empty cells)
      if (index === 0 && !firstName && cellText.length > 0) {
        const nameParts = cellText.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      } else if (index === 1 && !lastName && cellText.length > 0 && !firstName) {
        lastName = cellText;
      }
      
      // Look for location data
      if (cellText.match(/^[A-Z]{2}$/)) {
        state = cellText;
      } else if (cellText.match(/^\d{5}(-\d{4})?$/)) {
        zipCode = cellText;
      } else if (cellText.length > 2 && !state && !zipCode && !primaryLanguage) {
        // Could be city or language
        if (cellText.includes(',') || cellText.match(/^[A-Z][a-z]+$/)) {
          city = cellText.replace(',', '').trim();
        }
      }
      
      // Look for language (common language names)
      const languages = ['Spanish', 'Mandarin', 'Cantonese', 'French', 'German', 'Arabic', 'Russian', 'Japanese', 'Korean', 'Portuguese', 'Italian', 'Vietnamese', 'Tagalog', 'Hindi', 'Urdu', 'Bengali', 'Punjabi', 'Tamil', 'Telugu', 'Gujarati', 'Marathi', 'Malayalam', 'Kannada', 'Odia', 'Assamese', 'Nepali', 'Sinhala', 'Tibetan', 'Burmese', 'Thai', 'Lao', 'Khmer', 'Indonesian', 'Malay', 'Filipino', 'Hmong', 'Somali', 'Swahili', 'Amharic', 'Tigrinya', 'Oromo', 'Hausa', 'Yoruba', 'Igbo', 'Zulu', 'Xhosa', 'Afrikaans', 'Dutch', 'Danish', 'Swedish', 'Norwegian', 'Finnish', 'Icelandic', 'Polish', 'Czech', 'Slovak', 'Hungarian', 'Romanian', 'Bulgarian', 'Croatian', 'Serbian', 'Bosnian', 'Albanian', 'Macedonian', 'Slovenian', 'Estonian', 'Latvian', 'Lithuanian', 'Ukrainian', 'Belarusian', 'Moldovan', 'Georgian', 'Armenian', 'Azerbaijani', 'Kazakh', 'Kyrgyz', 'Tajik', 'Turkmen', 'Uzbek', 'Mongolian', 'Hebrew', 'Persian', 'Pashto', 'Dari', 'Kurdish', 'Turkish', 'Greek', 'Maltese', 'Basque', 'Catalan', 'Galician', 'Welsh', 'Irish', 'Scottish', 'Breton', 'Corsican', 'Sardinian', 'Frisian', 'Luxembourgish', 'ASL', 'BSL', 'LSF', 'DGS', 'NTS', 'Auslan', 'NZSL', 'ISL', 'FSL', 'LIS', 'LSC', 'CSL', 'JSL', 'KSL', 'TSL'];
      
      if (languages.some(lang => cellText.includes(lang))) {
        primaryLanguage = cellText;
      }
      
      // Look for certification status
      if (['CHI', 'CoreCHI', 'CoreCHI-P', 'Candidate'].includes(cellText)) {
        certificationStatus = cellText;
      }
    });

    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.trim(),
      primaryLanguage: primaryLanguage.trim(),
      certificationStatus: certificationStatus.trim(),
      email: email.trim() || null,
      verificationLink: verificationLink.trim() || null
    };
  }

  /**
   * Parse interpreter data from a structured item element
   * @param {Object} $item - Cheerio object for the item
   * @param {Object} $ - Cheerio root object
   * @returns {Object|null} Parsed interpreter data or null
   */
  parseInterpreterItem($item, $) {
    const text = $item.text().trim();
    if (text.length < 10) return null;

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const email = emailMatch ? emailMatch[1] : null;

    // Extract verification link
    const verificationLink = $item.find('a[href*="verification"], a[href*="download"]').attr('href');
    const fullVerificationLink = verificationLink ? 
      (verificationLink.startsWith('http') ? verificationLink : `https://cchi.learningbuilder.com${verificationLink}`) : null;

    // Try to extract structured data using common selectors
    return {
      firstName: $item.find('.first-name, .name .first, [class*="first"]').first().text().trim(),
      lastName: $item.find('.last-name, .name .last, [class*="last"]').first().text().trim(),
      city: $item.find('.city, [class*="city"]').first().text().trim(),
      state: $item.find('.state, [class*="state"]').first().text().trim(),
      zipCode: $item.find('.zip, .mail-code, [class*="zip"], [class*="mail"]').first().text().trim(),
      primaryLanguage: $item.find('.primary-language, .language, [class*="language"]').first().text().trim(),
      certificationStatus: $item.find('.certification-status, .status, [class*="status"]').first().text().trim(),
      email: email,
      verificationLink: fullVerificationLink
    };
  }

  /**
   * Search for interpreters based on job requirements
   * @param {Object} jobRequirements - Job requirements
   * @param {string} jobRequirements.language - Required language
   * @param {string} jobRequirements.state - Job state
   * @param {string} jobRequirements.city - Job city
   * @param {string} jobRequirements.zipCode - Job ZIP code
   * @param {string} jobRequirements.certificationType - Required certification type
   * @returns {Promise<Object>} Search results with URL and instructions
   */
  async findSuitableInterpreters(jobRequirements) {
    try {
      const {
        language,
        state,
        city,
        zipCode,
        certificationType = 'CHI' // Default to CHI certified
      } = jobRequirements;

      // Generate CCHI search URL and instructions
      const cchiResults = await this.searchCCHIRegistry({
        state,
        city,
        zipCode,
        language,
        certificationStatus: certificationType
      });

      // Return the search instructions and URL
      return {
        searchUrl: cchiResults.searchUrl,
        instructions: cchiResults.instructions,
        jobRequirements: jobRequirements,
        sources: ['CCHI'],
        totalFound: 0, // Will be determined after manual search
        note: 'Manual search required due to CCHI terms of use'
      };

    } catch (error) {
      console.error('Error finding suitable interpreters:', error.message);
      throw error;
    }
  }

  /**
   * Calculate distance between two locations (simplified)
   * @param {Object} location1 - First location
   * @param {Object} location2 - Second location
   * @returns {number} Distance score (lower is better)
   */
  calculateDistance(location1, location2) {
    // Simple distance calculation based on state and city match
    let distance = 0;
    
    if (location1.state !== location2.state) {
      distance += 100; // Different state
    }
    
    if (location1.city.toLowerCase() !== location2.city.toLowerCase()) {
      distance += 50; // Different city
    }
    
    // If ZIP codes are available, use them for more precise calculation
    if (location1.zipCode && location2.zipCode) {
      const zip1 = parseInt(location1.zipCode.substring(0, 5));
      const zip2 = parseInt(location2.zipCode.substring(0, 5));
      distance += Math.abs(zip1 - zip2) / 1000; // Rough ZIP code distance
    }
    
    return distance;
  }

  /**
   * Calculate match score for an interpreter
   * @param {Object} interpreter - Interpreter data
   * @param {Object} jobRequirements - Job requirements
   * @returns {number} Match score (higher is better)
   */
  calculateMatchScore(interpreter, jobRequirements) {
    let score = 0;
    
    // Language match (most important)
    if (interpreter.primaryLanguage.toLowerCase() === jobRequirements.language.toLowerCase()) {
      score += 100;
    }
    
    // State match
    if (interpreter.state === jobRequirements.state) {
      score += 50;
    }
    
    // City match
    if (interpreter.city.toLowerCase() === jobRequirements.city.toLowerCase()) {
      score += 30;
    }
    
    // Certification status
    if (interpreter.certificationStatus === 'CHI') {
      score += 20;
    } else if (interpreter.certificationStatus === 'CoreCHI') {
      score += 15;
    }
    
    return score;
  }
}

module.exports = new ExternalRegistryService();
