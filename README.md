# Interpreter Platform

A comprehensive multi-portal platform for managing interpreter applications, job assignments, and customer appointments with full parametrization, automated reminders, and comprehensive logging capabilities.

## 🏗️ System Architecture

The platform consists of **4 main components**:

1. **Backend API** (Port 3001) - Centralized API server
2. **Interpreter Portal** (Port 3000) - For interpreters to manage profiles and jobs
3. **Customer Portal** (Port 3003) - For customers to manage appointments
4. **Admin Dashboard** (Port 3002) - For administrators to manage the system

## ✨ Key Features

### 🎯 Multi-Portal System
- **Interpreter Portal**: Profile management, job applications, job assignments
- **Customer Portal**: Appointment booking, claimant management, appointment tracking
- **Admin Dashboard**: System management, job oversight, user administration

### 🔄 Comprehensive Job Workflow
- **11-Step Status System**: From requested to interpreter paid
- **Automated Reminders**: Email reminders for claimants and interpreters
- **Real-time Updates**: Live status tracking across all portals
- **Assignment Management**: Intelligent interpreter-job matching

### 📧 Automated Reminder System
- **Claimant Reminders**: 2-day advance notice
- **Interpreter Reminders**: 2-day, 1-day, and 2-hour notifications
- **Smart Timing**: Automatic scheduling based on appointment times
- **Individual Control**: Admin can send specific reminders manually

### 🛠️ Technical Features
- **Database**: PostgreSQL with comprehensive job management schema
- **Backend**: Node.js with Express, JWT authentication, and email services
- **Frontend**: React with modern UI components and real-time updates
- **Email System**: Nodemailer with template-based email queuing
- **Logging**: Winston-based logging with database persistence
- **Security**: JWT authentication, role-based access control

## 📁 Project Structure

```
interpreter-platform/
├── backend/                    # Central API Server (Port 3001)
│   ├── src/
│   │   ├── controllers/       # Route controllers (jobs, users, reminders)
│   │   ├── middleware/        # Auth, logging, validation middleware
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes (admin, interpreters, jobs)
│   │   ├── services/         # Business logic (email, reminders, logging)
│   │   └── utils/            # Utility functions
│   ├── migrations/           # Database schema migrations
│   ├── scripts/              # Utility scripts (reminders, imports)
│   └── uploads/              # File upload directory
├── frontend/                   # Interpreter Portal (Port 3000)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Job dashboard, profile, applications
│   │   ├── services/        # API services
│   │   └── utils/           # Status constants, helpers
│   └── public/              # Static assets
├── customer-portal/            # Customer Portal (Port 3003)
│   ├── src/
│   │   ├── pages/           # Appointments, claimants, dashboard
│   │   ├── components/      # UI components
│   │   └── utils/           # Status constants, helpers
│   └── public/              # Static assets
└── admin-dashboard/            # Admin Dashboard (Port 3002)
    ├── src/
    │   ├── pages/           # Job management, user management
    │   ├── components/      # Workflow, completion reports
    │   └── utils/           # Status constants, helpers
    └── public/              # Static assets
```

## 🚀 Complete Setup Instructions

### Prerequisites
- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **Email Service** (Gmail, SendGrid, or SMTP server)
- **Google Maps API key** (optional, for address features)

### 1️⃣ Backend API Setup (Port 3001)

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
   
   # Run comprehensive status system migration
   psql -d interpreter_platform -f migrations/update_comprehensive_status_system.sql
   ```

3. **Environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Environment Variables section)
   ```

4. **Start the backend server**:
   ```bash
   npm run dev  # Development mode
   npm start    # Production mode
   ```

   **Backend will be available at:** `http://localhost:3001`

### 2️⃣ Interpreter Portal Setup (Port 3000)

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Environment configuration**:
   ```bash
   # Create .env file
   echo "REACT_APP_API_URL=http://localhost:3001/api" > .env
   ```

3. **Start the interpreter portal**:
   ```bash
   npm start
   ```

   **Interpreter Portal will be available at:** `http://localhost:3000`

### 3️⃣ Customer Portal Setup (Port 3003)

1. **Install dependencies**:
   ```bash
   cd customer-portal
   npm install
   ```

2. **Environment configuration**:
   ```bash
   # Create .env file
   echo "REACT_APP_API_URL=http://localhost:3001/api" > .env
   ```

3. **Start the customer portal**:
   ```bash
   npm start
   ```

   **Customer Portal will be available at:** `http://localhost:3003`

### 4️⃣ Admin Dashboard Setup (Port 3002)

1. **Install dependencies**:
   ```bash
   cd admin-dashboard
   npm install
   ```

2. **Environment configuration**:
   ```bash
   # Create .env file
   echo "REACT_APP_API_URL=http://localhost:3001/api" > .env
   ```

3. **Start the admin dashboard**:
   ```bash
   npm start
   ```

   **Admin Dashboard will be available at:** `http://localhost:3002`

### 🔧 Automated Reminder System Setup

1. **Set up cron job for automatic reminders**:
   ```bash
   cd backend
   ./scripts/setupReminderCron.sh
   ```

2. **Test reminder system**:
   ```bash
   # Manual test
   node scripts/processReminders.js
   ```

### 🌐 Port Configuration Summary

| Component | Port | URL | Purpose |
|-----------|------|-----|---------|
| Backend API | 3001 | `http://localhost:3001` | Central API server |
| Interpreter Portal | 3000 | `http://localhost:3000` | Interpreter interface |
| Customer Portal | 3003 | `http://localhost:3003` | Customer interface |
| Admin Dashboard | 3002 | `http://localhost:3002` | Admin interface |

## 🔑 Environment Variables Configuration

### Backend (.env)
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interpreter_platform
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Email Configuration (Choose one)
# Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Interpreter Platform

# SMTP
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@yourdomain.com
EMAIL_HOST_PASSWORD=your-password

# Google Maps (Optional)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Application Settings
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
```

### Frontend Portals (.env)
```env
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api

# Google Maps (Optional)
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## 📧 Email Service Setup

### Option 1: Gmail (Recommended for Development)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Configure backend .env**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-16-character-app-password
   ```

### Option 2: SendGrid (Recommended for Production)
1. **Create SendGrid account** at [sendgrid.com](https://sendgrid.com)
2. **Generate API key** in SendGrid dashboard
3. **Configure backend .env**:
   ```env
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=Interpreter Platform
   ```

### Option 3: Custom SMTP
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@yourdomain.com
EMAIL_HOST_PASSWORD=your-password
```

## 🗺️ Google Maps API Setup (Optional)

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

## 🗄️ Database Schema

### Core Job Management Tables
- **jobs**: Main job/appointment records with comprehensive status tracking
- **job_assignments**: Interpreter-job assignments with status tracking
- **job_status_transitions**: Audit trail for status changes
- **job_notifications**: Notification and reminder tracking

### User Management Tables
- **interpreters**: Interpreter profile data and credentials
- **customers**: Customer account information
- **users**: Admin user accounts
- **claimants**: Individual appointment claimants

### Parametric Tables
- **languages**: Configurable language options
- **service_types**: Configurable service type options  
- **certificate_types**: Configurable certificate requirements
- **us_states**: US state reference data

### Email System Tables
- **email_templates**: Configurable email templates
- **email_queue**: Email sending queue with priority management

### Logging Tables
- **system_logs**: Application logs with full context
- **activity_logs**: Audit trail for data changes

## 🔄 Job Status Workflow

The platform uses an **11-step comprehensive status system**:

1. **Requested** - Customer creates appointment request
2. **Approved** - Admin approves the request
3. **Finding Interpreter** - System searches for available interpreters
4. **Assigned** - Interpreter accepts the job
5. **Reminders Sent** - Automated reminders sent to parties
6. **In Progress** - Appointment is currently happening
7. **Completed** - Appointment finished
8. **Completion Report** - Interpreter submits completion report
9. **Billed** - Customer has been billed
10. **Closed** - Job is closed and archived
11. **Interpreter Paid** - Interpreter has been compensated

## 📧 Automated Reminder System

### Reminder Schedule
- **Claimants**: 2-day advance reminder
- **Interpreters**: 2-day, 1-day, and 2-hour reminders

### Reminder Features
- **Smart Timing**: Automatically calculates when to send reminders
- **Individual Control**: Admins can send specific reminders manually
- **Template-Based**: Customizable email templates
- **Queue Management**: Priority-based email queuing
- **Duplicate Prevention**: Never sends the same reminder twice

## 🔌 API Endpoints

### Job Management
- `GET /api/jobs` - List all jobs (admin)
- `GET /api/jobs/available` - Get available jobs for interpreters
- `GET /api/jobs/my-jobs` - Get interpreter's assigned jobs
- `POST /api/jobs/:id/accept` - Accept a job (interpreter)
- `POST /api/jobs/:id/decline` - Decline a job (interpreter)
- `PUT /api/jobs/:id/status` - Update job status (admin)

### Reminder System
- `POST /api/admin/reminders/process` - Process all pending reminders
- `POST /api/admin/reminders/job/:id/claimant` - Send claimant reminder
- `POST /api/admin/reminders/job/:id/interpreter-2day` - Send 2-day reminder
- `POST /api/admin/reminders/job/:id/interpreter-1day` - Send 1-day reminder
- `POST /api/admin/reminders/job/:id/interpreter-2hour` - Send 2-hour reminder

### User Management
- `POST /api/auth/login` - Admin login
- `POST /api/auth/interpreter/login` - Interpreter login
- `POST /api/customer/magic-link` - Customer magic link login
- `GET /api/interpreters` - List interpreters (admin)
- `GET /api/customers` - List customers (admin)

### Parametric Data
- `GET /api/parametric/all` - Get all parametric data
- `GET /api/parametric/languages` - Get languages
- `GET /api/parametric/service-types` - Get service types
- `GET /api/parametric/certificate-types` - Get certificate types

## 🚀 Quick Start Guide

### 1. Start All Services
```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Interpreter Portal  
cd frontend && npm start

# Terminal 3: Customer Portal
cd customer-portal && npm start

# Terminal 4: Admin Dashboard
cd admin-dashboard && npm start
```

### 2. Access the Portals
- **Interpreter Portal**: http://localhost:3000
- **Customer Portal**: http://localhost:3003  
- **Admin Dashboard**: http://localhost:3002
- **Backend API**: http://localhost:3001

### 3. Test the System
1. **Create an interpreter account** in the Interpreter Portal
2. **Create a customer account** in the Customer Portal
3. **Login to Admin Dashboard** to manage the system
4. **Create a test job** and assign it to an interpreter
5. **Test the reminder system** using the admin controls

## 🧪 Testing the Reminder System

### Manual Testing
```bash
# Test reminder processing
cd backend
node scripts/processReminders.js
```

### Create Test Jobs
```sql
-- Create a job for 2 hours from now
INSERT INTO jobs (
  id, title, scheduled_date, scheduled_time, status,
  assigned_interpreter_id, claimant_id, client_email,
  service_type_id, source_language_id, target_language_id,
  hourly_rate, is_active
) VALUES (
  gen_random_uuid(),
  'Test 2-Hour Reminder',
  CURRENT_DATE,
  (CURRENT_TIME + INTERVAL '2 hours')::time,
  'assigned', 38, 1, 'test@example.com',
  30, 'a66019cc-5e21-434c-93e2-9913fe36a535', '0c11dae4-5989-40fd-bf60-687ffd4f6761',
  50.00, true
);
```

### Expected Results
- **2-hour window**: Only 2-hour reminder sent
- **1-day window**: Only 1-day reminder sent  
- **2-day window**: Only 2-day reminders sent
- **Outside windows**: No reminders sent

## 📊 Logging System

The platform includes comprehensive logging across all components:

### Log Categories
- **AUTH**: Authentication and authorization events
- **API**: HTTP request/response logging
- **DATABASE**: Database operations
- **VALIDATION**: Input validation errors
- **SECURITY**: Security-related events
- **EMAIL**: Email sending operations
- **REMINDER**: Reminder system activities
- **JOB**: Job status changes and assignments

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

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Admin, interpreter, and customer roles
- **Input Validation**: Comprehensive validation on all inputs
- **File Upload Security**: Type and size restrictions
- **Rate Limiting**: API request throttling
- **Security Headers**: Helmet.js integration
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization
- **Magic Link Authentication**: Secure passwordless login for customers

## 🛠️ Development

### Adding New Job Statuses

1. **Update database enum**:
   ```sql
   ALTER TYPE job_status_enum ADD VALUE 'new_status';
   ```

2. **Update status constants** in all portals:
   ```javascript
   // In each portal's src/utils/statusConstants.js
   export const JOB_STATUSES = {
     // ... existing statuses
     NEW_STATUS: 'new_status'
   };
   ```

### Adding New Reminder Types

1. **Add email template**:
   ```sql
   INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, is_active)
   VALUES ('new_reminder', 'interpreter_reminder', 'Subject', 'HTML', 'Text', true);
   ```

2. **Add reminder method** to `ReminderService`
3. **Add API endpoint** to admin routes
4. **Add admin button** to JobWorkflow component

### Adding New Log Categories

1. **Update loggerService.js**:
   ```javascript
   await loggerService.info('Message', {
     category: 'NEW_CATEGORY',
     // ... other metadata
   });
   ```

### Customizing Email Templates

1. **Modify templates** in database:
   ```sql
   UPDATE email_templates 
   SET body_html = 'New HTML content', body_text = 'New text content'
   WHERE template_name = 'template_name';
   ```

2. **Use template variables**:
   - `{{claimant_name}}`, `{{interpreter_name}}`
   - `{{appointment_date}}`, `{{appointment_time}}`
   - `{{appointment_location}}`, `{{service_type}}`
   - `{{languages}}`, `{{hourly_rate}}`

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Set production values for all services
2. **Database**: Use connection pooling, SSL, and backups
3. **Email Service**: Use production email service (SendGrid recommended)
4. **File Storage**: Consider AWS S3 for file uploads
5. **Logging**: Configure log rotation and monitoring
6. **Security**: Enable HTTPS, update CORS settings
7. **Performance**: Enable caching, optimize database queries
8. **Reminder System**: Set up production cron jobs

### Docker Deployment

#### Backend Dockerfile
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

#### Frontend Dockerfile (for each portal)
```dockerfile
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
```

### Production Environment Setup

1. **Set up all 4 services** with proper environment variables
2. **Configure email service** with production credentials
3. **Set up database** with SSL and connection pooling
4. **Configure reminder cron job** for production
5. **Set up monitoring** for all services
6. **Configure reverse proxy** (nginx) for all portals

## 📚 Additional Documentation

- **[Reminder System Guide](backend/REMINDER_SYSTEM_README.md)** - Complete reminder system documentation
- **[Testing Reminders Guide](backend/TESTING_REMINDERS_GUIDE.md)** - How to test the reminder system
- **[Reminder Testing Results](backend/REMINDER_TESTING_RESULTS.md)** - Testing results and troubleshooting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper logging
4. Test all three portals
5. Update documentation
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- **Check the logs** for detailed error information
- **Review the database schema** for data structure
- **Consult the API documentation** for endpoint details
- **Test the reminder system** using the provided guides
- **Check environment variables** are properly configured

## 🎯 System Status

✅ **Backend API** - Fully functional with comprehensive job management  
✅ **Interpreter Portal** - Complete with job applications and assignments  
✅ **Customer Portal** - Full appointment booking and management  
✅ **Admin Dashboard** - Complete system administration  
✅ **Reminder System** - Automated email reminders with smart timing  
✅ **Job Workflow** - 11-step comprehensive status system  
✅ **Authentication** - JWT and magic link authentication  
✅ **Email System** - Template-based email queuing  
✅ **Logging** - Comprehensive audit trail and monitoring