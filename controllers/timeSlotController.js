const TimeSlot = require('../models/timeSlotModel');

// Get all time slots
exports.getAllTimeSlots = async (req, res) => {
  try {
    const slots = await TimeSlot.find()
      .populate('doctorId', 'name email specialization')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching time slots',
      error: error.message
    });
  }
};

// Add new time slot
exports.addTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.create(req.body);
    const populatedSlot = await TimeSlot.findById(slot._id)
      .populate('doctorId', 'name email specialization');

    res.status(201).json({
      success: true,
      data: populatedSlot
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error adding time slot',
      error: error.message
    });
  }
};

// Update time slot
exports.updateTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('doctorId', 'name email specialization');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Time slot not found'
      });
    }

    res.status(200).json({
      success: true,
      data: slot
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating time slot',
      error: error.message
    });
  }
};

// Delete time slot
exports.deleteTimeSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.findByIdAndDelete(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Time slot not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Time slot deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error deleting time slot',
      error: error.message
    });
  }
};