// utils/errorResponse.js
/**
 * Custom error response class
 * Extends the built-in Error class to include a status code
 */
class ErrorResponse extends Error {
    /**
     * Constructor for ErrorResponse
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     */
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  
  module.exports = ErrorResponse;