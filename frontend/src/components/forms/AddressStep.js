import React, { useState, useEffect, useRef } from 'react';
import { MapPinIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Loader } from '@googlemaps/js-api-loader';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

const AddressStep = ({ formData, onNext, onPrevious, isFirstStep, parametricData, onUpdate }) => {
    const [addressData, setAddressData] = useState({
        street_address: formData.street_address || '',
        street_address_2: formData.street_address_2 || '',
        city: formData.city || '',
        state_id: formData.state_id || '',
        zip_code: formData.zip_code || '',
        county: formData.county || '',
        formatted_address: formData.formatted_address || '',
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        place_id: formData.place_id || ''
    });

    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
    const [errors, setErrors] = useState({});

    const autocompleteRef = useRef(null);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    // Load Google Maps API
    useEffect(() => {
        const loadGoogleMaps = async () => {
            try {
                const loader = new Loader({
                    apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
                    version: 'weekly',
                    libraries: ['places', 'geometry']
                });

                await loader.load();
                setGoogleMapsLoaded(true);
                console.log('Google Maps loaded successfully');
            } catch (error) {
                console.error('Error loading Google Maps:', error);
                toast.error('Failed to load Google Maps');
            }
        };

        if (process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
            loadGoogleMaps();
        } else {
            console.error('Google Maps API key not configured');
            toast.error('Google Maps API key not configured');
        }
    }, []);

    // Initialize map when Google Maps is loaded and we have coordinates
    useEffect(() => {
        if (googleMapsLoaded && addressData.latitude && addressData.longitude && mapRef.current && !mapInstanceRef.current) {
            initializeMap();
        }
    }, [googleMapsLoaded, addressData.latitude, addressData.longitude]);

    const initializeMap = () => {
        if (!window.google || !mapRef.current) return;

        const position = {
            lat: parseFloat(addressData.latitude),
            lng: parseFloat(addressData.longitude)
        };

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: position,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
        });

        markerRef.current = new window.google.maps.Marker({
            position: position,
            map: mapInstanceRef.current,
            title: addressData.formatted_address || 'Your Location'
        });
    };

    const updateMap = (lat, lng) => {
        if (mapInstanceRef.current && markerRef.current) {
            const position = { lat: parseFloat(lat), lng: parseFloat(lng) };
            mapInstanceRef.current.setCenter(position);
            markerRef.current.setPosition(position);
        } else if (googleMapsLoaded) {
            initializeMap();
        }
    };

    const handleInputChange = (field, value) => {
        const updatedData = {
            ...addressData,
            [field]: value
        };
        
        setAddressData(updatedData);

        // Update parent component
        if (onUpdate) {
            onUpdate(updatedData);
        }

        // Clear validation when user starts typing
        if (validationResult) {
            setValidationResult(null);
        }

        // Clear specific field error
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }

        // Get suggestions for street address
        if (field === 'street_address' && value.length >= 3) {
            getSuggestions(value);
        } else if (field === 'street_address' && value.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const getSuggestions = async (input) => {
        try {
            if (!window.google || !window.google.maps || !window.google.maps.places) {
                console.error('Google Maps Places API not loaded');
                return;
            }

            const service = new window.google.maps.places.AutocompleteService();
            const request = {
                input: input,
                types: ['address'],
                componentRestrictions: { country: 'us' }
            };

            service.getPlacePredictions(request, (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    const formattedSuggestions = predictions.map(prediction => ({
                        place_id: prediction.place_id,
                        description: prediction.description,
                        structured_formatting: prediction.structured_formatting,
                        types: prediction.types,
                        matched_substrings: prediction.matched_substrings
                    }));
                    setSuggestions(formattedSuggestions);
                    setShowSuggestions(true);
                } else {
                    console.log('No predictions found or error:', status);
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            });
        } catch (error) {
            console.error('Error getting suggestions:', error);
        }
    };

    const handleSuggestionClick = async (suggestion) => {
        setShowSuggestions(false);
        setSuggestions([]);

        try {
            if (!window.google || !window.google.maps || !window.google.maps.places) {
                console.error('Google Maps Places API not loaded');
                return;
            }

            const service = new window.google.maps.places.PlacesService(document.createElement('div'));
            const request = {
                placeId: suggestion.place_id,
                fields: ['address_components', 'formatted_address', 'geometry', 'place_id', 'types']
            };

            service.getDetails(request, (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                    const components = parseAddressComponents(place.address_components);

                    const updatedData = {
                        ...addressData,
                        street_address: `${components.street_number || ''} ${components.route || ''}`.trim(),
                        city: components.locality || components.administrative_area_level_3 || '',
                        state_id: getStateIdByCode(components.administrative_area_level_1_short),
                        zip_code: components.postal_code || '',
                        county: components.administrative_area_level_2 || '',
                        formatted_address: place.formatted_address,
                        latitude: place.geometry.location.lat(),
                        longitude: place.geometry.location.lng(),
                        place_id: place.place_id
                    };

                    setAddressData(updatedData);

                    // Update parent component
                    if (onUpdate) {
                        onUpdate(updatedData);
                    }

                    if (place.geometry.location) {
                        updateMap(place.geometry.location.lat(), place.geometry.location.lng());
                    }

                    toast.success('Address auto-filled from selection');
                } else {
                    console.error('Error getting place details:', status);
                    toast.error('Failed to get address details');
                }
            });
        } catch (error) {
            console.error('Error getting place details:', error);
            toast.error('Failed to get address details');
        }
    };

    const getStateIdByCode = (stateCode) => {
        const state = parametricData.usStates.find(s => s.code === stateCode);
        return state ? state.id : '';
    };

    const parseAddressComponents = (components) => {
        const result = {};
        components.forEach(component => {
            const types = component.types;
            if (types.includes('street_number')) {
                result.street_number = component.long_name;
            } else if (types.includes('route')) {
                result.route = component.long_name;
            } else if (types.includes('locality')) {
                result.locality = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
                result.administrative_area_level_1 = component.long_name;
                result.administrative_area_level_1_short = component.short_name;
            } else if (types.includes('administrative_area_level_2')) {
                result.administrative_area_level_2 = component.long_name;
            } else if (types.includes('administrative_area_level_3')) {
                result.administrative_area_level_3 = component.long_name;
            } else if (types.includes('postal_code')) {
                result.postal_code = component.long_name;
            } else if (types.includes('country')) {
                result.country = component.long_name;
                result.country_short = component.short_name;
            }
        });
        return result;
    };

    const validateAddress = async () => {
        setIsValidating(true);
        setValidationResult(null);
        setErrors({});

        try {
            if (!window.google || !window.google.maps || !window.google.maps.places) {
                throw new Error('Google Maps API not loaded');
            }

            const geocoder = new window.google.maps.Geocoder();
            const addressString = `${addressData.street_address}, ${addressData.city}, ${addressData.state_id}, ${addressData.zip_code}`;

            geocoder.geocode({ address: addressString }, (results, status) => {
                if (status === window.google.maps.GeocoderStatus.OK && results.length > 0) {
                    const result = results[0];
                    const components = parseAddressComponents(result.address_components);

                    // Update form data with validated address
                    setAddressData(prev => ({
                        ...prev,
                        formatted_address: result.formatted_address,
                        latitude: result.geometry.location.lat(),
                        longitude: result.geometry.location.lng(),
                        place_id: result.place_id,
                        county: components.administrative_area_level_2 || prev.county
                    }));

                    if (result.geometry.location) {
                        updateMap(result.geometry.location.lat(), result.geometry.location.lng());
                    }

                    setValidationResult({
                        success: true,
                        message: 'Address validated successfully',
                        data: {
                            formatted_address: result.formatted_address,
                            latitude: result.geometry.location.lat(),
                            longitude: result.geometry.location.lng(),
                            place_id: result.place_id
                        }
                    });

                    toast.success('Address validated successfully');
                } else {
                    setValidationResult({
                        success: false,
                        message: 'Address could not be validated. Please check your input.'
                    });
                    toast.error('Address validation failed');
                }
                setIsValidating(false);
            });
        } catch (error) {
            console.error('Address validation error:', error);
            setValidationResult({
                success: false,
                message: error.message || 'Failed to validate address'
            });
            toast.error(error.message || 'Failed to validate address');
            setIsValidating(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!addressData.street_address.trim()) {
            newErrors.street_address = 'Street address is required';
        }

        if (!addressData.city.trim()) {
            newErrors.city = 'City is required';
        }

        if (!addressData.state_id) {
            newErrors.state_id = 'State is required';
        }

        if (!addressData.zip_code.trim()) {
            newErrors.zip_code = 'ZIP code is required';
        } else if (!/^\d{5}(-\d{4})?$/.test(addressData.zip_code)) {
            newErrors.zip_code = 'Invalid ZIP code format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (!validateForm()) {
            toast.error('Please fix the errors before continuing');
            return;
        }

        if (!validationResult?.success) {
            toast.error('Please validate your address before continuing');
            return;
        }

        onNext(addressData);
    };

    return (
        <div className="space-y-6">
            {/* Address Input Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <div className="relative">
                        <Input
                            label="Street Address"
                            type="text"
                            value={addressData.street_address}
                            onChange={(e) => handleInputChange('street_address', e.target.value)}
                            error={errors.street_address}
                            placeholder="123 Main Street"
                            required
                        />
                        
                        {/* Address Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        <div className="font-medium text-gray-900">
                                            {suggestion.structured_formatting.main_text}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {suggestion.structured_formatting.secondary_text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <Input
                        label="Address Line 2 (Optional)"
                        type="text"
                        value={addressData.street_address_2}
                        onChange={(e) => handleInputChange('street_address_2', e.target.value)}
                        placeholder="Apartment, suite, unit, etc."
                    />
                </div>

                <div>
                    <Input
                        label="City"
                        type="text"
                        value={addressData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        error={errors.city}
                        placeholder="New York"
                        required
                    />
                </div>

                <div>
                    <Select
                        label="State"
                        value={addressData.state_id}
                        onChange={(e) => handleInputChange('state_id', e.target.value)}
                        error={errors.state_id}
                        required
                    >
                        <option value="">Select State</option>
                        {parametricData.usStates.map(state => (
                            <option key={state.id} value={state.id}>
                                {state.name}
                            </option>
                        ))}
                    </Select>
                </div>

                <div>
                    <Input
                        label="ZIP Code"
                        type="text"
                        value={addressData.zip_code}
                        onChange={(e) => handleInputChange('zip_code', e.target.value)}
                        error={errors.zip_code}
                        placeholder="12345 or 12345-6789"
                        required
                    />
                </div>

                <div>
                    <Input
                        label="County (Optional)"
                        type="text"
                        value={addressData.county}
                        onChange={(e) => handleInputChange('county', e.target.value)}
                        placeholder="County name"
                    />
                </div>
            </div>

            {/* Address Validation */}
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Address Validation</h3>
                    <Button
                        onClick={validateAddress}
                        disabled={isValidating}
                        variant="outline"
                        size="sm"
                    >
                        {isValidating ? (
                            <>
                                <LoadingSpinner size="sm" className="mr-2" />
                                Validating...
                            </>
                        ) : (
                            <>
                                <MapPinIcon className="w-4 h-4 mr-2" />
                                Validate Address
                            </>
                        )}
                    </Button>
                </div>

                {validationResult && (
                    <div className={`p-4 rounded-md ${
                        validationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                        <div className="flex items-start">
                            {validationResult.success ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                            ) : (
                                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                                <p className={`font-medium ${
                                    validationResult.success ? 'text-green-800' : 'text-red-800'
                                }`}>
                                    {validationResult.message}
                                </p>
                                
                                {validationResult.success && validationResult.data?.formatted_address && (
                                    <p className="text-green-700 text-sm mt-2">
                                        <strong>Formatted Address:</strong> {validationResult.data.formatted_address}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Map Display */}
            {googleMapsLoaded && addressData.latitude && addressData.longitude && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Location Preview</h3>
                    <div
                        ref={mapRef}
                        className="w-full h-64 rounded-md"
                        style={{ minHeight: '250px' }}
                    />
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
                {!isFirstStep && (
                    <Button
                        onClick={onPrevious}
                        variant="outline"
                    >
                        Previous
                    </Button>
                )}
                
                <div className={isFirstStep ? 'ml-auto' : ''}>
                    <Button
                        onClick={handleNext}
                        disabled={!validationResult?.success}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddressStep; 