const Stock = require('../models/Stock');
const Medicine = require('../models/Medicine');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const mongoose = require('mongoose');

// @desc    Update stock levels
// @route   POST /api/v1/pharmacy/stock/update
// @access  Private/Admin
exports.updateStock = asyncHandler(async (req, res, next) => {
  const { medicineId, quantity, type, reason } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const medicine = await Medicine.findById(medicineId).session(session);
    
    if (!medicine) {
      throw new ErrorResponse(`Medicine not found with id of ${medicineId}`, 404);
    }

    // Calculate new stock level
    const newStock = type === 'add' 
      ? medicine.stock + quantity
      : medicine.stock - quantity;

    if (newStock < 0) {
      throw new ErrorResponse('Insufficient stock', 400);
    }

    // Update medicine stock
    medicine.stock = newStock;
    await medicine.save({ session });

    // Create stock history record
    const stockRecord = await Stock.create([{
      medicine: medicineId,
      quantity,
      type,
      reason,
      previousStock: medicine.stock,
      newStock,
      updatedBy: req.user._id
    }], { session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: stockRecord[0]
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// @desc    Get stock history
// @route   GET /api/v1/pharmacy/stock/history
// @access  Private/Admin
exports.getStockHistory = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, medicineId } = req.query;
  
  let query = Stock.find()
    .populate('medicine', 'name genericName')
    .populate('updatedBy', 'name')
    .sort('-createdAt');

  // Apply filters
  if (startDate && endDate) {
    query = query.where('createdAt').gte(startDate).lte(endDate);
  }

  if (medicineId) {
    query = query.where('medicine', medicineId);
  }

  const history = await query;

  res.status(200).json({
    success: true,
    count: history.length,
    data: history
  });
});

// @desc    Get stock statistics
// @route   GET /api/v1/pharmacy/stock/statistics
// @access  Private/Admin
exports.getStockStatistics = asyncHandler(async (req, res, next) => {
  const stats = await Medicine.aggregate([
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        lowStockItems: {
          $sum: {
            $cond: [{ $lte: ['$stock', '$minStockLevel'] }, 1, 0]
          }
        },
        outOfStockItems: {
          $sum: {
            $cond: [{ $eq: ['$stock', 0] }, 1, 0]
          }
        },
        totalValue: {
          $sum: { $multiply: ['$stock', '$purchasePrice'] }
        }
      }
    }
  ]);

  // Get expiring medicines count
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const expiringCount = await Medicine.countDocuments({
    expiryDate: {
      $lte: threeMonthsFromNow,
      $gte: new Date()
    }
  });

  res.status(200).json({
    success: true,
    data: {
      ...stats[0],
      expiringItems: expiringCount
    }
  });
});

// @desc    Get stock alerts
// @route   GET /api/v1/pharmacy/stock/alerts
// @access  Private/Admin
exports.getStockAlerts = asyncHandler(async (req, res, next) => {
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const alerts = await Medicine.find({
    $or: [
      // Low stock alerts
      {
        stock: { $lte: '$minStockLevel' }
      },
      // Expiring soon alerts
      {
        expiryDate: {
          $lte: threeMonthsFromNow,
          $gte: new Date()
        }
      }
    ]
  }).select('name stock minStockLevel expiryDate');

  const categorizedAlerts = {
    lowStock: alerts.filter(item => item.stock <= item.minStockLevel),
    expiringSoon: alerts.filter(item => {
      const expiryDate = new Date(item.expiryDate);
      return expiryDate <= threeMonthsFromNow && expiryDate >= new Date();
    })
  };

  res.status(200).json({
    success: true,
    data: categorizedAlerts
  });
});