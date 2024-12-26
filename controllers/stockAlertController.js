const Medicine = require('../models/medicineModel');
const StockAlert = require('../models/stockAlertModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get stock alerts
// @route   GET /api/v1/admin/pharmacy/medicines/stock-alerts
// @access  Private/Admin
exports.getStockAlerts = asyncHandler(async (req, res, next) => {
  try {
    const { status, category } = req.query;
    
    let query = {};
    
    // Status filter
    if (status && status !== 'all') {
      switch (status) {
        case 'out':
          query.stock = 0;
          break;
        case 'low':
          query.stock = { $gt: 0, $lte: '$minStockLevel' };
          break;
        case 'sufficient':
          query.stock = { $gt: '$minStockLevel' };
          break;
      }
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    const medicines = await Medicine.find(query)
      .populate('category', 'name')
      .select('name category stock minStockLevel unitPrice updatedAt')
      .sort('stock');

    // Calculate statistics
    const statistics = {
      outOfStock: medicines.filter(m => m.stock === 0).length,
      lowStock: medicines.filter(m => m.stock > 0 && m.stock <= m.minStockLevel).length,
      totalValue: medicines.reduce((sum, m) => {
        const requiredStock = Math.max(m.minStockLevel - m.stock, 0);
        return sum + (requiredStock * m.unitPrice);
      }, 0)
    };

    res.status(200).json({
      success: true,
      data: medicines,
      statistics
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update minimum stock level
// @route   PUT /api/v1/admin/pharmacy/medicines/:id/min-stock
// @access  Private/Admin
exports.updateMinStockLevel = asyncHandler(async (req, res, next) => {
  const { minStockLevel } = req.body;

  if (minStockLevel < 0) {
    return next(new ErrorResponse('Minimum stock level cannot be negative', 400));
  }

  const medicine = await Medicine.findByIdAndUpdate(
    req.params.id,
    { minStockLevel },
    { new: true, runValidators: true }
  );

  if (!medicine) {
    return next(new ErrorResponse('Medicine not found', 404));
  }

  // Check if need to create/update stock alert
  if (medicine.stock <= medicine.minStockLevel) {
    await StockAlert.findOneAndUpdate(
      { 
        medicine: medicine._id,
        status: 'active'
      },
      {
        type: medicine.stock === 0 ? 'out_of_stock' : 'low_stock',
        threshold: medicine.minStockLevel,
        currentStock: medicine.stock
      },
      { upsert: true, new: true }
    );
  } else {
    // Resolve any active alerts
    await StockAlert.updateMany(
      {
        medicine: medicine._id,
        status: 'active'
      },
      {
        status: 'resolved',
        resolvedAt: Date.now(),
        resolvedBy: req.user._id
      }
    );
  }

  res.status(200).json({
    success: true,
    data: medicine
  });
});

// @desc    Get stock alert history
// @route   GET /api/v1/admin/pharmacy/stock-alerts/history
// @access  Private/Admin
exports.getStockAlertHistory = asyncHandler(async (req, res, next) => {
  const alerts = await StockAlert.find()
    .populate('medicine', 'name')
    .populate('resolvedBy', 'name')
    .populate('notifiedUsers.user', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: alerts.length,
    data: alerts
  });
});

// @desc    Create stock alert notification
// @route   POST /api/v1/admin/pharmacy/stock-alerts/notify
// @access  Private/Admin
exports.createStockAlertNotification = asyncHandler(async (req, res, next) => {
  const { medicineId, userId } = req.body;

  const alert = await StockAlert.findOne({
    medicine: medicineId,
    status: 'active'
  });

  if (!alert) {
    return next(new ErrorResponse('No active alert found for this medicine', 404));
  }

  // Add notification record
  alert.notifiedUsers.push({
    user: userId,
    notifiedAt: Date.now()
  });

  await alert.save();

  res.status(200).json({
    success: true,
    data: alert
  });
});