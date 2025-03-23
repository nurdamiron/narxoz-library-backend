// src/routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  registerAdmin,
  refreshToken,
  checkEmail,
  checkStudentId
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Registration validation
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('faculty')
    .trim()
    .notEmpty()
    .withMessage('Faculty is required'),
  body('specialization')
    .trim()
    .notEmpty()
    .withMessage('Specialization is required'),
  body('studentId')
    .trim()
    .notEmpty()
    .withMessage('Student ID is required'),
  body('year')
    .trim()
    .notEmpty()
    .withMessage('Year is required')
];

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Password update validation
const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
];

// Register user
router.post('/register', registerValidation, register);

// Login user
router.post('/login', loginValidation, login);

// Logout user
router.get('/logout', logout);

// Get current user
router.get('/me', protect, getMe);

// Update user details
router.put('/updatedetails', protect, updateDetails);

// Update password
router.put('/updatepassword', protect, updatePasswordValidation, updatePassword);

// Forgot password
router.post('/forgotpassword', forgotPassword);

// Reset password
router.put('/resetpassword/:resettoken', resetPassword);

// Refresh token
router.post('/refresh-token', refreshToken);

// Admin routes
router.post(
  '/register-admin',
  protect,
  authorize('admin'),
  registerAdmin
);

router.post('/check-email', checkEmail);

// Check if student ID exists
router.post('/check-student-id', checkStudentId);

module.exports = router;