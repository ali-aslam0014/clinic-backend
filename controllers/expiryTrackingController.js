const Medicine = require('../models/medicineModel');
const ExpiryHistory = require('../models/expiryTrackingModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const moment = require('moment');

// @desc    Get expiry tracking data
// @route   GET /api/v1/admin/pharmacy/medicines/expiry
// @access  Private/Admin
exports.getExpiryData = asyncHandler(async (req, res, next) => {
  try {
    console.log('Received request for expiry data');
    const { startDate, endDate, status } = req.query;
    
    console.log('Query params:', { startDate, endDate, status });
    
    let query = {};
    
    // Date range filter
    if (startDate && endDate) {
      query.expiryDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    console.log('Built query:', query);

    const medicines = await Medicine.find(query)
      .select('name batchNumber expiryDate stock unitPrice')
      .sort('expiryDate');

    console.log(`Found ${medicines.length} medicines`);

    // Calculate statistics
    const now = moment();
    const statistics = {
      expiringSoon: medicines.filter(m => 
        moment(m.expiryDate).diff(now, 'days') <= 90 && 
        moment(m.expiryDate).diff(now, 'days') > 0
      ).length,
      expired: medicines.filter(m => 
        moment(m.expiryDate).diff(now, 'days') <= 0
      ).length,
      totalValue: medicines.reduce((sum, m) => 
        sum + (m.stock * m.unitPrice), 0
      )
    };

    console.log('Calculated statistics:', statistics);

    res.status(200).json({
      success: true,
      data: medicines,
      statistics
    });
  } catch (error) {
    console.error('Error in getExpiryData:', error);
    next(error);
  }
});

// @desc    Dispose expired medicine
// @route   PUT /api/v1/admin/pharmacy/medicines/:id/dispose
// @access  Private/Admin
exports.disposeMedicine = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const medicine = await Medicine.findById(req.params.id).session(session);
    
    if (!medicine) {
      throw new ErrorResponse('Medicine not found', 404);
    }

    if (moment(medicine.expiryDate).isAfter(moment())) {
      throw new ErrorResponse('Cannot dispose non-expired medicine', 400);
    }

    // Create disposal history
    await ExpiryHistory.create([{
      medicine: medicine._id,
      action: 'disposed',
      previousExpiryDate: medicine.expiryDate,
      quantity: medicine.stock,
      reason: req.body.reason || 'Expired',
      performedBy: req.user._id,
      batchNumber: medicine.batchNumber,
      disposalMethod: req.body.disposalMethod || 'destroy',
      notes: req.body.notes
    }], { session });

    // Update medicine stock
    medicine.stock = 0;
    await medicine.save();

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// @desc    Extend medicine expiry date
// @route   PUT /api/v1/admin/pharmacy/medicines/:id/extend-expiry
// @access  Private/Admin
exports.extendExpiry = asyncHandler(async (req, res, next) => {
  const { newExpiryDate, reason } = req.body;

  if (!newExpiryDate || !reason) {
    return next(new ErrorResponse('Please provide new expiry date and reason', 400));
  }

  const medicine = await Medicine.findById(req.params.id);
  
  if (!medicine) {
    return next(new ErrorResponse('Medicine not found', 404));
  }

  // Create extension history
  await ExpiryHistory.create({
    medicine: medicine._id,
    action: 'extended',
    previousExpiryDate: medicine.expiryDate,
    newExpiryDate: newExpiryDate,
    quantity: medicine.stock,
    reason,
    performedBy: req.user._id,
    batchNumber: medicine.batchNumber
  });

  // Update medicine expiry date
  medicine.expiryDate = newExpiryDate;
  await medicine.save();

  res.status(200).json({
    success: true,
    data: medicine
  });
});

// @desc    Get expiry history
// @route   GET /api/v1/admin/pharmacy/medicines/expiry-history
// @access  Private/Admin
exports.getExpiryHistory = asyncHandler(async (req, res, next) => {
  const history = await ExpiryHistory.find()
    .populate('medicine', 'name')
    .populate('performedBy', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: history.length,
    data: history
  });
});