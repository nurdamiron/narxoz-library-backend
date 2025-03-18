const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { protect, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/fileUpload');

// Защищенные маршруты (требуют аутентификации)
// Получение профиля текущего пользователя
router.get('/profile', protect, userController.getCurrentUser);

// Обновление профиля пользователя
router.put(
  '/profile',
  protect,
  upload.single('avatar'),
  userController.updateProfile
);

// Изменение пароля пользователя
router.put('/password', protect, userController.changePassword);

// Маршруты ниже доступны только для администраторов
const adminMiddleware = [protect, authorize('admin')];

// Получение списка всех пользователей
router.get('/', adminMiddleware, userController.getAllUsers);

// Получение пользователя по ID
router.get('/:id', adminMiddleware, userController.getUserById);

// Создание нового пользователя
router.post(
  '/',
  adminMiddleware,
  upload.single('avatar'),
  userController.createUser
);

// Обновление пользователя по ID
router.put(
  '/:id',
  adminMiddleware,
  upload.single('avatar'),
  userController.updateUser
);

// Удаление пользователя
router.delete('/:id', adminMiddleware, userController.deleteUser);

module.exports = router;