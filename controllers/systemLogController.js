const SystemLog = require('../models/SystemLog');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all logs
// @route   GET /api/v1/admin/system-logs
// @access  Private/Admin
exports.getLogs = asyncHandler(async (req, res, next) => {
  const { type, dateRange, user } = req.query;
  let query = {};

  // Apply filters
  if (type && type !== 'all') {
    query.type = type;
  }

  if (dateRange && dateRange.length === 2) {
    query.timestamp = {
      $gte: new Date(dateRange[0]),
      $lte: new Date(dateRange[1])
    };
  }

  if (user && user !== 'all') {
    query.user = user;
  }

  const logs = await SystemLog.find(query)
    .populate('user', 'name email')
    .sort('-timestamp');

  res.status(200).json({
    success: true,
    data: logs
  });
});

// @desc    Create new log
// @route   POST /api/v1/admin/system-logs
// @access  Private
exports.createLog = asyncHandler(async (req, res, next) => {
  const log = await SystemLog.create(req.body);

  res.status(201).json({
    success: true,
    data: log
  });
});

// @desc    Delete logs older than X days
// @route   DELETE /api/v1/admin/system-logs/cleanup
// @access  Private/Admin
exports.cleanupLogs = asyncHandler(async (req, res, next) => {
  const daysToKeep = req.query.days || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  await SystemLog.deleteMany({
    timestamp: { $lt: cutoffDate }
  });

  res.status(200).json({
    success: true,
    message: `Deleted logs older than ${daysToKeep} days`
  });
});