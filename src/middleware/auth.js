/**
 * Аутентификация және авторизация миддлвэрлері
 * 
 * @description Бұл файл API маршруттарын қорғау үшін қолданылатын
 * миддлвэрлерді қамтиды. Ол пайдаланушыларды аутентификациялау және
 * олардың рөлдеріне сәйкес авторизациялау үшін пайдаланылады.
 */
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const { User } = require('../models');
const bcrypt = require('bcrypt');

/**
 * Аутентификация миддлвэрі
 * 
 * @description API маршруттарын қорғау үшін пайдаланылады.
 * Пайдаланушының логинін және құпия сөзін тексереді.
 * Құпия сөздер хэшсіз тікелей сақталады және салыстырылады.
 */
exports.protect = asyncHandler(async (req, res, next) => {
  // API үшін: аутторизация тақырыбынан алу
  let credentials;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Basic')) {
    // Base64 кодталған деректерді декодтау
    const base64Credentials = req.headers.authorization.split(' ')[1];
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    
    // Формат: "email:password"
    const [email, password] = decoded.split(':');
    
    console.log('Decoded credentials:', { email, passwordLength: password ? password.length : 0 });
    
    if (email && password) {
      credentials = { email, password };
    }
  } 
  // Веб-қолданба үшін: сұраныс денесінен немесе сессиядан алу
  else if (req.body.email && req.body.password) {
    credentials = {
      email: req.body.email,
      password: req.body.password
    };
  }
  // Егер аутентификация берілмесе, 401 қайтару
  else {
    return next(new ErrorResponse('Авторизация қажет', 401));
  }

  try {
    // Пайдаланушыны іздеу (email өрісі бойынша)
    const user = await User.findOne({
      where: { email: credentials.email },
      attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'password', 'role', 'isBlocked', 'createdAt', 'updatedAt']
    });
    
    // Пайдаланушының бар-жоғын тексеру
    if (!user) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }
    
    // Пайдаланушы бұғатталған ба тексеру
    if (user.isBlocked) {
      return next(new ErrorResponse('Сіздің тіркелгіңіз бұғатталған. Әкімшіге хабарласыңыз', 403));
    }
    
    // Құпия сөзді тексеру (bcrypt хешпен салыстыру)
    let isPasswordValid = false;
    
    // Егер құпия сөз хеш болса, bcrypt қолдану
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    } else {
      // Ескі тікелей салыстыру (кері үйлесімділік үшін)
      isPasswordValid = credentials.password === user.password;
    }
    
    if (!isPasswordValid) {
      console.log('Password mismatch in middleware');
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }
    
    // Соңғы кіру уақытын жаңарту
    await user.update({
      lastLogin: new Date()
    });
    
    // Пайдаланушы аутентификацияланған - сұранысқа қосу
    req.user = user.toJSON();
    delete req.user.password; // Құпия сөзді алып тастау
    
    next();
  } catch (err) {
    console.error('Аутентификация қатесі:', err);
    return next(new ErrorResponse('Авторизация қатесі', 401));
  }
});

/**
 * Авторизация миддлвэрі
 * 
 * @description Пайдаланушы рөлін тексеру арқылы маршрутқа қол жеткізуді шектейді.
 * Тек берілген рөлдері бар пайдаланушылар ғана қол жеткізе алады.
 * 
 * @param  {...String} roles - Рұқсат етілген рөлдер тізімі
 * @returns {Function} - Express миддлвэрі
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Пайдаланушы объектісінің бар-жоғын тексеру
    if (!req.user) {
      return next(new ErrorResponse('Авторизация қажет', 401));
    }
    
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

/**
 * Опциональная аутентификация миддлвэрі
 * 
 * @description Пытается аутентифицировать пользователя, но не выдает ошибку,
 * если аутентификация не удалась. Устанавливает req.user, если аутентификация
 * прошла успешно, иначе req.user остается undefined.
 */
exports.optionalAuth = asyncHandler(async (req, res, next) => {
  // API үшін: аутторизация тақырыбынан алу
  let credentials;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Basic')) {
    // Base64 кодталған деректерді декодтау
    const base64Credentials = req.headers.authorization.split(' ')[1];
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    
    // Формат: "email:password"
    const [email, password] = decoded.split(':');
    
    if (email && password) {
      credentials = { email, password };
    }
  } 
  // Веб-қолданба үшін: сұраныс денесінен немесе сессиядан алу
  else if (req.body.email && req.body.password) {
    credentials = {
      email: req.body.email,
      password: req.body.password
    };
  }

  // Если credentials не найдены, продолжаем без аутентификации
  if (!credentials) {
    return next();
  }

  try {
    // Пайдаланушыны іздеу (email өрісі бойынша)
    const user = await User.findOne({
      where: { email: credentials.email },
      attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'password', 'role', 'isBlocked', 'createdAt', 'updatedAt']
    });
    
    // Пайдаланушының бар-жоғын тексеру
    if (!user) {
      return next(); // Продолжаем без аутентификации
    }
    
    // Пайдаланушы бұғатталған ба тексеру
    if (user.isBlocked) {
      return next(); // Продолжаем без аутентификации
    }
    
    // Құпия сөзді тікелей салыстыру
    if (credentials.password !== user.password) {
      return next(); // Продолжаем без аутентификации
    }
    
    // Соңғы кіру уақытын жаңарту
    await user.update({
      lastLogin: new Date()
    });
    
    // Пайдаланушы аутентификацияланған - сұранысқа қосу
    req.user = user.toJSON();
    delete req.user.password; // Құпия сөзді алып тастау
    
    next();
  } catch (err) {
    console.error('Опциональная аутентификация қатесі:', err);
    // Продолжаем без аутентификации при ошибке
    next();
  }
});