const express = require('express');
const router = express.Router();
const {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getPermissions
} = require('../controllers/roleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getRoles)
  .post(createRole);

router.route('/permissions')
  .get(getPermissions);

router.route('/:id')
  .get(getRole)
  .put(updateRole)
  .delete(deleteRole);

module.exports = router;