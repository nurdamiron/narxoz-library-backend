// routes/reviewRoutes.js
const express = require('express');
const { check } = require('express-validator');
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Базовые маршруты для отзывов
router
  .route('/')
  .get(protect, authorize('admin', 'moderator'), reviewController.getReviews)
  .post(
    protect,
    [
      check('bookId', 'Кітап идентификаторын көрсетіңіз').notEmpty(),
      check('rating', 'Рейтинг 1 мен 5 аралығында болуы керек').isInt({ min: 1, max: 5 }),
      check('text', 'Пікір мәтіні 10-500 таңба аралығында болуы керек').isLength({ min: 10, max: 500 })
    ],
    reviewController.createReview
  );

// Маршруты для конкретного отзыва
router
  .route('/:id')
  .get(protect, reviewController.getReview)
  .put(
    protect,
    authorize('admin', 'moderator'),
    [
      check('rating', 'Рейтинг 1 мен 5 аралығында болуы керек').optional().isInt({ min: 1, max: 5 }),
      check('text', 'Пікір мәтіні 10-500 таңба аралығында болуы керек').optional().isLength({ min: 10, max: 500 })
    ],
    reviewController.updateReview
  )
  .delete(protect, reviewController.deleteReview);

// Маршрут для бекіту/қабылдамау
router.put(
  '/:id/approve',
  protect,
  authorize('admin', 'moderator'),
  reviewController.approveReview
);

// Маршрут для шағым білдіру
router.post(
  '/:id/report',
  protect,
  [
    check('reason', 'Шағым себебін көрсетіңіз').isLength({ min: 5, max: 200 })
  ],
  reviewController.reportReview
);

module.exports = router;