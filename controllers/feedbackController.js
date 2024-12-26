const Feedback = require('../models/feedbackModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const moment = require('moment');
const { Parser } = require('json2csv');

// @desc    Get all feedback
// @route   GET /api/v1/admin/communications/feedback
// @access  Private/Admin
exports.getFeedback = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, rating, category } = req.query;
  
  let query = {};

  // Date range filter
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Rating filter
  if (rating && rating !== 'all') {
    switch (rating) {
      case 'positive':
        query.rating = { $gte: 4 };
        break;
      case 'neutral':
        query.rating = 3;
        break;
      case 'negative':
        query.rating = { $lte: 2 };
        break;
    }
  }

  // Category filter
  if (category && category !== 'all') {
    query.category = category;
  }

  const feedback = await Feedback.find(query)
    .populate('patient', 'name email')
    .populate('response.respondedBy', 'name')
    .sort('-createdAt');

  // Calculate statistics
  const totalFeedback = feedback.length;
  const totalRating = feedback.reduce((sum, item) => sum + item.rating, 0);
  const averageRating = totalFeedback > 0 ? (totalRating / totalFeedback).toFixed(1) : 0;
  
  const positiveFeedback = feedback.filter(f => f.sentiment === 'positive').length;
  const negativeFeedback = feedback.filter(f => f.sentiment === 'negative').length;
  
  const positivePercentage = totalFeedback > 0 
    ? Math.round((positiveFeedback / totalFeedback) * 100) 
    : 0;
  
  const negativePercentage = totalFeedback > 0
    ? Math.round((negativeFeedback / totalFeedback) * 100)
    : 0;

  const statistics = {
    totalFeedback,
    averageRating,
    positivePercentage,
    negativePercentage,
    responseRate: Math.round((feedback.filter(f => f.status === 'responded').length / totalFeedback) * 100)
  };

  res.status(200).json({
    success: true,
    data: feedback,
    statistics
  });
});

// @desc    Get feedback by ID
// @route   GET /api/v1/admin/communications/feedback/:id
// @access  Private/Admin
exports.getFeedbackById = asyncHandler(async (req, res, next) => {
  const feedback = await Feedback.findById(req.params.id)
    .populate('patient', 'name email')
    .populate('response.respondedBy', 'name');

  if (!feedback) {
    return next(new ErrorResponse('Feedback not found', 404));
  }

  res.status(200).json({
    success: true,
    data: feedback
  });
});

// @desc    Respond to feedback
// @route   POST /api/v1/admin/communications/feedback/:id/respond
// @access  Private/Admin
exports.respondToFeedback = asyncHandler(async (req, res, next) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return next(new ErrorResponse('Feedback not found', 404));
  }

  feedback.response = {
    content: req.body.response,
    respondedBy: req.user._id,
    respondedAt: Date.now()
  };
  feedback.status = 'responded';

  await feedback.save();

  res.status(200).json({
    success: true,
    data: feedback
  });
});

// @desc    Export feedback
// @route   GET /api/v1/admin/communications/feedback/export
// @access  Private/Admin
exports.exportFeedback = asyncHandler(async (req, res, next) => {
  const feedback = await Feedback.find()
    .populate('patient', 'name email')
    .populate('response.respondedBy', 'name')
    .sort('-createdAt');

  const fields = [
    'Patient Name',
    'Email',
    'Rating',
    'Category',
    'Comment',
    'Sentiment',
    'Status',
    'Created At',
    'Response',
    'Responded By',
    'Responded At'
  ];

  const data = feedback.map(f => ({
    'Patient Name': f.patient.name,
    'Email': f.patient.email,
    'Rating': f.rating,
    'Category': f.category,
    'Comment': f.comment,
    'Sentiment': f.sentiment,
    'Status': f.status,
    'Created At': moment(f.createdAt).format('DD/MM/YYYY HH:mm'),
    'Response': f.response?.content || '',
    'Responded By': f.response?.respondedBy?.name || '',
    'Responded At': f.response?.respondedAt ? moment(f.response.respondedAt).format('DD/MM/YYYY HH:mm') : ''
  }));

  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(data);

  res.header('Content-Type', 'text/csv');
  res.attachment(`feedback_export_${moment().format('YYYY-MM-DD')}.csv`);
  res.send(csv);
});