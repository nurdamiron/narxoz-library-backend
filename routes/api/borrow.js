const express = require('express');
const router = express.Router();
const borrowController = require('../../controllers/borrowController');
const { protect, authorize } = require('../../middleware/auth');

// Все маршруты требуют аутентификации
router.use(protect);

// Получение активных выдач пользователя
router.get('/my', borrowController.getUserBorrows);

// Получение истории выдач пользователя
router.get('/history', borrowController.getUserBorrowHistory);

// Выдача книги пользователю
router.post('/books/:id', borrowController.borrowBook);

// Возврат книги
router.post('/:id/return', borrowController.returnBook);

// Продление срока выдачи
router.post('/:id/extend', borrowController.extendBorrow);

// Маршруты ниже доступны только для администраторов и библиотекарей
const adminMiddleware = [protect, authorize('admin', 'librarian')];

// Получение всех выдач
router.get('/', adminMiddleware, borrowController.getAllBorrows);

// Получение просроченных выдач
router.get('/overdue', adminMiddleware, borrowController.getOverdueBooks);

// Получение статистики по выдачам
router.get('/stats', adminMiddleware, borrowController.getBorrowStatistics);

module.exports = router;