// controllers/notificationController.js
const { Notification, User } = require('../models');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all notifications for a user
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
});

/**
 * @desc    Get single notification
 * @route   GET /api/notifications/:id
 * @access  Private
 */
exports.getNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findByPk(req.params.id);

  if (!notification) {
    return next(
      new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the notification
  if (notification.userId !== req.user.id) {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to access this notification`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Create new notification
 * @route   POST /api/notifications
 * @access  Private/Admin
 */
exports.createNotification = asyncHandler(async (req, res, next) => {
  // Set user ID to the notification if not provided
  if (!req.body.userId) {
    req.body.userId = req.params.userId;
  }

  const notification = await Notification.create(req.body);

  res.status(201).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = asyncHandler(async (req, res, next) => {
  let notification = await Notification.findByPk(req.params.id);

  if (!notification) {
    return next(
      new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the notification
  if (notification.userId !== req.user.id) {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to update this notification`, 401)
    );
  }

  notification = await notification.update({ read: true });

  res.status(200).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findByPk(req.params.id);

  if (!notification) {
    return next(
      new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the notification or is admin
  if (notification.userId !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to delete this notification`, 401)
    );
  }

  await notification.destroy();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Mark all notifications as read for a user
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.update(
    { read: true },
    { where: { userId: req.user.id, read: false } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
});