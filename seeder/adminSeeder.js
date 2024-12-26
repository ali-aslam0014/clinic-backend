const User = require('../models/User');

const createDefaultAdmin = async () => {
  try {
    // Check if admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin already exists');
      console.log('Email:', existingAdmin.email);
      return;
    }

    // Create new admin user only if one doesn't exist
    const adminData = {
      name: 'System Admin',
      email: 'admin@clinic.com',
      password: 'admin123',
      role: 'admin',
      phone: '1234567890',
      address: 'System Address',
      gender: 'other',
      dateOfBirth: new Date('1990-01-01'),
      bloodGroup: 'O+'
    };

    const admin = await User.create(adminData);
    
    if (admin) {
      console.log('New admin created successfully');
      console.log('Email:', admin.email);
      console.log('Password: admin123');
    }
  } catch (error) {
    console.error('Error in admin seeder:', error.message);
  }
};

module.exports = createDefaultAdmin;