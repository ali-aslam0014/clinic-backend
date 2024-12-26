const express = require('express');
const router = express.Router();
const {
  getExpiryData,
  disposeMedicine,
  extendExpiry,
  getExpiryHistory
} = require('../controllers/expiryTrackingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/medicines/expiry')
  .get(getExpiryData);

router.route('/medicines/:id/dispose')
  .put(disposeMedicine);

router.route('/medicines/:id/extend-expiry')
  .put(extendExpiry);

router.route('/medicines/expiry-history')
  .get(getExpiryHistory);

module.exports = router;