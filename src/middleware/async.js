// middleware/async.js
/**
 * Async handler middleware
 * Wraps an async controller function to catch errors and pass them to the error middleware
 * 
 * @param {Function} fn - The async controller function to wrap
 * @returns {Function} - Express middleware function
 */
const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
  
  module.exports = asyncHandler;