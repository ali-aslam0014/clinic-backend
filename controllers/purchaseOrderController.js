const PurchaseOrder = require('../models/purchaseOrderModel');
const Medicine = require('../models/medicineModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Create purchase order
// @route   POST /api/v1/admin/pharmacy/purchase-orders
// @access  Private/Admin
exports.createPurchaseOrder = asyncHandler(async (req, res, next) => {
  // Calculate total for each item and overall total
  const items = req.body.items.map(item => ({
    ...item,
    total: item.quantity * item.unitPrice
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const purchaseOrder = await PurchaseOrder.create({
    ...req.body,
    items,
    totalAmount,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: purchaseOrder
  });
});

// @desc    Get all purchase orders
// @route   GET /api/v1/admin/pharmacy/purchase-orders
// @access  Private/Admin
exports.getPurchaseOrders = asyncHandler(async (req, res, next) => {
  const purchaseOrders = await PurchaseOrder.find()
    .populate('supplier', 'name')
    .populate('items.medicine', 'name')
    .populate('createdBy', 'name')
    .populate('approvedBy', 'name')
    .populate('receivedBy', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: purchaseOrders.length,
    data: purchaseOrders
  });
});

// @desc    Get single purchase order
// @route   GET /api/v1/admin/pharmacy/purchase-orders/:id
// @access  Private/Admin
exports.getPurchaseOrder = asyncHandler(async (req, res, next) => {
  const purchaseOrder = await PurchaseOrder.findById(req.params.id)
    .populate('supplier', 'name')
    .populate('items.medicine', 'name')
    .populate('createdBy', 'name')
    .populate('approvedBy', 'name')
    .populate('receivedBy', 'name');

  if (!purchaseOrder) {
    return next(new ErrorResponse(`Purchase order not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: purchaseOrder
  });
});

// @desc    Update purchase order
// @route   PUT /api/v1/admin/pharmacy/purchase-orders/:id
// @access  Private/Admin
exports.updatePurchaseOrder = asyncHandler(async (req, res, next) => {
  let purchaseOrder = await PurchaseOrder.findById(req.params.id);

  if (!purchaseOrder) {
    return next(new ErrorResponse(`Purchase order not found with id of ${req.params.id}`, 404));
  }

  if (purchaseOrder.status !== 'pending') {
    return next(new ErrorResponse('Cannot update approved or received purchase order', 400));
  }

  // Calculate totals
  const items = req.body.items.map(item => ({
    ...item,
    total: item.quantity * item.unitPrice
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      items,
      totalAmount
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: purchaseOrder
  });
});

// @desc    Receive purchase order
// @route   PUT /api/v1/admin/pharmacy/purchase-orders/:id/receive
// @access  Private/Admin
exports.receivePurchaseOrder = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id).session(session);

    if (!purchaseOrder) {
      throw new ErrorResponse(`Purchase order not found with id of ${req.params.id}`, 404);
    }

    if (purchaseOrder.status !== 'approved') {
      throw new ErrorResponse('Purchase order must be approved before receiving', 400);
    }

    // Update medicine stock
    for (const item of purchaseOrder.items) {
      const medicine = await Medicine.findById(item.medicine).session(session);
      if (!medicine) {
        throw new ErrorResponse(`Medicine not found with id of ${item.medicine}`, 404);
      }

      medicine.stock += item.quantity;
      await medicine.save();
    }

    // Update purchase order status
    purchaseOrder.status = 'received';
    purchaseOrder.receivedDate = Date.now();
    purchaseOrder.receivedBy = req.user._id;
    await purchaseOrder.save();

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: purchaseOrder
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// @desc    Cancel purchase order
// @route   PUT /api/v1/admin/pharmacy/purchase-orders/:id/cancel
// @access  Private/Admin
exports.cancelPurchaseOrder = asyncHandler(async (req, res, next) => {
  const purchaseOrder = await PurchaseOrder.findById(req.params.id);

  if (!purchaseOrder) {
    return next(new ErrorResponse(`Purchase order not found with id of ${req.params.id}`, 404));
  }

  if (purchaseOrder.status !== 'pending') {
    return next(new ErrorResponse('Cannot cancel approved or received purchase order', 400));
  }

  purchaseOrder.status = 'cancelled';
  await purchaseOrder.save();

  res.status(200).json({
    success: true,
    data: purchaseOrder
  });
});