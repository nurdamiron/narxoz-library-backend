const express = require('express');
const { body } = require('express-validator');
const {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  bookCoverUpload,
  getPopularBooks,
  getNewBooks,
  updateInventory,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Book validation rules
const bookValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  body('author')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Author name must be between 2 and 100 characters'),
  body('categoryId')
    .isInt()
    .withMessage('Please add a valid category ID'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Please add a description'),
  body('publicationYear')
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage('Please add a valid publication year'),
  body('language')
    .isIn(['Русский', 'Английский', 'Казахский'])
    .withMessage('Please select a valid language'),
  body('totalCopies')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total copies must be at least 1'),
  body('isbn')
    .optional()
    .matches(/^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/)
    .withMessage('Please provide a valid ISBN')
];

// Category validation
const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be longer than 500 characters')
];

// Routes for categories
router
  .route('/categories')
  .get(getCategories)
  .post(protect, authorize('admin', 'librarian'), categoryValidation, createCategory);

router
  .route('/categories/:id')
  .put(protect, authorize('admin', 'librarian'), categoryValidation, updateCategory)
  .delete(protect, authorize('admin', 'librarian'), deleteCategory);

// Routes for popular and new books
router.get('/popular', getPopularBooks);
router.get('/new', getNewBooks);

// Book CRUD routes
router
  .route('/')
  .get(getBooks)
  .post(protect, authorize('admin', 'librarian'), bookValidation, createBook);

router
  .route('/:id')
  .get(getBook)
  .put(protect, authorize('admin', 'librarian'), updateBook)
  .delete(protect, authorize('admin', 'librarian'), deleteBook);

// Upload book cover
router.put(
  '/:id/cover',
  protect,
  authorize('admin', 'librarian'),
  bookCoverUpload
);

// Update book inventory
router.put(
  '/:id/inventory',
  protect,
  authorize('admin', 'librarian'),
  updateInventory
);

module.exports = router;