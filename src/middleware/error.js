// middleware/error.js
const ErrorResponse = require('../utils/errorResponse');

/**
 * Қателерді өңдеу миддлвэрі
 * 
 * @description Бұл функция әртүрлі қате түрлерін ұстап алып, оларды клиентке 
 * жіберу үшін бірыңғай форматқа келтіреді. Әр түрлі қате типтері үшін тиісті 
 * HTTP статус кодтары мен хабарламаларды қайтарады.
 * 
 * @param {Error} err - Қате объектісі
 * @param {Request} req - HTTP сұраныс объектісі
 * @param {Response} res - HTTP жауап объектісі
 * @param {Function} next - Келесі миддлвэрге өту функциясы
 */
const errorHandler = (err, req, res, next) => {
  // Қатенің көшірмесін жасау
  let error = { ...err };
  error.message = err.message;

  // Әзірлеуші режимінде ғана қатені консольге шығару
  if (process.env.NODE_ENV === 'development') {
    console.error(`Қате туындады: ${err.name}`, err);
  }

  // Sequelize валидация қатесі
  if (err.name === 'SequelizeValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Sequelize бірегейлік шектеуі қатесі
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Sequelize сыртқы кілт шектеуі қатесі
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = new ErrorResponse('Сілтеме жасалған жазба табылмады', 404);
  }

  // JWT қателері
  if (err.name === 'JsonWebTokenError') {
    error = new ErrorResponse('Жарамсыз токен. Қайта кіріңіз', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new ErrorResponse('Токеннің мерзімі аяқталды. Қайта кіріңіз', 401);
  }

  // Multer файл өлшемі қатесі
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ErrorResponse('Файл өлшемі шектен асып кетті', 400);
  }

  // Деректер қоры байланысы қатесі
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    error = new ErrorResponse('Деректер қорымен байланыс орнату мүмкін болмады', 500);
  }

  // Қате статусы мен хабарламасымен жауап қайтару
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Сервер қатесі',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;