const Backup = require('../models/backupModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// @desc    Get all backups
// @route   GET /api/v1/admin/settings/backups
// @access  Private/Admin
exports.getBackups = asyncHandler(async (req, res, next) => {
  const backups = await Backup.find()
    .populate('createdBy', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: backups
  });
});

// @desc    Create new backup
// @route   POST /api/v1/admin/settings/backups
// @access  Private/Admin
exports.createBackup = asyncHandler(async (req, res, next) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${timestamp}.zip`;
  const backupPath = path.join(process.env.BACKUP_PATH, fileName);

  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(process.env.BACKUP_PATH)) {
      fs.mkdirSync(process.env.BACKUP_PATH, { recursive: true });
    }

    // Create backup entry in database
    const backup = await Backup.create({
      fileName,
      path: backupPath,
      status: 'in_progress',
      createdBy: req.user._id
    });

    // MongoDB dump command
    const dbUrl = process.env.MONGO_URI;
    const dumpCmd = `mongodump --uri="${dbUrl}" --archive="${backupPath}" --gzip`;

    // Execute backup command
    await execPromise(dumpCmd);

    // Update backup size and status
    const stats = fs.statSync(backupPath);
    backup.size = stats.size;
    backup.status = 'completed';
    await backup.save();

    res.status(201).json({
      success: true,
      data: backup
    });
  } catch (error) {
    // Update backup status to failed if error occurs
    if (backup) {
      backup.status = 'failed';
      await backup.save();
    }
    return next(new ErrorResponse('Backup creation failed', 500));
  }
});

// @desc    Restore backup
// @route   POST /api/v1/admin/settings/backups/:id/restore
// @access  Private/Admin
exports.restoreBackup = asyncHandler(async (req, res, next) => {
  const backup = await Backup.findById(req.params.id);

  if (!backup) {
    return next(new ErrorResponse('Backup not found', 404));
  }

  try {
    // MongoDB restore command
    const dbUrl = process.env.MONGO_URI;
    const restoreCmd = `mongorestore --uri="${dbUrl}" --archive="${backup.path}" --gzip --drop`;

    // Execute restore command
    await execPromise(restoreCmd);

    res.status(200).json({
      success: true,
      message: 'Backup restored successfully'
    });
  } catch (error) {
    return next(new ErrorResponse('Backup restoration failed', 500));
  }
});

// @desc    Download backup
// @route   GET /api/v1/admin/settings/backups/:id/download
// @access  Private/Admin
exports.downloadBackup = asyncHandler(async (req, res, next) => {
  const backup = await Backup.findById(req.params.id);

  if (!backup) {
    return next(new ErrorResponse('Backup not found', 404));
  }

  if (!fs.existsSync(backup.path)) {
    return next(new ErrorResponse('Backup file not found', 404));
  }

  res.download(backup.path);
});

// @desc    Delete backup
// @route   DELETE /api/v1/admin/settings/backups/:id
// @access  Private/Admin
exports.deleteBackup = asyncHandler(async (req, res, next) => {
  const backup = await Backup.findById(req.params.id);

  if (!backup) {
    return next(new ErrorResponse('Backup not found', 404));
  }

  // Delete file if exists
  if (fs.existsSync(backup.path)) {
    fs.unlinkSync(backup.path);
  }

  await backup.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload and restore backup
// @route   POST /api/v1/admin/settings/backups/upload
// @access  Private/Admin
exports.uploadBackup = asyncHandler(async (req, res, next) => {
  if (!req.files || !req.files.backup) {
    return next(new ErrorResponse('Please upload a backup file', 400));
  }

  const file = req.files.backup;

  // Check file type
  if (!file.name.match(/\.(zip|sql)$/)) {
    return next(new ErrorResponse('Please upload a valid backup file', 400));
  }

  // Check file size
  if (file.size > process.env.MAX_BACKUP_SIZE) {
    return next(new ErrorResponse(`Please upload a backup less than ${process.env.MAX_BACKUP_SIZE}`, 400));
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `uploaded-backup-${timestamp}${path.extname(file.name)}`;
    const filePath = path.join(process.env.BACKUP_PATH, fileName);

    // Move file to backup directory
    await file.mv(filePath);

    // Create backup entry
    const backup = await Backup.create({
      fileName,
      path: filePath,
      size: file.size,
      type: 'manual',
      createdBy: req.user._id
    });

    res.status(200).json({
      success: true,
      data: backup
    });
  } catch (error) {
    return next(new ErrorResponse('Error uploading backup', 500));
  }
});