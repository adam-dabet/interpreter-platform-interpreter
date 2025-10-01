import React, { useRef, useEffect, useState } from 'react';
import googleMapsLoader from '../utils/googleMapsLoader';

const AddressAutocomplete = ({ 
  onAddressSelect, 
  placeholder = "Enter address",
  className = "",
  initialValue = ""
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [inputValue, setInputValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load Google Maps API with Places library
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key not found');
        }

        await googleMapsLoader.load(['places']);

        if (!inputRef.current) return;

        // Create autocomplete instance
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'us' } // Restrict to US addresses
          }
        );

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          
          if (!place.geometry || !place.geometry.location) {
            setError('Please select a valid address from the suggestions');
            return;
          }

          // Extract address components
          const addressComponents = place.address_components || [];
          const addressData = {
            formatted_address: place.formatted_address,
            street: '',
            city: '',
            state: '',
            zip: '',
            country: 'United States',
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            place_id: place.place_id
          };

          // Parse address components
          addressComponents.forEach(component => {
            const types = component.types;
            
            if (types.includes('street_number') || types.includes('route')) {
              addressData.street = (addressData.street + ' ' + component.long_name).trim();
            } else if (types.includes('locality')) {
              addressData.city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              addressData.state = component.short_name;
            } else if (types.includes('postal_code')) {
              addressData.zip = component.long_name;
            } else if (types.includes('country')) {
              addressData.country = component.long_name;
            }
          });

          setInputValue(place.formatted_address);
          setError(null);
          
          // Call the callback with the address data
          if (onAddressSelect) {
            onAddressSelect(addressData);
          }
        });

      } catch (err) {
        console.error('Error initializing Google Maps autocomplete:', err);
        setError('Failed to load address autocomplete. Please enter address manually.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAutocomplete();

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onAddressSelect]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setError(null);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        placeholder={isLoading ? "Loading address autocomplete..." : placeholder}
        value={inputValue}
        onChange={handleInputChange}
        className={`w-full border p-2 rounded ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${isLoading ? 'bg-gray-100' : ''}`}
        disabled={isLoading}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
      {isLoading && (
        <div className="absolute right-2 top-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
