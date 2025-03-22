// utils/validators.js
const { body, param, query, validationResult } = require('express-validator');

/**
 * Process validation results middleware
 * Checks for validation errors and returns them if present
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Book validation rules
 */
const bookValidationRules = () => {
  return [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('author')
      .trim()
      .notEmpty()
      .withMessage('Author is required')
      .isLength({ max: 255 })
      .withMessage('Author must be less than 255 characters'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required'),
    body('publicationYear')
      .optional()
      .isInt({ min: 1000, max: new Date().getFullYear() })
      .withMessage('Publication year must be a valid year'),
    body('available')
      .optional()
      .isBoolean()
      .withMessage('Available must be a boolean value'),
    body('description')
      .optional()
      .trim(),
  ];
};

/**
 * User validation rules
 */
const userValidationRules = () => {
  return [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 255 })
      .withMessage('Name must be less than 255 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please include a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('Role must be either user or admin'),
    body('phone')
      .optional()
      .trim(),
    body('faculty')
      .optional()
      .trim(),
    body('specialization')
      .optional()
      .trim(),
    body('studentId')
      .optional()
      .trim(),
    body('year')
      .optional()
      .trim(),
  ];
};

/**
 * Login validation rules
 */
const loginValidationRules = () => {
  return [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please include a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ];
};

/**
 * Update user validation rules
 */
const updateUserValidationRules = () => {
  return [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Name must be less than 255 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please include a valid email')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim(),
    body('faculty')
      .optional()
      .trim(),
    body('specialization')
      .optional()
      .trim(),
    body('studentId')
      .optional()
      .trim(),
    body('year')
      .optional()
      .trim(),
  ];
};

/**
 * Change password validation rules
 */
const changePasswordValidationRules = () => {
  return [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ];
};

/**
 * Borrow validation rules
 */
const borrowValidationRules = () => {
  return [
    body('bookId')
      .notEmpty()
      .withMessage('Book ID is required')
      .isInt()
      .withMessage('Book ID must be an integer'),
    body('userId')
      .optional()
      .isInt()
      .withMessage('User ID must be an integer'),
  ];
};

/**
 * ID parameter validation rule
 */
const idParamValidationRule = () => {
  return [
    param('id')
      .isInt()
      .withMessage('ID must be an integer'),
  ];
};

module.exports = {
  validate,
  bookValidationRules,
  userValidationRules,
  loginValidationRules,
  updateUserValidationRules,
  changePasswordValidationRules,
  borrowValidationRules,
  idParamValidationRule,
};