const Specialization = require('../models/specializationModel');

// Get all specializations
const getAllSpecializations = async (req, res) => {
  try {
    const specializations = await Specialization.find()
      .populate('doctorsCount');

    res.status(200).json({
      success: true,
      count: specializations.length,
      data: specializations
    });
  } catch (error) {
    console.error('Error fetching specializations:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Add specialization
const addSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.create(req.body);
    res.status(201).json({
      success: true,
      data: specialization
    });
  } catch (error) {
    console.error('Error adding specialization:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update specialization
const updateSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!specialization) {
      return res.status(404).json({
        success: false,
        error: 'Specialization not found'
      });
    }

    res.status(200).json({
      success: true,
      data: specialization
    });
  } catch (error) {
    console.error('Error updating specialization:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete specialization
const deleteSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.findByIdAndDelete(req.params.id);

    if (!specialization) {
      return res.status(404).json({
        success: false,
        error: 'Specialization not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting specialization:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getAllSpecializations,
  addSpecialization,
  updateSpecialization,
  deleteSpecialization
};