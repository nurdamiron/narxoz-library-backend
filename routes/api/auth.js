const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { protect } = require('../../middleware/auth');

// Регистрация нового пользователя
router.post('/register', authController.register);

// Вход пользователя
router.post('/login', authController.login);

// Маршруты, требующие аутентификации
router.get('/me', protect, authController.getMe);
router.post('/refresh-token', protect, authController.refreshToken);
router.post('/logout', protect, authController.logout);

module.exports = router;