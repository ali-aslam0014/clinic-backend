const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const PharmacyOrder = require('../models/PharmacyOrder');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

exports.createPharmacyOrder = asyncHandler(async (req, res, next) => {
  const { prescriptionId } = req.params;

  // Get prescription details
  const prescription = await Prescription.findById(prescriptionId)
    .populate('medicines.medicine');

  if (!prescription) {
    return next(new ErrorResponse('Prescription not found', 404));
  }

  // Check medicine availability
  const unavailableMedicines = [];
  for (const med of prescription.medicines) {
    const medicine = await Medicine.findById(med.medicine);
    if (!medicine || medicine.stock < med.quantity) {
      unavailableMedicines.push(medicine.name);
    }
  }

  if (unavailableMedicines.length > 0) {
    return next(
      new ErrorResponse(
        `Following medicines are out of stock: ${unavailableMedicines.join(', ')}`,
        400
      )
    );
  }

  // Create pharmacy order
  const order = await PharmacyOrder.create({
    prescription: prescriptionId,
    patient: prescription.patient,
    medicines: prescription.medicines,
    status: 'pending',
    totalAmount: calculateTotalAmount(prescription.medicines),
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: order
  });
});

exports.checkMedicineAvailability = asyncHandler(async (req, res, next) => {
  const { medicineIds } = req.body;

  const availability = await Promise.all(
    medicineIds.map(async (id) => {
      const medicine = await Medicine.findById(id);
      return {
        medicineId: id,
        available: medicine ? medicine.stock > 0 : false,
        stock: medicine ? medicine.stock : 0
      };
    })
  );

  res.status(200).json({
    success: true,
    data: availability
  });
});

exports.getMedicinePrice = asyncHandler(async (req, res, next) => {
  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    return next(new ErrorResponse('Medicine not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      price: medicine.price,
      discounts: medicine.discounts || []
    }
  });
});