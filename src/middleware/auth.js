// middleware/auth.js
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const { User } = require('../models');

/**
 * Жеңілдетілген аутентификация - логин және құпия сөз арқылы тексеру
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
      where: { email: credentials.username },
      attributes: ['id', 'name', 'password', 'role', 'createdAt', 'updatedAt'] // role өрісін қосу
    });
    
    // Пайдаланушының бар-жоғын тексеру
    if (!user) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }
    
    // Құпия сөзді тікелей салыстыру
    const isMatch = credentials.password === user.password;
    
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
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Әкімші email-і арқылы рөлді тексеру
    if (req.user.email === 'admin@narxoz.kz') {
      req.user.role = 'admin';
    }
    
    // Пайдаланушы рөлінің рұқсат етілген рөлдерде бар-жоғын тексеру
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `${req.user.role || 'undefined'} рөлі бар пайдаланушыға бұл мазмұнға қол жеткізуге рұқсат жоқ`,
          403
        )
      );
    }
    next();
  };
};