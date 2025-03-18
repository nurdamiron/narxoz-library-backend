const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notificationController');
const { protect, authorize } = require('../../middleware/auth');

// Все маршруты требуют аутентификации
router.use(protect);

// Получение уведомлений пользователя
router.get('/', notificationController.getUserNotifications);

// Отметка уведомления как прочитанного
router.put('/:id/read', notificationController.markAsRead);

// Отметка всех уведомлений как прочитанных
router.put('/read-all', notificationController.markAllAsRead);

// Удаление уведомления
router.delete('/:id', notificationController.deleteNotification);

// Маршруты ниже доступны только для администраторов
const adminMiddleware = [protect, authorize('admin')];

// Создание уведомления для пользователя (админ)
router.post('/create', adminMiddleware, notificationController.createNotification);

// Запуск создания системных уведомлений о просроченных книгах
router.post('/system/overdue', adminMiddleware, notificationController.createOverdueNotifications);

module.exports = router;