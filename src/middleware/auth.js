// middleware/auth.js
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const { User } = require('../models');

/**
 * Жеңілдетілген аутентификация - логин және құпия сөз арқылы тексеру
 * 
 * @description Бұл функция логин мен құпия сөзді тікелей деректер қорында тексеріп,
 * пайдаланушыны сұраныс объектісіне (req.user) қосады. JWT токені пайдаланылмайды.
 * Аутентификация екі әдіспен жүзеге асырылады:
 * 1. HTTP базалық аутентификациясы (API үшін)
 * 2. Сұраныс денесінде логин мен құпия сөз беру (веб-интерфейс үшін)
 */
exports.protect = asyncHandler(async (req, res, next) => {
  // API үшін: аутторизация тақырыбынан алу
  let credentials;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Basic')) {
    // Base64 кодталған деректерді декодтау
    const base64Credentials = req.headers.authorization.split(' ')[1];
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    
    // Формат: "username:password"
    const [username, password] = decoded.split(':');
    
    if (username && password) {
      credentials = { username, password };
    }
  } 
  // Веб-қолданба үшін: сұраныс денесінен немесе сессиядан алу
  else if (req.body.username && req.body.password) {
    credentials = {
      username: req.body.username,
      password: req.body.password
    };
  }
  // Егер аутентификация берілмесе, 401 қайтару
  else {
    return next(new ErrorResponse('Авторизация қажет', 401));
  }

  try {
    // Пайдаланушыны іздеу
    const user = await User.findOne({
      where: { email: credentials.username }
    });
    
    // Пайдаланушының бар-жоғын тексеру
    if (!user) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }
    
    // Құпия сөзді тексеру
    const isMatch = await user.matchPassword(credentials.password);
    
    if (!isMatch) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }
    
    // Пайдаланушы аутентификацияланған - сұранысқа қосу
    req.user = user;
    next();
  } catch (err) {
    return next(new ErrorResponse('Авторизация қатесі', 401));
  }
});

/**
 * Пайдаланушы рөлін тексеру
 * 
 * @param {...String} roles - Қол жеткізуге рұқсат етілген рөлдер тізімі (admin, librarian, user)
 * @returns {Function} - Миддлвэр функциясы
 * @description Бұл функция пайдаланушы рөлінің берілген рұқсат етілген рөлдер 
 * тізімінде бар-жоғын тексереді. Егер пайдаланушының рөлі рұқсат етілген рөлдер
 * тізімінде болмаса, 403 Forbidden қатесін қайтарады. Мысалы, тек әкімшілерге 
 * арналған беттерге тек "admin" рөлі бар пайдаланушылар ғана кіре алады.
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Пайдаланушы рөлінің рұқсат етілген рөлдерде бар-жоғын тексеру
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `${req.user.role} рөлі бар пайдаланушыға бұл мазмұнға қол жеткізуге рұқсат жоқ`,
          403
        )
      );
    }
    next();
  };
};