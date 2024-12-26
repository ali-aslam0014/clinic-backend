const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const PharmacyOrder = require('../models/PharmacyOrder');

class PharmacyIntegrationService {
  // Check medicine availability
  async checkMedicineAvailability(medicines) {
    try {
      const availabilityResults = await Promise.all(
        medicines.map(async (med) => {
          const medicine = await Medicine.findById(med.medicineId);
          return {
            medicineId: med.medicineId,
            name: medicine.name,
            available: medicine.stock >= med.quantity,
            requiredQuantity: med.quantity,
            currentStock: medicine.stock
          };
        })
      );

      return availabilityResults;
    } catch (error) {
      throw new Error('Error checking medicine availability: ' + error.message);
    }
  }

  // Create pharmacy order from prescription
  async createOrderFromPrescription(prescriptionId, userId) {
    try {
      const prescription = await Prescription.findById(prescriptionId)
        .populate('medicines.medicineId')
        .populate('patientId');

      if (!prescription) {
        throw new Error('Prescription not found');
      }

      // Check availability first
      const availability = await this.checkMedicineAvailability(prescription.medicines);
      const unavailableMedicines = availability.filter(med => !med.available);

      if (unavailableMedicines.length > 0) {
        throw new Error(`Some medicines are out of stock: ${unavailableMedicines.map(med => med.name).join(', ')}`);
      }

      // Calculate total amount
      const totalAmount = prescription.medicines.reduce((total, med) => {
        const medicine = med.medicineId;
        return total + (medicine.price * med.quantity);
      }, 0);

      // Create pharmacy order
      const order = await PharmacyOrder.create({
        prescriptionId,
        patientId: prescription.patientId._id,
        medicines: prescription.medicines.map(med => ({
          medicineId: med.medicineId._id,
          quantity: med.quantity,
          price: med.medicineId.price
        })),
        totalAmount,
        status: 'pending',
        createdBy: userId
      });

      return order;
    } catch (error) {
      throw new Error('Error creating pharmacy order: ' + error.message);
    }
  }

  // Update medicine stock after order processing
  async updateMedicineStock(orderId) {
    try {
      const order = await PharmacyOrder.findById(orderId).populate('medicines.medicineId');
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Update stock for each medicine
      await Promise.all(
        order.medicines.map(async (med) => {
          const medicine = await Medicine.findById(med.medicineId);
          medicine.stock -= med.quantity;
          await medicine.save();
        })
      );

      return true;
    } catch (error) {
      throw new Error('Error updating medicine stock: ' + error.message);
    }
  }

  // Get order status
  async getOrderStatus(orderId) {
    try {
      const order = await PharmacyOrder.findById(orderId)
        .populate('medicines.medicineId', 'name')
        .populate('patientId', 'name')
        .select('status createdAt updatedAt totalAmount');
      
      if (!order) {
        throw new Error('Order not found');
      }

      return order;
    } catch (error) {
      throw new Error('Error getting order status: ' + error.message);
    }
  }
}

module.exports = new PharmacyIntegrationService();