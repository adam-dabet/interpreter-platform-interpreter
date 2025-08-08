# Interpreter Platform

A comprehensive platform for managing interpreter applications and profiles with full parametrization and logging capabilities.

## Features

### Core Functionality
- **Parametric System**: Languages, service types, and certificates are fully configurable in the database
- **Comprehensive Logging**: Complete audit trail with performance monitoring and security logging
- **Address Validation**: US address validation with Google Maps integration
- **File Management**: Secure document upload and management
- **Multi-step Forms**: Intuitive wizard-style forms for complex data entry

### Interpreter Profile System
- Personal information management
- Address validation with Google Maps integration
- Language proficiency tracking
- Service type selection
- Certificate and document management
- Profile status workflow

### Technical Features
- **Database**: PostgreSQL with parametric tables and comprehensive logging
- **Backend**: Node.js with Express, comprehensive middleware for logging and security
- **Frontend**: React with modern UI components and form validation
- **Address Services**: Google Maps API integration for address validation and geocoding
- **File Upload**: Secure file handling with validation
- **Logging**: Winston-based logging with database persistence

## Project Structure

```
interpreter-platform/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Custom middleware (logging, auth, etc.)
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic services
│   │   └── utils/            # Utility functions
│   ├── migrations/           # Database migrations
│   └── uploads/             # File upload directory
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
└── admin-dashboard/         # Admin interface (if separate)
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Google Maps API key (for address features)

### Backend Setup

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Database setup**:
   ```bash
   # Create database
   createdb interpreter_platform
   
   # Run initial schema
   psql -d interpreter_platform -f database_schema.sql
   
   # Run parametric system migration
   psql -d interpreter_platform -f migrations/create_parametric_system.sql
   ```

3. **Environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**:
   ```bash
   npm run dev  # Development mode
   npm start    # Production mode
   ```

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

### Google Maps API Setup

1. **Get API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable the following APIs:
     - Maps JavaScript API
     - Places API
     - Geocoding API

2. **Configure API Key**:
   - Add restrictions (HTTP referrers for frontend, IP addresses for backend)
   - Add the key to both backend and frontend `.env` files

## Database Schema

### Parametric Tables
- **languages**: Configurable language options
- **service_types**: Configurable service type options  
- **certificate_types**: Configurable certificate requirements
- **us_states**: US state reference data

### Core Tables
- **interpreters**: Main interpreter profile data
- **interpreter_languages**: Language proficiencies (many-to-many)
- **interpreter_service_types**: Service type selections (many-to-many)
- **interpreter_certificates**: Certificates and documents

### Logging Tables
- **system_logs**: Application logs with full context
- **activity_logs**: Audit trail for data changes

## API Endpoints

### Parametric Data
- `GET /api/parametric/all` - Get all parametric data
- `GET /api/parametric/languages` - Get languages
- `GET /api/parametric/service-types` - Get service types
- `GET /api/parametric/certificate-types` - Get certificate types
- `GET /api/parametric/us-states` - Get US states

### Interpreters
- `POST /api/interpreters` - Create interpreter profile
- `GET /api/interpreters/:id` - Get interpreter profile
- `PUT /api/interpreters/:id` - Update interpreter profile
- `GET /api/interpreters` - List interpreters (with filters)

### Address Services
- `POST /api/address/validate` - Validate US address
- `GET /api/address/suggestions` - Get address autocomplete
- `GET /api/address/place/:placeId` - Get place details
- `POST /api/address/geocode` - Geocode address string

## Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interpreter_platform
DB_USER=postgres
DB_PASSWORD=your_password

# Google Maps
GOOGLE_MAPS_API_KEY=your-api-key

# Logging
LOG_LEVEL=info
```

#### Frontend (.env)
```env
# API
REACT_APP_API_URL=http://localhost:3001/api

# Google Maps
REACT_APP_GOOGLE_MAPS_API_KEY=your-api-key
```

## Logging System

The platform includes comprehensive logging:

### Log Categories
- **AUTH**: Authentication and authorization events
- **API**: HTTP request/response logging
- **DATABASE**: Database operations
- **VALIDATION**: Input validation errors
- **SECURITY**: Security-related events
- **ADDRESS**: Address validation and geocoding
- **FILE_UPLOAD**: File upload operations
- **EMAIL**: Email sending operations

### Log Levels
- **DEBUG**: Detailed debugging information
- **INFO**: General information
- **WARN**: Warning conditions
- **ERROR**: Error conditions
- **FATAL**: Critical errors

### Storage
- File-based logging (logs/ directory)
- Database logging (system_logs table)
- Console output (development)

## Security Features

- **Input Validation**: Comprehensive validation on all inputs
- **File Upload Security**: Type and size restrictions
- **Rate Limiting**: API request throttling
- **Security Headers**: Helmet.js integration
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

## Development

### Adding New Parametric Data

1. **Add to database**:
   ```sql
   INSERT INTO languages (code, name, native_name) 
   VALUES ('new_lang', 'New Language', 'Native Name');
   ```

2. **Frontend will automatically pick up new options**

### Adding New Log Categories

1. **Update loggerService.js**:
   ```javascript
   await loggerService.info('Message', {
     category: 'NEW_CATEGORY',
     // ... other metadata
   });
   ```

### Customizing Address Validation

1. **Modify addressService.js** for custom validation rules
2. **Update US address standards** in validation methods

## Deployment

### Production Considerations

1. **Environment Variables**: Set production values
2. **Database**: Use connection pooling and SSL
3. **File Storage**: Consider AWS S3 for file uploads
4. **Logging**: Configure log rotation and monitoring
5. **Security**: Enable HTTPS, update CORS settings
6. **Performance**: Enable caching, optimize database queries

### Docker Deployment

```dockerfile
# Example Dockerfile structure
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper logging
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the logs for detailed error information
- Review the database schema for data structure
- Consult the API documentation for endpoint details