const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Генерация JWT токена
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

// Регистрация нового пользователя
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, faculty, student_id, specialization, phone } = req.body;

    // Проверка, существует ли пользователь с таким email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует'
      });
    }

    // Создание нового пользователя
    const user = await User.create({
      name,
      email,
      password,
      faculty,
      student_id,
      specialization,
      phone,
      role: 'student' // По умолчанию роль - студент
    });

    // Создание токена
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        faculty: user.faculty,
        role: user.role
      },
      token
    });
  } catch (error) {
    logger.error('Ошибка при регистрации пользователя:', error);
    next(error);
  }
};

// Вход в систему
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Проверка наличия email и пароля
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Пожалуйста, укажите email и пароль'
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

    // Создание токена
    const token = generateToken(user);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        faculty: user.faculty
      },
      token
    });
  } catch (error) {
    logger.error('Ошибка при входе пользователя:', error);
    next(error);
  }
};

// Обновление токена
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

// Получение информации о текущем пользователе
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
    logger.error('Ошибка при получении профиля пользователя:', error);
    next(error);
  }
};

// Выход из системы (только для логирования, так как JWT хранится на клиенте)
exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Выход успешно выполнен'
  });
};