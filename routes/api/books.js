const express = require('express');
const router = express.Router();
const bookController = require('../../controllers/bookController');
const { protect, authorize } = require('../../middleware/auth');
const { 
  validateCreateBook, 
  validateUpdateBook, 
  validateGetBook, 
  validateDeleteBook,
  validateGetBooks,
  validateSearchBooks
} = require('../../middleware/validators/bookValidator');
const upload = require('../../middleware/fileUpload');

// @route   GET /api/books
// @desc    Получение всех книг с фильтрацией и пагинацией
// @access  Public
router.get('/', validateGetBooks, bookController.getAllBooks);

// @route   GET /api/books/search
// @desc    Поиск книг
// @access  Public
router.get('/search', validateSearchBooks, bookController.searchBooks);

// @route   GET /api/books/popular
// @desc    Получение популярных книг
// @access  Public
router.get('/popular', bookController.getPopularBooks);

// @route   GET /api/books/recent
// @desc    Получение недавно добавленных книг
// @access  Public
router.get('/recent', bookController.getRecentBooks);

// @route   GET /api/books/:id
// @desc    Получение книги по ID
// @access  Public
router.get('/:id', validateGetBook, bookController.getBookById);

// @route   POST /api/books
// @desc    Создание новой книги
// @access  Private (только admin, librarian)
router.post(
  '/',
  protect,
  authorize('admin', 'librarian'),
  upload.single('cover'),
  validateCreateBook,
  bookController.createBook
);

// @route   PUT /api/books/:id
// @desc    Обновление книги
// @access  Private (только admin, librarian)
router.put(
  '/:id',
  protect,
  authorize('admin', 'librarian'),
  upload.single('cover'),
  validateUpdateBook,
  bookController.updateBook
);

// @route   DELETE /api/books/:id
// @desc    Удаление книги
// @access  Private (только admin, librarian)
router.delete(
  '/:id',
  protect,
  authorize('admin', 'librarian'),
  validateDeleteBook,
  bookController.deleteBook
);

// Экспорт маршрутов
module.exports = router;