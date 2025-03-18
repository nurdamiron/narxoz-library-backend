const express = require('express');
const router = express.Router();

// Импорт файлов маршрутов
const authRoutes = require('./api/auth');
const bookRoutes = require('./api/books');
const userRoutes = require('./api/users');
const borrowRoutes = require('./api/borrow');
const categoryRoutes = require('./api/categories');
const searchRoutes = require('./api/search');
const adminRoutes = require('./api/admin');

// Маршруты аутентификации
router.use('/auth', authRoutes);

// Маршруты для работы с книгами
router.use('/books', bookRoutes);

// Маршруты для работы с пользователями
router.use('/users', userRoutes);

// Маршруты для выдачи/возврата книг
router.use('/borrow', borrowRoutes);

// Маршруты для работы с категориями
router.use('/categories', categoryRoutes);

// Маршруты для поиска
router.use('/search', searchRoutes);

// Маршруты для административной панели
router.use('/admin', adminRoutes);

// Проверка работоспособности API
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Обработка несуществующих маршрутов
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint не найден'
  });
});

module.exports = router;