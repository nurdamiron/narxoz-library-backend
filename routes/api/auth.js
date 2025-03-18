const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { protect } = require('../../middleware/auth');
const { 
  validateRegister, 
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword 
} = require('../../middleware/validators/authValidator');

// @route   POST /api/auth/register
// @desc    Регистрация нового пользователя
// @access  Public
router.post('/register', validateRegister, authController.register);

// @route   POST /api/auth/login
// @desc    Вход пользователя
// @access  Public
router.post('/login', validateLogin, authController.login);

// @route   POST /api/auth/refresh-token
// @desc    Обновление токена
// @access  Private
router.post('/refresh-token', protect, authController.refreshToken);

// @route   GET /api/auth/me
// @desc    Получение информации о текущем пользователе
// @access  Private
router.get('/me', protect, authController.getMe);

// @route   POST /api/auth/logout
// @desc    Выход пользователя (только для логирования, JWT хранится на клиенте)
// @access  Private
router.post('/logout', protect, authController.logout);

// @route   POST /api/auth/change-password
// @desc    Изменение пароля
// @access  Private
router.post(
  '/change-password', 
  protect, 
  validateChangePassword, 
  authController.changePassword
);

// Экспорт маршрутов
module.exports = router;