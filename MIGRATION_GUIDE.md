# Migration Guide: Old System to New Parametric System

## Overview

The interpreter platform has been completely migrated from the old `translator_applications` system to a new parametric system using `interpreters` tables. This guide outlines the changes and migration steps.

## Key Changes

### Database Schema Changes

#### Old Tables (DEPRECATED - No longer used)
- `translator_applications` → Replaced by `interpreters`
- `application_languages` → Replaced by `interpreter_languages`  
- `application_documents` → Replaced by `interpreter_certificates`

#### New Parametric Tables
- `languages` - Configurable language options
- `service_types` - Configurable service type options
- `certificate_types` - Configurable certificate requirements
- `us_states` - US state reference data
- `interpreters` - Main interpreter profile data
- `interpreter_languages` - Language proficiencies (many-to-many)
- `interpreter_service_types` - Service type selections (many-to-many)
- `interpreter_certificates` - Certificates and documents

#### New Logging Tables
- `system_logs` - Application logs with full context
- `activity_logs` - Audit trail for data changes

### API Endpoint Changes

#### Old Endpoints (DEPRECATED)
```
POST /api/applications/submit
GET /api/applications/:applicationId/status
POST /api/applications/:applicationId/documents
GET /api/admin/applications/pending
GET /api/admin/applications/:id
PUT /api/admin/applications/:id/status
```

#### New Endpoints
```
# Parametric Data
GET /api/parametric/all
GET /api/parametric/languages
GET /api/parametric/service-types
GET /api/parametric/certificate-types
GET /api/parametric/us-states

# Interpreter Profiles
POST /api/interpreters
GET /api/interpreters/:id
PUT /api/interpreters/:id
GET /api/interpreters

# Admin - Interpreter Management
GET /api/admin/profiles/pending
GET /api/admin/profiles/:profileId
PUT /api/admin/profiles/:profileId/status

# Address Services
POST /api/address/validate
GET /api/address/suggestions
GET /api/address/place/:placeId
POST /api/address/geocode
```

### Frontend Changes

#### Old Components (No longer used)
- Application form components using hardcoded options
- Static language and service type lists

#### New Components
- `InterpreterProfile.js` - New multi-step profile creation
- `AddressStep.js` - Google Maps address validation
- `ServiceTypesStep.js` - Dynamic service type selection
- `CertificatesStep.js` - File upload with validation
- Parametric form controls that load options from database

### Code Changes

#### Backend Files Updated
- ✅ `models/Interpreter.js` - New model replacing Application.js
- ✅ `controllers/interpreterController.js` - New controller
- ✅ `controllers/adminController.js` - Updated for new system
- ✅ `routes/interpreters.js` - New interpreter routes
- ✅ `routes/parametric.js` - Parametric data endpoints
- ✅ `routes/address.js` - Address validation endpoints
- ✅ `services/loggerService.js` - Comprehensive logging
- ✅ `services/addressService.js` - Google Maps integration
- ✅ `middleware/logging.js` - Logging middleware

#### Backend Files Removed
- ❌ `models/Application.js` - Replaced by Interpreter.js
- ❌ `controllers/applicationController.js` - Replaced by interpreterController.js

#### Frontend Files Updated
- ✅ `services/api.js` - New API endpoints
- ✅ `pages/InterpreterProfile.js` - New profile creation interface

## Migration Steps

### 1. Database Migration

```bash
# Run the new parametric system migration
psql -d interpreter_platform -f backend/migrations/create_parametric_system.sql
```

### 2. Environment Variables

Add to your `.env` files:

```env
# Backend
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
LOG_LEVEL=info

# Frontend  
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 3. Install New Dependencies

```bash
# Backend
cd backend
npm install @googlemaps/google-maps-services-js axios

# Frontend
cd frontend
npm install @googlemaps/js-api-loader
```

### 4. Update Frontend Routes

Update your routing to use the new interpreter profile interface:

```javascript
// Old route
<Route path="/apply" component={ApplicationForm} />

// New route
<Route path="/interpreter-profile" component={InterpreterProfile} />
```

## Data Migration (if needed)

If you have existing data in the old tables, you would need to migrate it:

```sql
-- Example migration query (customize based on your data)
INSERT INTO interpreters (
    first_name, last_name, email, phone, 
    street_address, city, state_id, zip_code,
    years_of_experience, bio, profile_status, created_at
)
SELECT 
    first_name, last_name, email, phone,
    address_line1, city, 
    (SELECT id FROM us_states WHERE code = ta.state), zip_code,
    years_of_experience, bio, 
    CASE 
        WHEN application_status = 'approved' THEN 'approved'
        WHEN application_status = 'rejected' THEN 'rejected'
        ELSE 'pending'
    END,
    submission_date
FROM translator_applications ta
WHERE ta.application_status IS NOT NULL;
```

## Features Gained

### ✅ Parametric System
- All form options (languages, service types, certificates) are now database-driven
- Easy to add/modify options without code changes
- Consistent data across the system

### ✅ Comprehensive Logging
- Every API request logged with full context
- Database operations tracking
- Security event monitoring
- Performance metrics collection
- Complete audit trail

### ✅ Address Validation
- US address validation with Google Maps
- Address autocomplete functionality
- Geocoding and mapping
- Address quality scoring

### ✅ Enhanced File Management
- Secure file upload with validation
- Certificate document management
- File metadata storage
- Multiple file support

### ✅ Improved Admin Interface
- New dashboard with interpreter-specific metrics
- Profile management instead of application management
- Better filtering and search capabilities
- Activity logging for compliance

## Breaking Changes

### API Response Format Changes
The new system returns different response structures. Update your frontend code accordingly.

### Database Schema
The old tables are no longer used. Any direct database queries need to be updated.

### File Upload Structure
Certificate uploads now use a different structure with proper categorization.

## Rollback Plan (if needed)

If you need to rollback:

1. Revert the database migration
2. Restore old controller and model files
3. Update routes back to old endpoints
4. Remove new dependencies

However, the new system provides significant improvements and should be preferred.

## Support

- Check logs in `backend/logs/` for detailed error information
- Review the database `system_logs` table for application events
- Use the new parametric endpoints to understand data structure
- Consult the comprehensive README.md for full documentation