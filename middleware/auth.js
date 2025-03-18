const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Middleware для проверки JWT токена
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Проверка наличия токена в заголовке Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Извлекаем токен из заголовка
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Если токен не найден, возвращаем ошибку
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Необходима авторизация'
      });
    }
    
    try {
      // Верификация токена
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Добавление информации о пользователе в объект запроса
      req.user = {
        id: decoded.id,
        role: decoded.role
      };
      
      next();
    } catch (error) {
      logger.error('Ошибка при верификации токена:', error);
      return res.status(401).json({
        success: false,
        message: 'Недействительный токен'
      });
    }
  } catch (error) {
    logger.error('Ошибка при аутентификации:', error);
    next(error);
  }
};

// Middleware для проверки роли пользователя
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Необходима авторизация'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для выполнения этой операции'
      });
    }
    
    next();
  };
};

// Middleware для обновления информации о пользователе из базы данных
exports.updateUserInfo = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next();
    }
    
    // Получение обновленной информации о пользователе из базы данных
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'faculty', 'student_id']
    });
    
    if (user) {
      // Обновление информации о пользователе в объекте запроса
      req.user = {
        ...req.user,
        ...user.toJSON()
      };
    }
    
    next();
  } catch (error) {
    logger.error('Ошибка при обновлении информации о пользователе:', error);
    next();
  }
};

module.exports = exports;