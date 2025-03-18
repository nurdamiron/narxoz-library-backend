const express = require('express');
const router = express.Router();
const borrowController = require('../../controllers/borrowController');
const { protect, authorize } = require('../../middleware/auth');
const { validateBorrow, validateReturn, validateExtend } = require('../../middleware/validators/borrowValidator');

// @route   POST /api/borrow/books/:id
// @desc    Выдача книги пользователю
// @access  Private
router.post('/books/:id', protect, validateBorrow, borrowController.borrowBook);

// @route   POST /api/borrow/:id/return
// @desc    Возврат книги
// @access  Private
router.post('/:id/return', protect, validateReturn, borrowController.returnBook);

// @route   POST /api/borrow/:id/extend
// @desc    Продление срока выдачи
// @access  Private
router.post('/:id/extend', protect, validateExtend, borrowController.extendBorrow);

// @route   GET /api/borrow/my
// @desc    Получение активных выдач пользователя
// @access  Private
router.get('/my', protect, borrowController.getUserBorrows);

// @route   GET /api/borrow/history
// @desc    Получение истории выдач пользователя
// @access  Private
router.get('/history', protect, borrowController.getUserBorrowHistory);

// @route   GET /api/borrow
// @desc    Получение всех выдач (для администратора/библиотекаря)
// @access  Private (только admin, librarian)
router.get(
  '/',
  protect,
  authorize('admin', 'librarian'),
  borrowController.getAllBorrows
);

// @route   GET /api/borrow/overdue
// @desc    Получение просроченных выдач
// @access  Private (только admin, librarian)
router.get(
  '/overdue',
  protect,
  authorize('admin', 'librarian'),
  borrowController.getOverdueBooks
);

// Экспорт маршрутов
module.exports = router;