const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const { protect, authorize } = require('../../middleware/auth');

// Middleware для проверки прав администратора или библиотекаря
const adminMiddleware = [
  protect,
  authorize('admin', 'librarian')
];

// @route   GET /api/admin/dashboard
// @desc    Получение статистики для дашборда
// @access  Private (только admin, librarian)
router.get('/dashboard', adminMiddleware, adminController.getDashboardStats);

// @route   GET /api/admin/books/popular
// @desc    Получение популярных книг
// @access  Private (только admin, librarian)
router.get('/books/popular', adminMiddleware, adminController.getPopularBooks);

// @route   GET /api/admin/borrow/stats/monthly
// @desc    Получение статистики выдач по месяцам
// @access  Private (только admin, librarian)
router.get('/borrow/stats/monthly', adminMiddleware, adminController.getBorrowStatsByMonth);

// @route   GET /api/admin/categories/stats
// @desc    Получение статистики по категориям
// @access  Private (только admin, librarian)
router.get('/categories/stats', adminMiddleware, adminController.getCategoryStats);

// @route   GET /api/admin/users/stats
// @desc    Получение статистики по пользователям
// @access  Private (только admin, librarian)
router.get('/users/stats', adminMiddleware, adminController.getUserStats);

// @route   GET /api/admin/borrow/timeline
// @desc    Получение статистики выдач по времени
// @access  Private (только admin, librarian)
router.get('/borrow/timeline', adminMiddleware, adminController.getBorrowTimeline);

// @route   GET /api/admin/users/:id/activity
// @desc    Получение активности пользователя
// @access  Private (только admin, librarian)
router.get('/users/:id/activity', adminMiddleware, adminController.getUserActivity);

// @route   GET /api/admin/reports/overdue
// @desc    Получение отчета о просроченных выдачах
// @access  Private (только admin, librarian)
router.get('/reports/overdue', adminMiddleware, adminController.getOverdueReport);

// @route   GET /api/admin/reports/inventory
// @desc    Получение отчета о состоянии библиотечного фонда
// @access  Private (только admin, librarian)
router.get('/reports/inventory', adminMiddleware, adminController.getLibraryInventoryReport);

// @route   GET /api/admin/reports/borrow
// @desc    Экспорт отчета о выдачах за период
// @access  Private (только admin, librarian)
router.get('/reports/borrow', adminMiddleware, adminController.exportBorrowReport);

// Экспорт маршрутов
module.exports = router;