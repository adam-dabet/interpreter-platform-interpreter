const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const addressService = require('../services/addressService');
const loggerService = require('../services/loggerService');
const { validationLogger } = require('../middleware/logging');

// Validate address
router.post('/validate', [
    body('street_address').trim().notEmpty().withMessage('Street address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('zip_code').matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid ZIP code format')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            validationLogger(errors.array(), req);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const addressData = {
            street_address: req.body.street_address,
            street_address_2: req.body.street_address_2,
            city: req.body.city,
            state: req.body.state,
            zip_code: req.body.zip_code
        };

        // First, validate US address components
        const componentValidation = addressService.validateUSAddressComponents(addressData);
        if (!componentValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Address validation failed',
                errors: componentValidation.errors,
                warnings: componentValidation.warnings
            });
        }

        // Then validate and geocode with Google Maps
        const result = await addressService.validateAndGeocodeAddress(addressData);

        if (!result.isValid) {
            return res.status(400).json({
                success: false,
                message: result.error,
                originalAddress: result.originalAddress
            });
        }

        // Include component validation warnings in successful response
        const response = {
            success: true,
            message: 'Address validated successfully',
            data: result
        };

        if (componentValidation.warnings.length > 0) {
            response.warnings = componentValidation.warnings;
        }

        res.json(response);

    } catch (error) {
        await loggerService.error('Address validation endpoint error', error, {
            category: 'ADDRESS',
            req
        });

        res.status(500).json({
            success: false,
            message: 'Address validation service error'
        });
    }
});

// Get address suggestions (autocomplete)
router.get('/suggestions', async (req, res) => {
    try {
        const { input, session_token } = req.query;

        if (!input || input.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Input must be at least 3 characters long'
            });
        }

        const result = await addressService.getAddressSuggestions(input.trim(), session_token);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            data: result.suggestions
        });

    } catch (error) {
        await loggerService.error('Address suggestions endpoint error', error, {
            category: 'ADDRESS',
            req,
            input: req.query.input
        });

        res.status(500).json({
            success: false,
            message: 'Address suggestions service error'
        });
    }
});

// Get place details by place_id
router.get('/place/:placeId', async (req, res) => {
    try {
        const { placeId } = req.params;

        if (!placeId) {
            return res.status(400).json({
                success: false,
                message: 'Place ID is required'
            });
        }

        const result = await addressService.getPlaceDetails(placeId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        await loggerService.error('Place details endpoint error', error, {
            category: 'ADDRESS',
            req,
            placeId: req.params.placeId
        });

        res.status(500).json({
            success: false,
            message: 'Place details service error'
        });
    }
});

// Geocode address (get coordinates from address)
router.post('/geocode', [
    body('address').trim().notEmpty().withMessage('Address is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            validationLogger(errors.array(), req);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const addressString = req.body.address;
        
        // Convert string to address object for validation
        const addressParts = addressString.split(',').map(part => part.trim());
        const addressData = {
            street_address: addressParts[0] || '',
            city: addressParts[1] || '',
            state: addressParts[2] || '',
            zip_code: addressParts[3] || ''
        };

        const result = await addressService.validateAndGeocodeAddress(addressData);

        if (!result.isValid) {
            return res.status(400).json({
                success: false,
                message: result.error,
                originalAddress: addressString
            });
        }

        res.json({
            success: true,
            message: 'Address geocoded successfully',
            data: {
                formatted_address: result.formatted_address,
                latitude: result.latitude,
                longitude: result.longitude,
                place_id: result.place_id,
                location_type: result.location_type,
                quality_score: result.quality_score
            }
        });

    } catch (error) {
        await loggerService.error('Geocoding endpoint error', error, {
            category: 'ADDRESS',
            req,
            address: req.body.address
        });

        res.status(500).json({
            success: false,
            message: 'Geocoding service error'
        });
    }
});

module.exports = router;