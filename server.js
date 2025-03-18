const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const winston = require('winston');
const path = require('path');
require('dotenv').config();

// Импорт настроек и маршрутов
const { sequelize } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Инициализация приложения
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ограничение запросов
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // ограничение до 100 запросов с одного IP
});

app.use('/api/', limiter);

// Инициализация Passport
app.use(passport.initialize());
require('./config/passport')(passport);

// Маршруты API
app.use('/api', routes);

// Обработка ошибок
app.use(errorHandler);

// Запуск сервера
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    logger.info('Подключение к базе данных установлено успешно');
    logger.info(`Сервер запущен на порту ${PORT}`);
  } catch (error) {
    logger.error('Ошибка подключения к базе данных:', error);
  }
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  logger.error('Необработанное исключение:', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('Необработанное отклонение Promise:', error);
});

// Корректное завершение при сигналах остановки
process.on('SIGTERM', () => {
  logger.info('SIGTERM получен. Завершение работы...');
  server.close(() => {
    logger.info('Сервер остановлен');
  });
});

module.exports = server; // Для тестирования