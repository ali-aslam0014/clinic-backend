const express = require('express');
const router = express.Router();
const {
  register,
  login,
  adminLogin
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', async (req, res, next) => {
    try {
        await login(req, res);
    } catch (error) {
        console.error('Login error:', error);
        next(error);
    }
});
router.post('/admin/login', adminLogin);

module.exports = router;