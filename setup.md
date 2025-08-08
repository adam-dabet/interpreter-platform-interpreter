# Interpreter Platform Setup Guide

## Quick Start

### 1. Database Setup

```bash
# Create database
createdb interpreter_platform

# Run initial schema
psql -d interpreter_platform -f backend/database_schema.sql

# Run parametric system migration
psql -d interpreter_platform -f backend/migrations/create_parametric_system.sql
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

## Environment Configuration

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interpreter_platform
DB_USER=postgres
DB_PASSWORD=your_password
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
LOG_LEVEL=info
PORT=3001
NODE_ENV=development
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. Create API key and add to environment files

## Key Features Implemented

✅ **Parametric System**
- Languages, service types, and certificates fully configurable in database
- Dynamic form options loaded from database

✅ **Comprehensive Logging**
- Application logs with full context
- Activity logs for audit trail
- Performance monitoring
- Security event logging

✅ **Address Validation**
- US address validation with Google Maps
- Address autocomplete
- Geocoding and mapping

✅ **Interpreter Profile System**
- Multi-step profile creation wizard
- File upload for certificates
- Address validation with map preview
- Language proficiency tracking
- Service type selection

✅ **Database Schema**
- Parametric tables for all configurable data
- Comprehensive logging tables
- Activity audit trail
- Proper indexing and constraints

## API Endpoints

### Parametric Data
- `GET /api/parametric/all` - All form options
- `GET /api/parametric/languages` - Available languages
- `GET /api/parametric/service-types` - Service types
- `GET /api/parametric/certificate-types` - Certificate types

### Interpreters
- `POST /api/interpreters` - Create profile
- `GET /api/interpreters/:id` - Get profile
- `PUT /api/interpreters/:id` - Update profile
- `GET /api/interpreters` - List with filters

### Address Services
- `POST /api/address/validate` - Validate address
- `GET /api/address/suggestions` - Autocomplete
- `GET /api/address/place/:placeId` - Place details

## System Architecture

The system is now fully parametrized with:

1. **Database-driven configuration** - All languages, service types, and certificates are stored in database tables
2. **Comprehensive logging** - Every action is logged with full context
3. **Address validation** - Google Maps integration for US address validation
4. **Audit trail** - Complete activity logging for compliance
5. **Scalable structure** - Easy to add new parametric data types

## Next Steps

1. Configure environment variables
2. Set up Google Maps API key
3. Run database migrations
4. Test the interpreter profile creation flow
5. Customize parametric data as needed