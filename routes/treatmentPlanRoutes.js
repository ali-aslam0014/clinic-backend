const express = require('express');
const router = express.Router({ mergeParams: true }); // Important for nested routes
const { protect, authorize } = require('../middleware/auth');
const {
  getTreatmentPlans,
  getTreatmentPlan,
  createTreatmentPlan,
  updateTreatmentPlan,
  deleteTreatmentPlan,
  updateProgress,
  updateGoalStatus
} = require('../controllers/treatmentPlanController');

// Protect all routes
router.use(protect);

// Treatment Plan routes
router
  .route('/')
  .get(authorize('admin', 'doctor', 'nurse'), getTreatmentPlans)
  .post(authorize('admin', 'doctor'), createTreatmentPlan);

router
  .route('/:id')
  .get(authorize('admin', 'doctor', 'nurse'), getTreatmentPlan)
  .put(authorize('admin', 'doctor'), updateTreatmentPlan)
  .delete(authorize('admin', 'doctor'), deleteTreatmentPlan);

// Progress routes
router
  .route('/:id/progress')
  .post(authorize('admin', 'doctor'), updateProgress);

// Goal status routes
router
  .route('/:id/goals/:goalId')
  .put(authorize('admin', 'doctor'), updateGoalStatus);

module.exports = router;