const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use /tmp for Vercel
    const uploadPath = '/tmp';
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'profile' ? 'profile-' : 'doc-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'profile') {
    // For profile images, only allow images
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload only images'), false);
    }
  } else {
    // For documents, allow images and PDFs
    if (file.mimetype.startsWith('image') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Please upload only images or PDF files'), false);
    }
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: file => {
      // 2MB for profile images, 10MB for documents
      return file.fieldname === 'profile' ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
    }
  }
});

// Export different upload middlewares for different purposes
module.exports = {
  uploadProfile: upload.single('profile'),
  uploadDocument: upload.single('document'),
  uploadMultipleDocuments: upload.array('documents', 10), // Allow up to 10 documents
  upload // Export the raw multer instance if needed
};