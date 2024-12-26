const Sale = require('../models/saleModel');
const Medicine = require('../models/medicineModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Create new sale
// @route   POST /api/v1/pharmacy/sales
// @access  Private/Admin
exports.createSale = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, totalAmount, discount, paymentMethod, patientName, patientPhone, notes } = req.body;

    // Calculate final amount
    const finalAmount = totalAmount - (discount || 0);

    // Validate and update medicine stock
    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine).session(session);
      if (!medicine) {
        throw new ErrorResponse(`Medicine not found with id of ${item.medicine}`, 404);
      }
      if (medicine.stock < item.quantity) {
        throw new ErrorResponse(`Insufficient stock for ${medicine.name}`, 400);
      }
      
      // Update stock
      medicine.stock -= item.quantity;
      await medicine.save({ session });
    }

    // Create sale record
    const sale = await Sale.create([{
      items: items.map(item => ({
        medicine: item.medicine,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      })),
      totalAmount,
      discount: discount || 0,
      finalAmount,
      paymentMethod,
      paidAmount: finalAmount, // Assuming full payment
      patientName,
      patientPhone,
      notes,
      saleBy: req.user._id
    }], { session });

    await session.commitTransaction();

    // Populate medicine details in response
    const populatedSale = await Sale.findById(sale[0]._id)
      .populate('items.medicine', 'name genericName manufacturer')
      .populate('saleBy', 'name');

    res.status(201).json({
      success: true,
      data: populatedSale
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// @desc    Get all sales with filters
// @route   GET /api/v1/pharmacy/sales
// @access  Private/Admin
exports.getSales = asyncHandler(async (req, res, next) => {
  // Build query
  let query = Sale.find()
    .populate('items.medicine', 'name genericName')
    .populate('saleBy', 'name');

  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    query = query.where('createdAt').gte(req.query.startDate).lte(req.query.endDate);
  }

  // Filter by payment method
  if (req.query.paymentMethod) {
    query = query.where('paymentMethod').equals(req.query.paymentMethod);
  }

  // Filter by payment status
  if (req.query.paymentStatus) {
    query = query.where('paymentStatus').equals(req.query.paymentStatus);
  }

  // Filter by status
  if (req.query.status) {
    query = query.where('status').equals(req.query.status);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Sale.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // Execute query
  const sales = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: sales.length,
    pagination,
    data: sales
  });
});

// @desc    Get daily sales report
// @route   GET /api/v1/pharmacy/sales/daily-report
// @access  Private/Admin
exports.getDailySalesReport = asyncHandler(async (req, res, next) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const report = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalAmount: { $sum: '$finalAmount' },
        totalDiscount: { $sum: '$discount' },
        cashSales: {
          $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, 1, 0] }
        },
        cardSales: {
          $sum: { $cond: [{ $eq: ['$paymentMethod', 'card'] }, 1, 0] }
        }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: report[0] || {
      totalSales: 0,
      totalAmount: 0,
      totalDiscount: 0,
      cashSales: 0,
      cardSales: 0
    }
  });
});

// @desc    Return sale items
// @route   PUT /api/v1/pharmacy/sales/:id/return
// @access  Private/Admin
exports.returnSale = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) {
      return next(new ErrorResponse(`Sale not found with id of ${req.params.id}`, 404));
    }

    if (sale.status !== 'completed') {
      return next(new ErrorResponse('Only completed sales can be returned', 400));
    }

    // Return items to stock
    for (const item of sale.items) {
      const medicine = await Medicine.findById(item.medicine).session(session);
      if (medicine) {
        medicine.stock += item.quantity;
        await medicine.save({ session });
      }
    }

    sale.status = 'returned';
    await sale.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// @desc    Return sale items
// @route   PUT /api/sales/:id/return
// @access  Private (Pharmacist)
exports.returnSale = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) {
      return next(new ErrorResponse(`Sale not found with id of ${req.params.id}`, 404));
    }

    // Check if sale is already returned
    if (sale.status === 'returned') {
      return next(new ErrorResponse('Sale is already returned', 400));
    }

    // Return items to stock
    for (const item of sale.items) {
      const medicine = await Medicine.findById(item.medicine).session(session);
      if (medicine) {
        medicine.stock += item.quantity;
        await medicine.save({ session });
      }
    }

    // Update sale status
    sale.status = 'returned';
    sale.returnDate = Date.now();
    sale.returnedBy = req.user.id;
    sale.returnReason = req.body.reason;
    await sale.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// @desc    Get daily sales report
// @route   GET /api/sales/reports/daily
// @access  Private (Pharmacist)
exports.getDailySalesReport = asyncHandler(async (req, res, next) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const report = await Sale.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        status: { $ne: 'returned' }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        totalDiscount: { $sum: '$discount' },
        cashSales: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'cash'] }, 1, 0]
          }
        },
        cardSales: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'card'] }, 1, 0]
          }
        }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: report[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalDiscount: 0,
      cashSales: 0,
      cardSales: 0
    }
  });
});

// @desc    Get monthly sales report
// @route   GET /api/sales/reports/monthly
// @access  Private (Pharmacist)
exports.getMonthlySalesReport = asyncHandler(async (req, res, next) => {
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || new Date().getMonth() + 1;

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const report = await Sale.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth
        },
        status: { $ne: 'returned' }
      }
    },
    {
      $group: {
        _id: { $dayOfMonth: '$createdAt' },
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        totalDiscount: { $sum: '$discount' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: report
  });
});

// @desc    Get top selling medicines
// @route   GET /api/sales/reports/top-medicines
// @access  Private (Pharmacist)
exports.getTopSellingMedicines = asyncHandler(async (req, res, next) => {
  const days = parseInt(req.query.days) || 30;
  const limit = parseInt(req.query.limit) || 10;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const report = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $ne: 'returned' }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $group: {
        _id: '$items.medicine',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
      }
    },
    {
      $sort: { totalQuantity: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'medicines',
        localField: '_id',
        foreignField: '_id',
        as: 'medicine'
      }
    },
    {
      $unwind: '$medicine'
    },
    {
      $project: {
        name: '$medicine.name',
        genericName: '$medicine.genericName',
        totalQuantity: 1,
        totalRevenue: 1
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: report
  });
});