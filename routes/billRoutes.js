const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createBill,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  getPatientBills
} = require('../controllers/billController');

router.route('/')
  .post(protect, createBill)
  .get(protect, getBills);

router.route('/:id')
  .get(protect, getBillById)
  .put(protect, updateBill)
  .delete(protect, deleteBill);

router.get('/patient/:patientId', protect, getPatientBills);

module.exports = router;