const { param, query, validationResult } = require('express-validator');

// Вспомогательная функция для проверки результатов валидации
const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Валидация при выдаче книги
exports.validateBorrow = [
  param('id')
    .isInt().withMessage('ID книги должен быть числом'),
  
  validateResults
];

// Валидация при возврате книги
exports.validateReturn = [
  param('id')
    .isInt().withMessage('ID выдачи должен быть числом'),
  
  validateResults
];

// Валидация при продлении срока выдачи
exports.validateExtend = [
  param('id')
    .isInt().withMessage('ID выдачи должен быть числом'),
  
  validateResults
];

// Валидация параметров запроса при получении выдач пользователя
exports.validateGetUserBorrows = [
  query('status')
    .optional()
    .isIn(['active', 'returned', 'overdue']).withMessage('Недопустимый статус'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть числом от 1 до 100'),
  
  validateResults
];

// Валидация параметров запроса при получении всех выдач (для администратора)
exports.validateGetAllBorrows = [
  query('status')
    .optional()
    .isIn(['active', 'returned', 'overdue']).withMessage('Недопустимый статус'),
  
  query('user_id')
    .optional()
    .isInt().withMessage('ID пользователя должен быть числом'),
  
  query('book_id')
    .optional()
    .isInt().withMessage('ID книги должен быть числом'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть числом от 1 до 100'),
  
  validateResults
];

// Валидация при получении просроченных выдач
exports.validateGetOverdueBooks = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть числом от 1 до 100'),
  
  validateResults
];

// Валидация при фильтрации выдач по дате
exports.validateFilterByDate = [
  query('start_date')
    .optional()
    .isISO8601().withMessage('Некорректный формат даты начала (ISO 8601)'),
  
  query('end_date')
    .optional()
    .isISO8601().withMessage('Некорректный формат даты окончания (ISO 8601)')
    .custom((value, { req }) => {
      if (req.query.start_date && new Date(value) < new Date(req.query.start_date)) {
        throw new Error('Дата окончания должна быть позже даты начала');
      }
      return true;
    }),
  
  validateResults
];

module.exports = exports;