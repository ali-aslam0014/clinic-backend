// const Setting = require('../models/settingModel');
// const ErrorResponse = require('../utils/errorResponse');
// const asyncHandler = require('../middleware/async');

// // @desc    Get all settings
// // @route   GET /api/v1/admin/settings
// // @access  Private/Admin
// exports.getSettings = asyncHandler(async (req, res, next) => {
//   let settings = await Setting.findOne().populate('updatedBy', 'name');

//   if (!settings) {
//     // Create default settings if none exist
//     settings = await Setting.create({
//       updatedBy: req.user._id
//     });
//   }

//   res.status(200).json({
//     success: true,
//     data: settings
//   });
// });

// // @desc    Update settings
// // @route   PUT /api/v1/admin/settings
// // @access  Private/Admin
// exports.updateSettings = asyncHandler(async (req, res, next) => {
//   // Add updatedBy to request body
//   req.body.updatedBy = req.user._id;

//   let settings = await Setting.findOne();

//   if (!settings) {
//     settings = await Setting.create(req.body);
//   } else {
//     settings = await Setting.findOneAndUpdate({}, req.body, {
//       new: true,
//       runValidators: true
//     });
//   }

//   // Update user preferences if theme or language changes
//   if (req.body.appearance?.theme || req.body.system?.language) {
//     await req.user.updateOne({
//       'preferences.theme': req.body.appearance?.theme || req.user.preferences.theme,
//       'preferences.language': req.body.system?.language || req.user.preferences.language
//     });
//   }

//   res.status(200).json({
//     success: true,
//     data: settings
//   });
// });

// // @desc    Reset settings to default
// // @route   POST /api/v1/admin/settings/reset
// // @access  Private/Admin
// exports.resetSettings = asyncHandler(async (req, res, next) => {
//   await Setting.findOneAndDelete();
  
//   const settings = await Setting.create({
//     updatedBy: req.user._id
//   });

//   res.status(200).json({
//     success: true,
//     data: settings
//   });
// });

// // @desc    Get specific setting
// // @route   GET /api/v1/admin/settings/:section
// // @access  Private/Admin
// exports.getSetting = asyncHandler(async (req, res, next) => {
//   const settings = await Setting.findOne().select(req.params.section);

//   if (!settings) {
//     return next(new ErrorResponse('Settings not found', 404));
//   }

//   res.status(200).json({
//     success: true,
//     data: settings[req.params.section]
//   });
// });

// // @desc    Update specific setting
// // @route   PUT /api/v1/admin/settings/:section
// // @access  Private/Admin
// exports.updateSetting = asyncHandler(async (req, res, next) => {
//   let settings = await Setting.findOne();

//   if (!settings) {
//     settings = new Setting();
//   }

//   settings[req.params.section] = req.body;
//   settings.updatedBy = req.user._id;
//   await settings.save();

//   res.status(200).json({
//     success: true,
//     data: settings[req.params.section]
//   });
// });