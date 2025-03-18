const logger = require('../utils/logger');
const { ValidationError, UniqueConstraintError, DatabaseError } = require('sequelize');

// Глобальный обработчик ошибок
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Логирование ошибки
  logger.error(`${err.name || 'Error'}: ${err.message || 'Server Error'}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user ? req.user.id : null
  });

  // Обработка ошибок Sequelize
  if (err instanceof ValidationError) {
    // Ошибка валидации Sequelize
    const messages = {};
    err.errors.forEach(error => {
      messages[error.path] = error.message;
    });

    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors: messages
    });
  }

  if (err instanceof UniqueConstraintError) {
    // Ошибка уникальности данных Sequelize
    const messages = {};
    err.errors.forEach(error => {
      messages[error.path] = error.message;
    });

    return res.status(400).json({
      success: false,
      message: 'Данные должны быть уникальными',
      errors: messages
    });
  }

  if (err instanceof DatabaseError) {
    // Общая ошибка базы данных
    return res.status(500).json({
      success: false,
      message: 'Ошибка базы данных',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Произошла внутренняя ошибка сервера'
    });
  }

  // Обработка ошибок JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Недействительный токен'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Срок действия токена истек'
    });
  }

  // Обработка ошибок валидации запроса
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message || 'Ошибка валидации'
    });
  }

  // Обработка ошибок отсутствия файла
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      message: 'Файл не найден'
    });
  }

  // Обработка ошибок мультера (загрузка файлов)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Файл слишком большой'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Неожиданный файл'
    });
  }

  // Настройка HTTP статуса
  const statusCode = error.statusCode || 500;

  // Отправка ответа с ошибкой
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};

module.exports = errorHandler;