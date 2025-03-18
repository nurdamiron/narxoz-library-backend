const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/categoryController');
const { protect, authorize } = require('../../middleware/auth');

// Получение всех категорий (доступно всем)
router.get('/', categoryController.getAllCategories);

// Получение категории по ID (доступно всем)
router.get('/:id', categoryController.getCategoryById);

// Получение книг по категории (доступно всем)
router.get('/:id/books', categoryController.getBooksByCategory);

// Получение категорий с количеством книг (доступно всем)
router.get('/stats/book-count', categoryController.getCategoriesWithBookCount);

// Маршруты ниже доступны только для администраторов и библиотекарей
const adminMiddleware = [protect, authorize('admin', 'librarian')];

// Создание новой категории
router.post('/', adminMiddleware, categoryController.createCategory);

// Обновление категории
router.put('/:id', adminMiddleware, categoryController.updateCategory);

// Удаление категории
router.delete('/:id', adminMiddleware, categoryController.deleteCategory);

module.exports = router;