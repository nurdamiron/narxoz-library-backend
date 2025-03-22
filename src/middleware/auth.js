// middleware/auth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const { User } = require('../models');

/**
 * Protect routes - authentication middleware
 * Verifies JWT token and adds user to request object
 */
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from Authorization header (format: "Bearer token")
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extract token from Bearer token
    token = req.headers.authorization.split(' ')[1];
  } 
  // Alternative: get token from cookie
  // else if (req.cookies.token) {
  //   token = req.cookies.token;
  // }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user to request object
    req.user = await User.findByPk(decoded.id);

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

/**
 * Grant access to specific roles
 * @param {...String} roles - Roles allowed to access the route
 * @returns {Function} - Middleware function
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user role is in the authorized roles
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};