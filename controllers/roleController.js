const Role = require('../models/roleModel');
const User = require('../models/userModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all roles
// @route   GET /api/v1/admin/roles
// @access  Private/Admin
exports.getRoles = asyncHandler(async (req, res, next) => {
  const roles = await Role.find()
    .populate('userCount')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

  res.status(200).json({
    success: true,
    data: roles
  });
});

// @desc    Get single role
// @route   GET /api/v1/admin/roles/:id
// @access  Private/Admin
exports.getRole = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id)
    .populate('userCount')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

  if (!role) {
    return next(new ErrorResponse('Role not found', 404));
  }

  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc    Create role
// @route   POST /api/v1/admin/roles
// @access  Private/Admin
exports.createRole = asyncHandler(async (req, res, next) => {
  // Check if role already exists
  const existingRole = await Role.findOne({ name: req.body.name });
  if (existingRole) {
    return next(new ErrorResponse('Role already exists', 400));
  }

  // Add user to req.body
  req.body.createdBy = req.user._id;
  req.body.updatedBy = req.user._id;

  const role = await Role.create(req.body);

  res.status(201).json({
    success: true,
    data: role
  });
});

// @desc    Update role
// @route   PUT /api/v1/admin/roles/:id
// @access  Private/Admin
exports.updateRole = asyncHandler(async (req, res, next) => {
  let role = await Role.findById(req.params.id);

  if (!role) {
    return next(new ErrorResponse('Role not found', 404));
  }

  // Prevent updating admin role name
  if (role.name === 'admin' && req.body.name && req.body.name !== 'admin') {
    return next(new ErrorResponse('Cannot change admin role name', 400));
  }

  // Add updatedBy to req.body
  req.body.updatedBy = req.user._id;

  role = await Role.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc    Delete role
// @route   DELETE /api/v1/admin/roles/:id
// @access  Private/Admin
exports.deleteRole = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    return next(new ErrorResponse('Role not found', 404));
  }

  // Check if role is in use
  const usersWithRole = await User.countDocuments({ role: role.name });
  if (usersWithRole > 0) {
    return next(new ErrorResponse('Cannot delete role that is assigned to users', 400));
  }

  await role.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get all permissions
// @route   GET /api/v1/admin/roles/permissions
// @access  Private/Admin
exports.getPermissions = asyncHandler(async (req, res, next) => {
  const permissions = [
    {
      module: 'Dashboard',
      permissions: ['dashboard.view']
    },
    {
      module: 'Patients',
      permissions: ['patients.view', 'patients.add', 'patients.edit', 'patients.delete']
    },
    {
      module: 'Appointments',
      permissions: ['appointments.view', 'appointments.schedule', 'appointments.edit', 'appointments.cancel']
    },
    {
      module: 'Users',
      permissions: ['users.view', 'users.add', 'users.edit', 'users.delete']
    },
    {
      module: 'Settings',
      permissions: ['settings.view', 'settings.manage']
    }
  ];

  res.status(200).json({
    success: true,
    data: permissions
  });
});