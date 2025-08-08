const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3 (if using S3 for storage)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png,doc,docx').split(',');
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Storage configuration
const storage = process.env.NODE_ENV === 'production' && process.env.AWS_S3_BUCKET
  ? multer.memoryStorage() // Use memory storage for S3 upload
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/documents/');
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// S3 upload middleware (if using S3)
const uploadToS3 = async (req, res, next) => {
  if (!req.file || !process.env.AWS_S3_BUCKET) {
    return next();
  }

  try {
    const fileKey = `documents/${req.params.applicationId}/${uuidv4()}-${req.file.originalname}`;
    
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ServerSideEncryption: 'AES256'
    };

    const result = await s3.upload(uploadParams).promise();
    
    // Add S3 URL to file object
    req.file.location = result.Location;
    req.file.key = result.Key;
    
    next();
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
};

module.exports = {
  uploadSingle: upload.single('file'),
  uploadToS3,
  fileFilter
};