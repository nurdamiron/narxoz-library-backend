// routes/notificationRoutes.js
const express = require('express');
const {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  deleteNotification,
  markAllAsRead,
} = require('../controllers/notificationController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(protect);

router.route('/read-all').put(markAllAsRead);

router
  .route('/')
  .get(getNotifications)
  .post(authorize('admin'), createNotification);

router
  .route('/:id')
  .get(getNotification)
  .delete(deleteNotification);

router.route('/:id/read').put(markAsRead);

module.exports = router;