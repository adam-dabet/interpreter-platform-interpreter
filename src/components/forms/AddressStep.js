import React, { useState, useEffect, useRef } from 'react';
import { MapPinIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import googleMapsLoader from '../../utils/googleMapsLoader';

const AddressStep = ({ formData, onNext, onPrevious, isFirstStep, isEditing, parametricData, onUpdate, rejectedFields = [] }) => {
    // Debug: Log parametric data
    console.log('AddressStep - Received parametric data:', parametricData);
    console.log('AddressStep - US States:', parametricData?.usStates);
    
    // Helper to check if field is rejected
    const isFieldRejected = (fieldName) => rejectedFields.includes(fieldName);
    
    const [addressData, setAddressData] = useState({
        street_address: formData.street_address || '',
        street_address_2: formData.street_address_2 || '',
        formatted_address: formData.formatted_address || '',
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        place_id: formData.place_id || '',
        city: formData.city || '',
        state_id: formData.state_id || null,
        zip_code: formData.zip_code || ''
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
                await googleMapsLoader.load(['places', 'geometry']);
                setGoogleMapsLoaded(true);
            } catch (error) {
                console.error('Error loading Google Maps:', error);
                toast.error('Failed to load Google Maps');
            }
        };

        loadGoogleMaps();
    }, []);

    // Initialize map when Google Maps is loaded and we have coordinates
    useEffect(() => {
        if (googleMapsLoaded && addressData.latitude && addressData.longitude && mapRef.current && !mapInstanceRef.current) {
            initializeMap();
        }
    }, [googleMapsLoaded, addressData.latitude, addressData.longitude]);

    // Check if address was already validated when component mounts (i.e., user is coming back from a later step)
    useEffect(() => {
        if (formData.latitude && formData.longitude && formData.place_id && !validationResult) {
            // Address has coordinates and place_id, meaning it was previously validated
            setValidationResult({
                success: true,
                message: 'Address validated successfully',
                data: {
                    formatted_address: formData.formatted_address,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    place_id: formData.place_id,
                    city: formData.city,
                    state_id: formData.state_id,
                    zip_code: formData.zip_code
                }
            });
        }
    }, []); // Only run on mount





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

        // Clear validation ONLY when street_address changes, not when street_address_2 changes
        // This allows users to add/remove apartment numbers without invalidating the address
        if (field === 'street_address' && validationResult) {
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

        // Check if the typed address exactly matches a suggestion
        if (field === 'street_address' && suggestions.length > 0) {
            const exactMatch = suggestions.find(suggestion => 
                suggestion.description.toLowerCase() === value.toLowerCase() ||
                suggestion.structured_formatting.main_text.toLowerCase() === value.toLowerCase()
            );
            
            if (exactMatch) {
                // Automatically use the place_id from the exact match
                const updatedDataWithPlaceId = {
                    ...updatedData,
                    place_id: exactMatch.place_id
                };
                setAddressData(updatedDataWithPlaceId);
                if (onUpdate) {
                    onUpdate(updatedDataWithPlaceId);
                }
            }
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
                        formatted_address: place.formatted_address,
                        latitude: place.geometry.location.lat(),
                        longitude: place.geometry.location.lng(),
                        place_id: place.place_id,
                        city: components.locality || '',
                        state_id: findStateId(components.administrative_area_level_1_short),
                        zip_code: components.postal_code || ''
                    };

                    setAddressData(updatedData);

                    // Update parent component
                    if (onUpdate) {
                        onUpdate(updatedData);
                    }

                    if (place.geometry.location) {
                        updateMap(place.geometry.location.lat(), place.geometry.location.lng());
                    }

                    // Set validation result so user doesn't need to click "Validate Address"
                    setValidationResult({
                        success: true,
                        message: 'Address validated successfully from selection',
                        data: {
                            formatted_address: place.formatted_address,
                            latitude: place.geometry.location.lat(),
                            longitude: place.geometry.location.lng(),
                            place_id: place.place_id,
                            city: components.locality || '',
                            state_id: findStateId(components.administrative_area_level_1_short),
                            zip_code: components.postal_code || ''
                        }
                    });

                    toast.success('Address auto-filled and validated from selection');
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

    // Helper function to find state_id from state code
    const findStateId = (stateCode) => {
        console.log('findStateId - Looking for state code:', stateCode);
        console.log('findStateId - Available states:', parametricData?.usStates);
        
        if (!parametricData?.usStates || !stateCode) {
            console.log('findStateId - No parametric data or state code, returning null');
            return null;
        }
        
        const state = parametricData.usStates.find(s => s.code === stateCode);
        console.log('findStateId - Found state:', state);
        return state ? state.id : null;
    };

    const validateAddress = async () => {
        setIsValidating(true);
        setValidationResult(null);
        setErrors({});

        try {
            if (!googleMapsLoaded) {
                throw new Error('Google Maps API is still loading. Please wait a moment and try again.');
            }

            if (!window.google || !window.google.maps || !window.google.maps.places) {
                throw new Error('Google Maps API not loaded');
            }

            // If we have a place_id, use it directly instead of geocoding
            if (addressData.place_id) {
                const service = new window.google.maps.places.PlacesService(document.createElement('div'));
                const request = {
                    placeId: addressData.place_id,
                    fields: ['address_components', 'formatted_address', 'geometry', 'place_id', 'types']
                };

                const timeoutId = setTimeout(() => {
                    setValidationResult({
                        success: false,
                        message: 'Address validation timed out. Please try again.'
                    });
                    toast.error('Address validation timed out');
                    setIsValidating(false);
                }, 10000);

                service.getDetails(request, (place, status) => {
                    clearTimeout(timeoutId);
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                        const components = parseAddressComponents(place.address_components);

                        setAddressData(prev => ({
                            ...prev,
                            street_address: `${components.street_number || ''} ${components.route || ''}`.trim() || prev.street_address,
                            formatted_address: place.formatted_address,
                            latitude: place.geometry.location.lat(),
                            longitude: place.geometry.location.lng(),
                            place_id: place.place_id,
                            city: components.locality || '',
                            state_id: findStateId(components.administrative_area_level_1_short),
                            zip_code: components.postal_code || ''
                        }));

                        if (place.geometry.location) {
                            updateMap(place.geometry.location.lat(), place.geometry.location.lng());
                        }

                        setValidationResult({
                            success: true,
                            message: 'Address validated successfully using place ID',
                            data: {
                                formatted_address: place.formatted_address,
                                latitude: place.geometry.location.lat(),
                                longitude: place.geometry.location.lng(),
                                place_id: place.place_id,
                                city: components.locality || '',
                                state_id: findStateId(components.administrative_area_level_1_short),
                                zip_code: components.postal_code || ''
                            }
                        });

                        toast.success('Address validated successfully');
                    } else {
                        // Fall back to geocoding if place_id fails
                        performGeocoding();
                    }
                    setIsValidating(false);
                });
            } else {
                // No place_id, use geocoding
                performGeocoding();
            }
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

    const performGeocoding = () => {
        const geocoder = new window.google.maps.Geocoder();
        // Build complete address string including address line 2
        let addressString = addressData.street_address;
        if (addressData.street_address_2 && addressData.street_address_2.trim()) {
            addressString += ', ' + addressData.street_address_2.trim();
        }

        // Add timeout to prevent hanging
        const timeoutId = setTimeout(() => {
            setValidationResult({
                success: false,
                message: 'Address validation timed out. Please try again.'
            });
            toast.error('Address validation timed out');
            setIsValidating(false);
        }, 10000); // 10 second timeout

        geocoder.geocode({ address: addressString }, (results, status) => {
                clearTimeout(timeoutId); // Clear timeout if geocoding completes
                if (status === window.google.maps.GeocoderStatus.OK && results.length > 0) {
                    const result = results[0];
                    const components = parseAddressComponents(result.address_components);

                    // Update form data with validated address
                    setAddressData(prev => ({
                        ...prev,
                        street_address: `${components.street_number || ''} ${components.route || ''}`.trim() || prev.street_address,
                        formatted_address: result.formatted_address,
                        latitude: result.geometry.location.lat(),
                        longitude: result.geometry.location.lng(),
                        place_id: result.place_id,
                        city: components.locality || '',
                        state_id: findStateId(components.administrative_area_level_1_short),
                        zip_code: components.postal_code || ''
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
                            place_id: result.place_id,
                            city: components.locality || '',
                            state_id: findStateId(components.administrative_area_level_1_short),
                            zip_code: components.postal_code || ''
                        }
                    });

                    toast.success('Address validated successfully');
                } else {
                    // Try with just the street address if the full address failed
                    if (addressData.street_address_2 && addressData.street_address_2.trim()) {
                        const fallbackTimeoutId = setTimeout(() => {
                            setValidationResult({
                                success: false,
                                message: 'Address validation timed out. Please try again.'
                            });
                            toast.error('Address validation timed out');
                            setIsValidating(false);
                        }, 10000);

                        geocoder.geocode({ address: addressData.street_address }, (results2, status2) => {
                            clearTimeout(fallbackTimeoutId);
                            if (status2 === window.google.maps.GeocoderStatus.OK && results2.length > 0) {
                                const result = results2[0];
                                const components = parseAddressComponents(result.address_components);

                                setAddressData(prev => ({
                                    ...prev,
                                    street_address: `${components.street_number || ''} ${components.route || ''}`.trim() || prev.street_address,
                                    formatted_address: result.formatted_address,
                                    latitude: result.geometry.location.lat(),
                                    longitude: result.geometry.location.lng(),
                                    place_id: result.place_id,
                                    city: components.locality || '',
                                    state_id: findStateId(components.administrative_area_level_1_short),
                                    zip_code: components.postal_code || ''
                                }));

                                if (result.geometry.location) {
                                    updateMap(result.geometry.location.lat(), result.geometry.location.lng());
                                }

                                setValidationResult({
                                    success: true,
                                    message: 'Address validated successfully (address line 2 ignored)',
                                    data: {
                                        formatted_address: result.formatted_address,
                                        latitude: result.geometry.location.lat(),
                                        longitude: result.geometry.location.lng(),
                                        place_id: result.place_id,
                                        city: components.locality || '',
                                        state_id: findStateId(components.administrative_area_level_1_short),
                                        zip_code: components.postal_code || ''
                                    }
                                });

                                toast.success('Address validated successfully (address line 2 ignored)');
                            } else {
                                setValidationResult({
                                    success: false,
                                    message: 'Address could not be validated. Please check your input and try again.'
                                });
                                toast.error('Address validation failed');
                            }
                            setIsValidating(false);
                        });
                    } else {
                        setValidationResult({
                            success: false,
                            message: 'Address could not be validated. Please check your input and try again.'
                        });
                        toast.error('Address validation failed');
                        setIsValidating(false);
                    }
                }
            });
        };

    const validateForm = () => {
        const newErrors = {};

        if (!addressData.street_address.trim()) {
            newErrors.street_address = 'Street address is required';
        } else if (addressData.street_address.trim().length < 5) {
            newErrors.street_address = 'Street address is too short';
        } else if (addressData.street_address.trim().length > 200) {
            newErrors.street_address = 'Street address is too long';
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

        // Debug: Log the address data being sent
        console.log('AddressStep - Sending address data:', addressData);
        console.log('AddressStep - Validation result:', validationResult);

        onNext(addressData);
    };

    return (
        <div className="space-y-6">
                        {/* Address Input Section */}
            <div className="space-y-6">
                <div className="relative">
                    <div className={isFieldRejected('street_address') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                        <Input
                            label="Street Address"
                            type="text"
                            value={addressData.street_address}
                            onChange={(e) => handleInputChange('street_address', e.target.value)}
                            error={errors.street_address || (isFieldRejected('street_address') ? 'This field needs to be updated' : '')}
                            placeholder="123 Main Street"
                            required
                        />
                    </div>
                    
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

                <div className={isFieldRejected('street_address_2') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                    <Input
                        label="Apartment Number (Optional)"
                        type="text"
                        value={addressData.street_address_2}
                        onChange={(e) => handleInputChange('street_address_2', e.target.value)}
                        error={isFieldRejected('street_address_2') ? 'This field needs to be updated' : ''}
                        placeholder="Apt, Suite, Unit, etc."
                    />
                </div>
            </div>

            {/* Address Validation */}
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Address Validation</h3>
                    <Button
                        onClick={validateAddress}
                        disabled={isValidating || !googleMapsLoaded}
                        variant="outline"
                        size="sm"
                    >
                        {!googleMapsLoaded ? (
                            <>
                                <LoadingSpinner size="sm" className="mr-2" />
                                Loading Maps...
                            </>
                        ) : isValidating ? (
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
                {!isFirstStep && !isEditing && (
                    <Button
                        onClick={onPrevious}
                        variant="outline"
                    >
                        Previous
                    </Button>
                )}
                
                <div className={isFirstStep && !isEditing ? 'ml-auto' : ''}>
                    <Button
                        onClick={handleNext}
                        disabled={!validationResult?.success}
                    >
                        {isEditing ? 'Save & Return to Review' : 'Next'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddressStep; 