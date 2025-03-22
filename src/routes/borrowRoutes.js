const express = require('express');
const { body } = require('express-validator');
const {
  borrowBook,
  returnBook,
  getUserBorrows,
  getAllBorrows,
  getBorrow,
  updateBorrow,
  checkOverdueBorrows,
  sendDueReminders,
  getBorrowStats,
  extendBorrow
} = require('../controllers/borrowController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// User borrow routes
router
  .route('/')
  .get(getUserBorrows)
  .post(
    [body('bookId').isInt().withMessage('Please provide a valid book ID')],
    borrowBook
  );

router.get('/:id', getBorrow);
router.put('/:id/return', returnBook);
router.put('/:id/extend', extendBorrow);

// Admin only routes
router.get('/all', authorize('admin', 'librarian'), getAllBorrows);
router.put('/:id', authorize('admin', 'librarian'), updateBorrow);
router.get('/check-overdue', authorize('admin', 'librarian'), checkOverdueBorrows);
router.get('/send-reminders', authorize('admin', 'librarian'), sendDueReminders);
router.get('/stats', authorize('admin', 'librarian'), getBorrowStats);

module.exports = router;