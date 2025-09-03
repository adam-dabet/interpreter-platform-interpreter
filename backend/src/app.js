const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
require('dotenv').config();

const emailService = require('./services/emailService');
const loggerService = require('./services/loggerService');
const { 
    requestLogger, 
    errorLogger, 
    securityLogger, 
    rateLimitLogger, 
    performanceLogger 
} = require('./middleware/logging');

const app = express();
const PORT = process.env.PORT || 3001;

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const interpreterRoutes = require('./routes/interpreters');
const parametricRoutes = require('./routes/parametric');
const jobRoutes = require('./routes/jobs');
const customerRoutes = require('./routes/customer');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"], // Allow inline scripts and event handlers
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc.)
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for admin dashboard
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

// Rate limiting (more lenient for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for development/testing
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging middleware (before body parsing)
app.use(performanceLogger);
app.use(requestLogger);
app.use(securityLogger);
app.use(rateLimitLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer middleware for handling multipart/form-data (file uploads)
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});
app.use(upload.any()); // Handle any multipart form data

// Static files (for development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static('uploads'));
  app.use('/uploads/interpreter-documents', express.static('uploads/interpreter-documents'));
  app.use('/uploads/w9_forms', express.static('uploads/w9_forms'));
  app.use('/uploads/completion-reports', express.static('uploads/completion-reports'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/interpreters', interpreterRoutes);
app.use('/api/parametric', parametricRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/customer', customerRoutes);
app.use('/admin', express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Error handling middleware
app.use(errorLogger);
app.use((error, req, res, next) => {
  loggerService.error('Unhandled error', error, { req });
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  await loggerService.info('Server started successfully', {
    category: 'SYSTEM',
    port: PORT,
    environment: process.env.NODE_ENV
  });
  
  // Start email processing service
  setInterval(() => {
    emailService.processEmailQueue(10);
  }, 60000); // Process emails every minute
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});



module.exports = app;