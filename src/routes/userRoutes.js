/**
 * Пайдаланушы маршруттары
 * 
 * @description Бұл файл пайдаланушыларды басқару үшін API маршруттарын анықтайды.
 * Жүйе пайдаланушыларын басқару, пайдаланушы профилін жаңарту және 
 * статистика алу маршруттарын қамтиды.
 */
const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  uploadAvatar,
  getMyStats,
  changePassword,
} = require('../controllers/userController');

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
 * Пайдаланушы профилі маршруттары
 * 
 * @description Өз профилін басқаруға арналған маршруттар
 */
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/avatar', uploadAvatar);
router.get('/me/stats', getMyStats);
router.put('/me/password', changePassword);

/**
 * Әкімшілер және модераторларға арналған маршруттар
 * 
 * @description Жүйе пайдаланушыларын басқаруға арналған маршруттар
 */

/**
 * Пайдаланушыларды басқару
 * 
 * @description Барлық пайдаланушыларды алу және жаңа пайдаланушы жасау
 */
router.route('/')
  .get(authorize('admin', 'moderator'), getUsers)
  .post(authorize('admin', 'moderator'), createUser);

/**
 * Жеке пайдаланушыны басқару
 * 
 * @description Жеке пайдаланушыны ID бойынша алу, жаңарту және жою
 * Жою операциясы тек әкімшілер үшін қолжетімді
 */
router.route('/:id')
  .get(authorize('admin', 'moderator'), getUser)
  .put(authorize('admin', 'moderator'), updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;