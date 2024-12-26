const Medicine = require('../models/Medicine');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all medicines
// @route   GET /api/v1/pharmacy/medicines
// @access  Private
exports.getMedicines = asyncHandler(async (req, res, next) => {
  const medicines = await Medicine.find()
    .populate('created_by', 'name')
    .populate('updated_by', 'name');

  res.status(200).json({
    success: true,
    count: medicines.length,
    data: medicines
  });
});

// @desc    Get single medicine
// @route   GET /api/v1/pharmacy/medicines/:id
// @access  Private
exports.getMedicine = asyncHandler(async (req, res, next) => {
  const medicine = await Medicine.findById(req.params.id)
    .populate('created_by', 'name')
    .populate('updated_by', 'name');

  if (!medicine) {
    return next(new ErrorResponse(`Medicine not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: medicine
  });
});

// @desc    Create new medicine
// @route   POST /api/v1/pharmacy/medicines
// @access  Private
exports.createMedicine = asyncHandler(async (req, res, next) => {
  req.body.created_by = req.user.id;
  
  const medicine = await Medicine.create(req.body);

  res.status(201).json({
    success: true,
    data: medicine
  });
});

// @desc    Update medicine
// @route   PUT /api/v1/pharmacy/medicines/:id
// @access  Private
exports.updateMedicine = asyncHandler(async (req, res, next) => {
  req.body.updated_by = req.user.id;
  
  let medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    return next(new ErrorResponse(`Medicine not found with id of ${req.params.id}`, 404));
  }

  medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: medicine
  });
});

// @desc    Delete medicine
// @route   DELETE /api/v1/pharmacy/medicines/:id
// @access  Private
exports.deleteMedicine = asyncHandler(async (req, res, next) => {
  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    return next(new ErrorResponse(`Medicine not found with id of ${req.params.id}`, 404));
  }

  await medicine.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get expiring medicines
// @route   GET /api/v1/pharmacy/medicines/expiry
// @access  Private
exports.getExpiringMedicines = asyncHandler(async (req, res, next) => {
  const medicines = await Medicine.find({
    expiryDate: {
      $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    }
  });

  const statistics = {
    expiringSoon: medicines.filter(m => m.expiryStatus === 'warning').length,
    expired: medicines.filter(m => m.expiryStatus === 'critical').length,
    totalValue: medicines.reduce((total, m) => total + (m.price * m.stock), 0)
  };

  res.status(200).json({
    success: true,
    statistics,
    data: medicines
  });
});

// @desc    Get low stock medicines
// @route   GET /api/v1/pharmacy/medicines/low-stock
// @access  Private
exports.getLowStockMedicines = asyncHandler(async (req, res, next) => {
  const medicines = await Medicine.find({
    $where: function() {
      return this.stock <= this.minimum_stock;
    }
  });

  res.status(200).json({
    success: true,
    count: medicines.length,
    data: medicines
  });
}); 