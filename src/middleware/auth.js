// middleware/auth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const { User } = require('../models');

/**
 * Қорғалған маршруттар - аутентификация миддлвэрі
 * 
 * @description Бұл функция HTTP сұранысындағы токенді тексеріп, пайдаланушыны анықтайды
 * және оны сұраныс объектісіне қосады. Егер токен жоқ немесе жарамсыз болса, қате қайтарады.
 */
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Авторизация тақырыбынан токенді алу (формат: "Bearer token")
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Bearer токеннен токенді алу
    token = req.headers.authorization.split(' ')[1];
  } 
  // Балама: cookie-ден токенді алу
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Токеннің бар екенін тексеру
  if (!token) {
    return next(new ErrorResponse('Бұл маршрутқа кіруге рұқсат жоқ', 401));
  }

  try {
    // Токенді тексеру
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Пайдаланушыны сұраныс объектісіне қосу
    req.user = await User.findByPk(decoded.id);
    
    // Пайдаланушы табылмаса
    if (!req.user) {
      return next(new ErrorResponse('Пайдаланушы табылмады', 401));
    }

    next();
  } catch (err) {
    return next(new ErrorResponse('Бұл маршрутқа кіруге рұқсат жоқ', 401));
  }
});

/**
 * Белгілі рөлдерге рұқсат беру
 * 
 * @param {...String} roles - Маршрутқа рұқсат етілген рөлдер
 * @returns {Function} - Миддлвэр функциясы
 * 
 * @description Бұл функция пайдаланушы рөлінің берілген рұқсат етілген рөлдер 
 * тізімінде бар-жоғын тексереді және тек рұқсат етілген рөлдерге өтуге мүмкіндік береді.
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Пайдаланушы рөлінің рұқсат етілген рөлдерде бар-жоғын тексеру
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `${req.user.role} рөлі бар пайдаланушыға бұл маршрутқа кіруге рұқсат жоқ`,
          403
        )
      );
    }
    next();
  };
};