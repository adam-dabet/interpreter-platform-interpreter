# Google Maps API Setup for Service Locations

## Overview
The Service Locations management now includes Google Maps integration for address autocomplete and geocoding. This allows admins to:
- Get address suggestions as they type
- Automatically fill in city, state, and ZIP code
- Store precise coordinates (latitude/longitude) for each location

## Setup Instructions

### 1. Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
4. Go to "Credentials" and create an API key
5. Restrict the API key to your domain for security

### 2. Configure Environment Variables

Create a `.env` file in the `admin-dashboard` directory:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api

# Google Maps API Key
REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Restart the Application

After adding the environment variable, restart the admin dashboard:

```bash
npm start
```

## Features

### Address Autocomplete
- Start typing an address in the "Address" field
- Google will suggest matching addresses
- Select an address to auto-fill all fields

### Automatic Field Population
When you select an address, the system automatically fills:
- Full formatted address
- City
- State
- ZIP Code
- Latitude and longitude coordinates

### Coordinate Display
- Coordinates are shown in the form when an address is selected
- Coordinates are displayed on location cards
- Coordinates are stored in the database for future use

## Fallback Behavior
If the Google Maps API key is not configured:
- Address autocomplete will be disabled
- Users can still manually enter addresses
- All other functionality remains intact

## Security Notes
- Always restrict your API key to your domain
- Monitor API usage in Google Cloud Console
- Consider setting up billing alerts
- The API key is only used client-side for address suggestions
