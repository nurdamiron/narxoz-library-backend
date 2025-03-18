const { body, param, query, validationResult } = require('express-validator');

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

// Валидация при создании книги
exports.validateCreateBook = [
  body('title')
    .notEmpty().withMessage('Название книги обязательно')
    .isLength({ max: 255 }).withMessage('Название книги не должно превышать 255 символов'),
  
  body('author')
    .notEmpty().withMessage('Автор книги обязателен')
    .isLength({ max: 255 }).withMessage('Имя автора не должно превышать 255 символов'),
  
  body('description')
    .optional()
    .isString().withMessage('Описание должно быть строкой'),
  
  body('category_id')
    .optional()
    .isInt().withMessage('Категория должна быть числом'),
  
  body('language_id')
    .optional()
    .isInt().withMessage('Язык должен быть числом'),
  
  body('publication_year')
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage(`Год публикации должен быть между 1000 и ${new Date().getFullYear()}`),
  
  body('total_copies')
    .optional()
    .isInt({ min: 1 }).withMessage('Количество экземпляров должно быть положительным числом'),
  
  body('isbn')
    .optional()
    .isLength({ max: 20 }).withMessage('ISBN не должен превышать 20 символов'),
  
  validateResults
];

// Валидация при обновлении книги
exports.validateUpdateBook = [
  param('id')
    .isInt().withMessage('ID книги должен быть числом'),
  
  body('title')
    .optional()
    .isLength({ max: 255 }).withMessage('Название книги не должно превышать 255 символов'),
  
  body('author')
    .optional()
    .isLength({ max: 255 }).withMessage('Имя автора не должно превышать 255 символов'),
  
  body('description')
    .optional()
    .isString().withMessage('Описание должно быть строкой'),
  
  body('category_id')
    .optional()
    .isInt().withMessage('Категория должна быть числом'),
  
  body('language_id')
    .optional()
    .isInt().withMessage('Язык должен быть числом'),
  
  body('publication_year')
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage(`Год публикации должен быть между 1000 и ${new Date().getFullYear()}`),
  
  body('total_copies')
    .optional()
    .isInt({ min: 0 }).withMessage('Количество экземпляров должно быть неотрицательным числом'),
  
  body('available_copies')
    .optional()
    .isInt({ min: 0 }).withMessage('Количество доступных экземпляров должно быть неотрицательным числом')
    .custom((value, { req }) => {
      if (req.body.total_copies !== undefined && value > req.body.total_copies) {
        throw new Error('Количество доступных экземпляров не может превышать общее количество экземпляров');
      }
      return true;
    }),
  
  body('isbn')
    .optional()
    .isLength({ max: 20 }).withMessage('ISBN не должен превышать 20 символов'),
  
  validateResults
];

// Валидация при получении книги по ID
exports.validateGetBook = [
  param('id')
    .isInt().withMessage('ID книги должен быть числом'),
  
  validateResults
];

// Валидация при удалении книги
exports.validateDeleteBook = [
  param('id')
    .isInt().withMessage('ID книги должен быть числом'),
  
  validateResults
];

// Валидация параметров запроса при получении списка книг
exports.validateGetBooks = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть числом от 1 до 100'),
  
  query('category')
    .optional()
    .isInt().withMessage('ID категории должен быть числом'),
  
  query('language')
    .optional()
    .isInt().withMessage('ID языка должен быть числом'),
  
  query('year')
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage(`Год публикации должен быть между 1000 и ${new Date().getFullYear()}`),
  
  validateResults
];

// Валидация параметров запроса при поиске книг
exports.validateSearchBooks = [
  query('query')
    .notEmpty().withMessage('Поисковый запрос обязателен'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть числом от 1 до 100'),
  
  validateResults
];

module.exports = exports;