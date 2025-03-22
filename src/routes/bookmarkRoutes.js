const express = require('express');
const { body } = require('express-validator');
const {
  getBookmarks,
  addBookmark,
  deleteBookmark,
  toggleBookmark,
  checkBookmark,
  getAllBookmarks,
  deleteBookmarkByBookId,
  getTrendingBooks
} = require('../controllers/bookmarkController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// User bookmark routes
router
  .route('/')
  .get(getBookmarks)
  .post(
    [body('bookId').isInt().withMessage('Please provide a valid book ID')],
    addBookmark
  );

router.delete('/:id', deleteBookmark);
router.delete('/book/:bookId', deleteBookmarkByBookId);
router.post('/toggle/:bookId', toggleBookmark);
router.get('/check/:bookId', checkBookmark);

// Admin only routes
router.get('/all', authorize('admin', 'librarian'), getAllBookmarks);
router.get('/trending', authorize('admin', 'librarian'), getTrendingBooks);

module.exports = router;