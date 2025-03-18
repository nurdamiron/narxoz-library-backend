const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Генерация JWT токена
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

/**
 * Регистрация нового пользователя
 * @route POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, faculty, student_id, specialization } = req.body;

    // Проверка обязательных полей
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Имя, email и пароль обязательны'
      });
    }

    // Проверка, существует ли пользователь с таким email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует'
      });
    }

    // Создание пользователя
    const user = await User.create({
      name,
      email,
      password,
      faculty,
      student_id,
      specialization,
      role: 'student' // По умолчанию - студент
    });

    // Генерация токена
    const token = generateToken(user);

    // Отправка ответа с данными пользователя (без пароля)
    const { password: _, ...userData } = user.toJSON();

    res.status(201).json({
      success: true,
      token,
      data: userData
    });
  } catch (error) {
    logger.error('Ошибка при регистрации пользователя:', error);
    next(error);
  }
};

/**
 * Вход в систему
 * @route POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Проверка обязательных полей
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email и пароль обязательны'
      });
    }

    // Поиск пользователя по email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }

    // Проверка пароля
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }

    // Генерация токена
    const token = generateToken(user);

    // Отправка ответа с данными пользователя (без пароля)
    const { password: _, ...userData } = user.toJSON();

    res.json({
      success: true,
      token,
      data: userData
    });
  } catch (error) {
    logger.error('Ошибка при входе пользователя:', error);
    next(error);
  }
};

/**
 * Получение информации о текущем пользователе
 * @route GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Ошибка при получении данных пользователя:', error);
    next(error);
  }
};

/**
 * Выход из системы
 * @route POST /api/auth/logout
 * @note JWT хранится клиентом, поэтому сервер не может "удалить" токен
 */
exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Выход выполнен успешно'
  });
};

/**
 * Обновление токена
 * @route POST /api/auth/refresh-token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    // Пользователь уже аутентифицирован через middleware
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Генерация нового токена
    const token = generateToken(user);

    res.json({
      success: true,
      token
    });
  } catch (error) {
    logger.error('Ошибка при обновлении токена:', error);
    next(error);
  }
};

module.exports = exports;