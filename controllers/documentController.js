const asyncHandler = require('express-async-handler');
const Document = require('../models/documentModel');

// @desc    Upload new document
// @route   POST /api/documents
// @access  Private
const uploadDocument = asyncHandler(async (req, res) => {
  const { patientId, documentName, category, description } = req.body;
  const file = req.file;

  if (!file) {
    res.status(400);
    throw new Error('Please upload a file');
  }

  const document = await Document.create({
    patientId,
    documentName,
    category,
    description,
    fileType: file.mimetype,
    fileSize: file.size,
    filePath: file.path,
    uploadedBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: document
  });
});

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
const getDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find()
    .populate('patientId', 'name')
    .populate('uploadedBy', 'name');

  res.json({
    success: true,
    data: documents
  });
});

// @desc    Get document by ID
// @route   GET /api/documents/:id
// @access  Private
const getDocumentById = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('patientId')
    .populate('uploadedBy');

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  res.json({
    success: true,
    data: document
  });
});

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  // Delete file from storage
  // Implement file deletion logic here

  await document.remove();

  res.json({
    success: true,
    data: {}
  });
});

// @desc    Get patient documents
// @route   GET /api/patients/:patientId/documents
// @access  Private
const getPatientDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ patientId: req.params.patientId })
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: documents
  });
});

// @desc    Scan new document
// @route   POST /api/documents/scan
// @access  Private
const scanDocument = asyncHandler(async (req, res) => {
  const { patientId, documentName, category, description, scanSettings } = req.body;

  // Handle scanner integration
  try {
    // This is where you'd integrate with your scanner hardware
    // Example scanner settings:
    const scannerConfig = {
      resolution: scanSettings?.resolution || '300dpi',
      colorMode: scanSettings?.colorMode || 'color',
      duplex: scanSettings?.duplex || false,
      deviceId: scanSettings?.deviceId
    };

    // Placeholder for scanner integration
    // const scannedFile = await scannerService.scan(scannerConfig);

    const document = await Document.create({
      patientId,
      name: documentName,
      type: 'Scanned Document',
      description,
      category,
      uploadedBy: req.user._id,
      scanSource: 'scanner',
      scanQuality: scanSettings?.quality || 'medium',
      scanResolution: scannerConfig.resolution,
      scannerDetails: {
        deviceName: scanSettings?.deviceName,
        deviceId: scanSettings?.deviceId,
        settings: {
          colorMode: scannerConfig.colorMode,
          duplex: scannerConfig.duplex
        }
      }
    });

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(500);
    throw new Error('Scanner error: ' + error.message);
  }
});

// @desc    Get available scanners
// @route   GET /api/documents/scanners
// @access  Private
const getScanners = asyncHandler(async (req, res) => {
  // This would integrate with your scanner hardware API
  // Placeholder response
  const availableScanners = [
    {
      id: 'scanner1',
      name: 'Office Scanner',
      capabilities: {
        resolution: ['100dpi', '200dpi', '300dpi'],
        colorModes: ['color', 'grayscale', 'blackwhite'],
        duplex: true
      }
    }
  ];

  res.json({
    success: true,
    data: availableScanners
  });
});

// @desc    Get all folders
// @route   GET /api/documents/folders
// @access  Private
const getFolders = asyncHandler(async (req, res) => {
  const folders = await Document.find({ 
    type: 'folder',
    uploadedBy: req.user._id 
  }).sort('name');

  res.json({
    success: true,
    data: folders
  });
});

// @desc    Create new folder
// @route   POST /api/documents/folders
// @access  Private
const createFolder = asyncHandler(async (req, res) => {
  const folder = await Document.create({
    name: req.body.name,
    type: 'folder',
    patient: req.body.patientId,
    uploadedBy: req.user._id,
    description: req.body.description || '',
    isPrivate: req.body.isPrivate || false
  });

  res.status(201).json({
    success: true,
    data: folder
  });
});

// @desc    Get files in folder
// @route   GET /api/documents/folders/:folderId/files
// @access  Private
const getFilesInFolder = asyncHandler(async (req, res) => {
  const files = await Document.find({
    parentFolder: req.params.folderId,
    type: { $ne: 'folder' }
  }).populate('patient', 'firstName lastName');

  res.json({
    success: true,
    data: files
  });
});

// @desc    Move document to folder
// @route   PUT /api/documents/:id/move
// @access  Private
const moveDocument = asyncHandler(async (req, res) => {
  const document = await Document.findByIdAndUpdate(
    req.params.id,
    { parentFolder: req.body.folderId },
    { new: true }
  );

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  res.json({
    success: true,
    data: document
  });
});

// @desc    Search documents
// @route   GET /api/documents/search
// @access  Private
const searchDocuments = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { description: { $regex: req.query.keyword, $options: 'i' } },
          { tags: { $in: [new RegExp(req.query.keyword, 'i')] } }
        ]
      }
    : {};

  const documents = await Document.find({
    ...keyword,
    uploadedBy: req.user._id
  }).populate('patient', 'firstName lastName');

  res.json({
    success: true,
    data: documents
  });
});

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  getPatientDocuments,
  scanDocument,
  getScanners,
  getFolders,
  createFolder,
  getFilesInFolder,
  moveDocument,
  searchDocuments
};
