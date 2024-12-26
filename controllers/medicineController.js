const Medicine = require('../models/Medicine');
const StockHistory = require('../models/stockHistoryModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const moment = require('moment');
const Notification = require('../models/NotificationSettings');

// @desc    Get all medicines with filters
// @route   GET /api/v1/admin/pharmacy/medicines
// @access  Private/Admin
exports.getMedicines = asyncHandler(async (req, res, next) => {
  const { 
    search, 
    category, 
    type, 
    status,
    minStock,
    maxStock,
    minPrice,
    maxPrice,
    supplier,
    prescriptionRequired
  } = req.query;

  // Build query
  const query = {};

  // Search by name or generic name
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } }
    ];
  }

  // Apply filters
  if (category) query.category = category;
  if (type) query.type = type;
  if (status) query.status = status;
  if (supplier) query.supplier = supplier;
  if (prescriptionRequired) query.prescriptionRequired = prescriptionRequired === 'true';

  // Stock range filter
  if (minStock || maxStock) {
    query.stock = {};
    if (minStock) query.stock.$gte = Number(minStock);
    if (maxStock) query.stock.$lte = Number(maxStock);
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  const medicines = await Medicine.find(query)
    .populate('supplier', 'name')
    .populate('lastUpdatedBy', 'name')
    .sort('name');

  res.status(200).json({
    success: true,
    count: medicines.length,
    data: medicines
  });
});

// @desc    Get single medicine
// @route   GET /api/v1/admin/pharmacy/medicines/:id
// @access  Private/Admin
exports.getMedicine = asyncHandler(async (req, res, next) => {
  const medicine = await Medicine.findById(req.params.id)
    .populate('supplier', 'name');

  if (!medicine) {
    return next(new ErrorResponse(`Medicine not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: medicine
  });
});

// @desc    Create new medicine
// @route   POST /api/medicines
// @access  Private (Admin, Pharmacist)
exports.createMedicine = asyncHandler(async (req, res) => {
  const {
    name,
    genericName,
    category,
    manufacturer,
    barcode,
    price,
    stock,
    minStockLevel,
    manufacturingDate,
    expiryDate,
    description,
    image
  } = req.body;

  // Validate expiry date
  if (moment(expiryDate).isBefore(manufacturingDate)) {
    return res.status(400).json({
      success: false,
      error: 'Expiry date must be after manufacturing date'
    });
  }

  // Create medicine
  const medicine = await Medicine.create({
    name,
    genericName,
    category,
    manufacturer,
    barcode,
    price,
    stock,
    minStockLevel,
    manufacturingDate,
    expiryDate,
    description,
    image,
    addedBy: req.user._id
  });

  // Create initial stock history
  await StockHistory.create({
    medicine: medicine._id,
    type: 'initial',
    quantity: stock,
    date: Date.now(),
    updatedBy: req.user._id,
    notes: 'Initial stock entry'
  });

  // Check if stock is below minimum level
  if (stock <= minStockLevel) {
    // Create notification for low stock
    await Notification.create({
      type: 'low_stock',
      message: `New medicine ${name} added with low stock (${stock} units)`,
      medicine: medicine._id,
      user: req.user._id
    });
  }

  // Check if medicine is expiring soon (within 90 days)
  const daysUntilExpiry = moment(expiryDate).diff(moment(), 'days');
  if (daysUntilExpiry <= 90) {
    await Notification.create({
      type: 'expiring_soon',
      message: `New medicine ${name} will expire in ${daysUntilExpiry} days`,
      medicine: medicine._id,
      user: req.user._id
    });
  }

  res.status(201).json({
    success: true,
    data: medicine
  });
});

// @desc    Update medicine
// @route   PUT /api/v1/admin/pharmacy/medicines/:id
// @access  Private/Admin
exports.updateMedicine = asyncHandler(async (req, res, next) => {
  let medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    return next(new ErrorResponse(`Medicine not found with id of ${req.params.id}`, 404));
  }

  // Check if name is being updated and if new name already exists
  if (req.body.name && req.body.name !== medicine.name) {
    const existingMedicine = await Medicine.findOne({ name: req.body.name });
    if (existingMedicine) {
      return next(new ErrorResponse('Medicine with this name already exists', 400));
    }
  }

  medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Check if stock is below minimum level
  if (medicine.stock <= medicine.minStockLevel) {
    // TODO: Send low stock notification
    console.log(`Low stock alert for ${medicine.name}`);
  }

  res.status(200).json({
    success: true,
    data: medicine
  });
});

// @desc    Delete medicine
// @route   DELETE /api/v1/admin/pharmacy/medicines/:id
// @access  Private/Admin
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

// @desc    Get low stock medicines
// @route   GET /api/v1/admin/pharmacy/medicines/low-stock
// @access  Private/Admin
exports.getLowStockMedicines = asyncHandler(async (req, res, next) => {
  const medicines = await Medicine.find({
    $expr: { $lte: ['$stock', '$minStockLevel'] }
  }).populate('supplier', 'name');

  res.status(200).json({
    success: true,
    count: medicines.length,
    data: medicines
  });
});

// @desc    Get expiring medicines
// @route   GET /api/v1/admin/pharmacy/medicines/expiring
// @access  Private/Admin
exports.getExpiringMedicines = asyncHandler(async (req, res, next) => {
  const threeMonthsFromNow = moment().add(3, 'months').toDate();

  const medicines = await Medicine.find({
    expiryDate: { $lte: threeMonthsFromNow }
  }).populate('supplier', 'name');

  res.status(200).json({
    success: true,
    count: medicines.length,
    data: medicines
  });
});

// @desc    Update medicine stock
// @route   PATCH /api/v1/admin/pharmacy/medicines/:id/stock
// @access  Private/Admin
exports.updateStock = asyncHandler(async (req, res, next) => {
  const { operation, quantity, reason } = req.body;

  if (!['add', 'subtract'].includes(operation)) {
    return next(new ErrorResponse('Invalid operation type', 400));
  }

  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    return next(new ErrorResponse(`Medicine not found with id of ${req.params.id}`, 404));
  }

  // Update stock
  if (operation === 'add') {
    medicine.stock += Number(quantity);
  } else {
    if (medicine.stock < quantity) {
      return next(new ErrorResponse('Insufficient stock', 400));
    }
    medicine.stock -= Number(quantity);
  }

  // Update last stock change details
  medicine.lastStockUpdate = {
    date: Date.now(),
    operation,
    quantity,
    reason,
    updatedBy: req.user._id
  };

  medicine.lastUpdatedBy = req.user._id;

  await medicine.save();

  // Check if stock is below minimum level
  if (medicine.stock <= medicine.minStockLevel) {
    // TODO: Implement notification system
    console.log(`Low stock alert for ${medicine.name}`);
  }

  res.status(200).json({
    success: true,
    data: medicine
  });
});

// @desc    Get medicine stock history
// @route   GET /api/v1/admin/pharmacy/medicines/:id/stock-history
// @access  Private/Admin
exports.getStockHistory = asyncHandler(async (req, res, next) => {
  const medicine = await Medicine.findById(req.params.id)
    .populate('stockHistory.updatedBy', 'name')
    .select('name stockHistory');

  if (!medicine) {
    return next(new ErrorResponse(`Medicine not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: medicine.stockHistory
  });
});

// @desc    Get medicine statistics
// @route   GET /api/v1/admin/pharmacy/medicines/statistics
// @access  Private/Admin
exports.getMedicineStatistics = asyncHandler(async (req, res, next) => {
  const totalMedicines = await Medicine.countDocuments();
  const lowStock = await Medicine.countDocuments({
    $expr: { $lte: ['$stock', '$minStockLevel'] }
  });
  const outOfStock = await Medicine.countDocuments({ stock: 0 });
  const expiringCount = await Medicine.countDocuments({
    expiryDate: { 
      $lte: moment().add(3, 'months').toDate(),
      $gte: new Date()
    }
  });

  const categoryStats = await Medicine.aggregate([
    { $group: { 
      _id: '$category', 
      count: { $sum: 1 },
      totalStock: { $sum: '$stock' },
      averagePrice: { $avg: '$price' }
    }}
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalMedicines,
      lowStock,
      outOfStock,
      expiringCount,
      categoryStats
    }
  });
});

// @desc    Get low stock medicines
// @route   GET /api/medicines/low-stock
// @access  Private (Pharmacist)
exports.getLowStockMedicines = asyncHandler(async (req, res, next) => {
  // Find all medicines where stock is less than or equal to minStockLevel
  const medicines = await Medicine.find({
    $expr: {
      $lte: ['$stock', '$minStockLevel']
    }
  }).sort({ stock: 1 }); // Sort by stock level ascending

  // Add warning level to each medicine
  const medicinesWithWarning = medicines.map(medicine => {
    const stockDifference = medicine.minStockLevel - medicine.stock;
    return {
      ...medicine.toObject(),
      warningLevel: stockDifference >= medicine.minStockLevel ? 'critical' : 'low'
    };
  });

  res.status(200).json({
    success: true,
    count: medicines.length,
    data: medicinesWithWarning
  });
});

// @desc    Update medicine stock
// @route   PUT /api/medicines/:id/stock
// @access  Private (Pharmacist)
exports.updateMedicineStock = asyncHandler(async (req, res, next) => {
  const { quantity, type, reason } = req.body;

  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    return next(new ErrorResponse(`Medicine not found with id of ${req.params.id}`, 404));
  }

  // Calculate new stock based on type (add/subtract)
  let newStock;
  if (type === 'add') {
    newStock = medicine.stock + quantity;
  } else if (type === 'subtract') {
    if (medicine.stock < quantity) {
      return next(new ErrorResponse('Insufficient stock', 400));
    }
    newStock = medicine.stock - quantity;
  }

  // Update stock
  medicine.stock = newStock;
  await medicine.save();

  // Create stock history record
  await StockHistory.create({
    medicine: medicine._id,
    type,
    quantity,
    reason,
    updatedBy: req.user.id,
    previousStock: medicine.stock,
    newStock
  });

  // Check if still low on stock
  if (newStock <= medicine.minStockLevel) {
    // Create or update notification
    await Notification.create({
      type: 'low_stock',
      message: `${medicine.name} is still low on stock (${newStock} units remaining)`,
      medicine: medicine._id,
      user: req.user.id
    });
  }

  res.status(200).json({
    success: true,
    data: medicine
  });
});

// @desc    Get stock history for a medicine
// @route   GET /api/medicines/:id/stock-history
// @access  Private (Pharmacist)
exports.getMedicineStockHistory = asyncHandler(async (req, res, next) => {
  const history = await StockHistory.find({ medicine: req.params.id })
    .populate('updatedBy', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: history.length,
    data: history
  });
});