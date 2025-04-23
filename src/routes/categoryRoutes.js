// routes/categoryRoutes.js
const express = require('express');
const { check } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Базовые маршруты для категорий
router
  .route('/')
  .get(categoryController.getCategories)
  .post(
    protect,
    authorize('admin'),
    [
      check('name', 'Санат атауы 2-50 таңба аралығында болуы керек').isLength({ min: 2, max: 50 }),
      check('description', 'Сипаттама 500 таңбадан аспауы керек').optional().isLength({ max: 500 })
    ],
    categoryController.createCategory
  );

// Маршруты для статистики категорий
router.get('/stats', protect, authorize('admin'), categoryController.getCategoryStats);

// Маршруты для конкретной категории
router
  .route('/:id')
  .get(categoryController.getCategory)
  .put(
    protect,
    authorize('admin'),
    [
      check('name', 'Санат атауы 2-50 таңба аралығында болуы керек').optional().isLength({ min: 2, max: 50 }),
      check('description', 'Сипаттама 500 таңбадан аспауы керек').optional().isLength({ max: 500 })
    ],
    categoryController.updateCategory
  )
  .delete(protect, authorize('admin'), categoryController.deleteCategory);

module.exports = router;