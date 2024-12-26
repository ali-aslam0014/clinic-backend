const asyncHandler = require('express-async-handler');
const Bill = require('../models/billModel');

// @desc    Create new bill
// @route   POST /api/bills
// @access  Private
const createBill = asyncHandler(async (req, res) => {
  const bill = await Bill.create(req.body);
  
  await bill.populate('patientId');
  
  res.status(201).json({
    success: true,
    data: bill
  });
});

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private
const getBills = asyncHandler(async (req, res) => {
  const bills = await Bill.find()
    .populate('patientId', 'name email')
    .sort({ billDate: -1 });

  res.json({
    success: true,
    data: bills
  });
});

// @desc    Get bill by ID
// @route   GET /api/bills/:id
// @access  Private
const getBillById = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id)
    .populate('patientId');

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }

  res.json({
    success: true,
    data: bill
  });
});

// @desc    Update bill
// @route   PUT /api/bills/:id
// @access  Private
const updateBill = asyncHandler(async (req, res) => {
  let bill = await Bill.findById(req.params.id);

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }

  bill = await Bill.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('patientId');

  res.json({
    success: true,
    data: bill
  });
});

// @desc    Delete bill
// @route   DELETE /api/bills/:id
// @access  Private
const deleteBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id);

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }

  await bill.remove();

  res.json({
    success: true,
    data: {}
  });
});

// @desc    Get patient bills
// @route   GET /api/patients/:patientId/bills
// @access  Private
const getPatientBills = asyncHandler(async (req, res) => {
  const bills = await Bill.find({ patientId: req.params.patientId })
    .sort({ billDate: -1 });

  res.json({
    success: true,
    data: bills
  });
});

module.exports = {
  createBill,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  getPatientBills
};