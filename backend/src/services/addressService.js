const { Client } = require('@googlemaps/google-maps-services-js');
const loggerService = require('./loggerService');

class AddressService {
    constructor() {
        this.client = new Client({});
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    }

    // Validate and geocode address using Google Maps API
    async validateAndGeocodeAddress(addressData) {
        try {
            if (!this.apiKey) {
                await loggerService.warn('Google Maps API key not configured', {
                    category: 'ADDRESS'
                });
                return {
                    isValid: false,
                    error: 'Google Maps API key not configured'
                };
            }

            const addressString = this.formatAddressString(addressData);
            
            const response = await this.client.geocode({
                params: {
                    address: addressString,
                    key: this.apiKey,
                    region: 'us', // Bias results to US
                    components: {
                        country: 'US'
                    }
                }
            });

            if (response.data.status !== 'OK' || response.data.results.length === 0) {
                await loggerService.warn('Address validation failed', {
                    category: 'ADDRESS',
                    address: addressString,
                    status: response.data.status
                });

                return {
                    isValid: false,
                    error: 'Address could not be validated',
                    originalAddress: addressData
                };
            }

            const result = response.data.results[0];
            const addressComponents = this.parseAddressComponents(result.address_components);
            
            // Validate that this is a US address
            if (addressComponents.country !== 'US') {
                return {
                    isValid: false,
                    error: 'Only US addresses are supported',
                    originalAddress: addressData
                };
            }

            // Validate ZIP code format
            if (!this.isValidUSZipCode(addressComponents.postal_code)) {
                return {
                    isValid: false,
                    error: 'Invalid US ZIP code format',
                    originalAddress: addressData
                };
            }

            const validatedAddress = {
                isValid: true,
                formatted_address: result.formatted_address,
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
                place_id: result.place_id,
                
                // Parsed components
                street_number: addressComponents.street_number || '',
                route: addressComponents.route || '',
                street_address: `${addressComponents.street_number || ''} ${addressComponents.route || ''}`.trim(),
                city: addressComponents.locality || addressComponents.administrative_area_level_3 || '',
                county: addressComponents.administrative_area_level_2 || '',
                state: addressComponents.administrative_area_level_1 || '',
                state_code: addressComponents.administrative_area_level_1_short || '',
                zip_code: addressComponents.postal_code || '',
                zip_code_suffix: addressComponents.postal_code_suffix || '',
                country: addressComponents.country || '',
                country_code: addressComponents.country_short || '',
                
                // Additional data
                location_type: result.geometry.location_type,
                viewport: result.geometry.viewport,
                types: result.types,
                
                // Address quality indicators
                partial_match: result.partial_match || false,
                quality_score: this.calculateAddressQualityScore(result)
            };

            await loggerService.info('Address validated successfully', {
                category: 'ADDRESS',
                originalAddress: addressString,
                validatedAddress: validatedAddress.formatted_address,
                qualityScore: validatedAddress.quality_score
            });

            return validatedAddress;

        } catch (error) {
            await loggerService.error('Address validation error', error, {
                category: 'ADDRESS',
                address: addressData
            });

            return {
                isValid: false,
                error: 'Address validation service error',
                originalAddress: addressData
            };
        }
    }

    // Get address suggestions/autocomplete
    async getAddressSuggestions(input, sessionToken = null) {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'Google Maps API key not configured'
                };
            }

            const response = await this.client.placeAutocomplete({
                params: {
                    input: input,
                    key: this.apiKey,
                    types: ['address'],
                    components: 'country:us',
                    sessiontoken: sessionToken
                }
            });

            if (response.data.status !== 'OK') {
                await loggerService.warn('Address autocomplete failed', {
                    category: 'ADDRESS',
                    input,
                    status: response.data.status
                });

                return {
                    success: false,
                    error: 'Address suggestions not available'
                };
            }

            const suggestions = response.data.predictions.map(prediction => ({
                place_id: prediction.place_id,
                description: prediction.description,
                structured_formatting: prediction.structured_formatting,
                types: prediction.types,
                matched_substrings: prediction.matched_substrings
            }));

            await loggerService.info('Address suggestions retrieved', {
                category: 'ADDRESS',
                input,
                suggestionCount: suggestions.length
            });

            return {
                success: true,
                suggestions
            };

        } catch (error) {
            await loggerService.error('Address autocomplete error', error, {
                category: 'ADDRESS',
                input
            });

            return {
                success: false,
                error: 'Address suggestions service error'
            };
        }
    }

    // Get detailed address information from place_id
    async getPlaceDetails(placeId) {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'Google Maps API key not configured'
                };
            }

            const response = await this.client.placeDetails({
                params: {
                    place_id: placeId,
                    key: this.apiKey,
                    fields: [
                        'address_components',
                        'formatted_address',
                        'geometry',
                        'place_id',
                        'types'
                    ]
                }
            });

            if (response.data.status !== 'OK') {
                await loggerService.warn('Place details fetch failed', {
                    category: 'ADDRESS',
                    placeId,
                    status: response.data.status
                });

                return {
                    success: false,
                    error: 'Place details not available'
                };
            }

            const place = response.data.result;
            const addressComponents = this.parseAddressComponents(place.address_components);

            const placeDetails = {
                success: true,
                place_id: place.place_id,
                formatted_address: place.formatted_address,
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
                location_type: place.geometry.location_type,
                viewport: place.geometry.viewport,
                types: place.types,
                address_components: addressComponents
            };

            await loggerService.info('Place details retrieved', {
                category: 'ADDRESS',
                placeId,
                address: placeDetails.formatted_address
            });

            return placeDetails;

        } catch (error) {
            await loggerService.error('Place details error', error, {
                category: 'ADDRESS',
                placeId
            });

            return {
                success: false,
                error: 'Place details service error'
            };
        }
    }

    // Utility methods
    formatAddressString(addressData) {
        const parts = [];
        
        if (addressData.street_address) {
            parts.push(addressData.street_address);
        } else {
            if (addressData.street_number) parts.push(addressData.street_number);
            if (addressData.route) parts.push(addressData.route);
        }
        
        if (addressData.street_address_2) {
            parts.push(addressData.street_address_2);
        }
        
        if (addressData.city) parts.push(addressData.city);
        if (addressData.state) parts.push(addressData.state);
        if (addressData.zip_code) parts.push(addressData.zip_code);
        
        return parts.join(', ');
    }

    parseAddressComponents(components) {
        const parsed = {};
        
        components.forEach(component => {
            const types = component.types;
            
            if (types.includes('street_number')) {
                parsed.street_number = component.long_name;
            } else if (types.includes('route')) {
                parsed.route = component.long_name;
            } else if (types.includes('locality')) {
                parsed.locality = component.long_name;
            } else if (types.includes('administrative_area_level_3')) {
                parsed.administrative_area_level_3 = component.long_name;
            } else if (types.includes('administrative_area_level_2')) {
                parsed.administrative_area_level_2 = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
                parsed.administrative_area_level_1 = component.long_name;
                parsed.administrative_area_level_1_short = component.short_name;
            } else if (types.includes('postal_code')) {
                parsed.postal_code = component.long_name;
            } else if (types.includes('postal_code_suffix')) {
                parsed.postal_code_suffix = component.long_name;
            } else if (types.includes('country')) {
                parsed.country = component.long_name;
                parsed.country_short = component.short_name;
            }
        });
        
        return parsed;
    }

    isValidUSZipCode(zipCode) {
        if (!zipCode) return false;
        // US ZIP code format: 5 digits or 5+4 digits
        const zipRegex = /^\d{5}(-\d{4})?$/;
        return zipRegex.test(zipCode);
    }

    calculateAddressQualityScore(result) {
        let score = 100;
        
        // Reduce score for partial matches
        if (result.partial_match) {
            score -= 20;
        }
        
        // Reduce score based on location type
        switch (result.geometry.location_type) {
            case 'ROOFTOP':
                // Highest accuracy
                break;
            case 'RANGE_INTERPOLATED':
                score -= 10;
                break;
            case 'GEOMETRIC_CENTER':
                score -= 20;
                break;
            case 'APPROXIMATE':
                score -= 30;
                break;
        }
        
        // Reduce score if important components are missing
        const components = this.parseAddressComponents(result.address_components);
        if (!components.street_number) score -= 15;
        if (!components.route) score -= 15;
        if (!components.locality) score -= 10;
        if (!components.postal_code) score -= 10;
        
        return Math.max(0, score);
    }

    // Validate US address components according to USPS standards
    validateUSAddressComponents(addressData) {
        const errors = [];
        const warnings = [];

        // Street address validation
        if (!addressData.street_address || addressData.street_address.trim().length === 0) {
            errors.push('Street address is required');
        } else {
            // Check for PO Box format
            const poBoxRegex = /^(P\.?O\.?\s*Box|Post\s*Office\s*Box)\s+\d+/i;
            if (poBoxRegex.test(addressData.street_address)) {
                warnings.push('PO Box addresses may have limited service options');
            }

            // Check for apartment/unit indicators
            const unitRegex = /\b(apt|apartment|unit|ste|suite|#)\b/i;
            if (unitRegex.test(addressData.street_address) && !addressData.street_address_2) {
                warnings.push('Consider moving apartment/unit information to address line 2');
            }
        }

        // City validation
        if (!addressData.city || addressData.city.trim().length === 0) {
            errors.push('City is required');
        } else if (addressData.city.length > 100) {
            errors.push('City name is too long');
        }

        // State validation
        if (!addressData.state) {
            errors.push('State is required');
        }

        // ZIP code validation
        if (!addressData.zip_code) {
            errors.push('ZIP code is required');
        } else if (!this.isValidUSZipCode(addressData.zip_code)) {
            errors.push('Invalid ZIP code format (must be 5 digits or 5+4 format)');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

// Create singleton instance
const addressService = new AddressService();

module.exports = addressService;