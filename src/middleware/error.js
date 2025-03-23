// middleware/error.js
const ErrorResponse = require('../utils/errorResponse');

/**
 * Қателерді өңдеу миддлвэрі
 * Әртүрлі қате түрлерін API жауаптары үшін стандартталған пішінге түрлендіреді
 * 
 * @description Бұл функция әртүрлі қате түрлерін ұстап алып, оларды клиентке 
 * жіберу үшін бірыңғай форматқа келтіреді. Әр түрлі қате типтері үшін тиісті 
 * HTTP статус кодтары мен хабарламаларды қайтарады.
 */
const errorHandler = (err, req, res, next) => {
  // Қатенің көшірмесін жасау
  let error = { ...err };
  error.message = err.message;

  // Әзірлеуші үшін қатені консольге шығару
  console.error(err);

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
    error = new ErrorResponse('Жарамсыз токен', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new ErrorResponse('Токеннің мерзімі аяқталды', 401);
  }

  // Multer файл өлшемі қатесі
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ErrorResponse('Файл өлшемі шектен асып кетті', 400);
  }

  // Қате статусы мен хабарламасымен жауап қайтару
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Сервер қатесі',
  });
};

module.exports = errorHandler;