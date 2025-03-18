const express = require('express');
const router = express.Router();

// Импорт всех API маршрутов
const authRoutes = require('./auth');
const bookRoutes = require('./books');
const borrowRoutes = require('./borrow');
const categoryRoutes = require('./categories');
const userRoutes = require('./users');
const notificationRoutes = require('./notifications');

// Назначение маршрутов
router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/borrow', borrowRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);

// Проверка работоспособности API
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'library-api'
  });
});

module.exports = router;