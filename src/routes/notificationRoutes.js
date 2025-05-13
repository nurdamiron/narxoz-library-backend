/**
 * Хабарландыру маршруттары
 * 
 * @description Бұл файл пайдаланушы хабарландыруларын басқару үшін API маршруттарын анықтайды.
 * Хабарландыруларды алу, жасау, оқылды деп белгілеу және жою маршруттарын қамтиды.
 */
const express = require('express');
const {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  deleteNotification,
  markAllAsRead,
} = require('../controllers/notificationController');

// Маршрутизатор инициализациясы
const router = express.Router();

// Аутентификация және авторизация миддлвэрлері
const { protect, authorize } = require('../middleware/auth');

/**
 * Барлық маршруттарды қорғау
 * 
 * @description Төмендегі барлық маршруттар аутентификацияны талап етеді
 */
router.use(protect);

/**
 * Барлық хабарландыруларды оқылды деп белгілеу
 * 
 * @description Пайдаланушының барлық оқылмаған хабарландыруларын оқылды деп белгілейді
 */
router.route('/read-all').put(markAllAsRead);

/**
 * Хабарландыруларды басқару
 * 
 * @description Хабарландыруларды алу және жасау
 */
router
  .route('/')
  .get(authorize('admin', 'moderator', 'librarian', 'student', 'teacher'), getNotifications)
  .post(authorize('admin', 'moderator'), createNotification);

/**
 * Жеке хабарландыруды басқару
 * 
 * @description Жеке хабарландыруды алу және жою
 */
router
  .route('/:id')
  .get(getNotification)
  .delete(deleteNotification);

/**
 * Хабарландыруды оқылды деп белгілеу
 * 
 * @description Жеке хабарландыруды оқылды деп белгілейді
 */
router.route('/:id/read').put(markAsRead);

module.exports = router;