const { body, validationResult } = require('express-validator');

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

// Валидация при регистрации
exports.validateRegister = [
  body('name')
    .notEmpty().withMessage('Имя обязательно')
    .isLength({ min: 2, max: 100 }).withMessage('Имя должно содержать от 2 до 100 символов'),
  
  body('email')
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный формат email')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email не должен превышать 100 символов'),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов'),
  
  body('faculty')
    .optional()
    .isLength({ max: 100 }).withMessage('Название факультета не должно превышать 100 символов'),
  
  body('specialization')
    .optional()
    .isLength({ max: 100 }).withMessage('Название специализации не должно превышать 100 символов'),
  
  body('student_id')
    .optional()
    .isLength({ max: 20 }).withMessage('ID студента не должен превышать 20 символов'),
  
  body('phone')
    .optional()
    .isLength({ max: 20 }).withMessage('Номер телефона не должен превышать 20 символов'),
  
  body('year')
    .optional()
    .isLength({ max: 20 }).withMessage('Год не должен превышать 20 символов'),
  
  validateResults
];

// Валидация при входе
exports.validateLogin = [
  body('email')
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный формат email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен'),
  
  validateResults
];

// Валидация при смене пароля
exports.validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Текущий пароль обязателен'),
  
  body('newPassword')
    .notEmpty().withMessage('Новый пароль обязателен')
    .isLength({ min: 6 }).withMessage('Новый пароль должен содержать минимум 6 символов')
    .not().equals(body('currentPassword')).withMessage('Новый пароль должен отличаться от текущего'),
  
  validateResults
];

// Валидация при сбросе пароля (запрос)
exports.validateForgotPassword = [
  body('email')
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный формат email')
    .normalizeEmail(),
  
  validateResults
];

// Валидация при сбросе пароля (установка нового)
exports.validateResetPassword = [
  body('token')
    .notEmpty().withMessage('Токен сброса пароля обязателен'),
  
  body('password')
    .notEmpty().withMessage('Новый пароль обязателен')
    .isLength({ min: 6 }).withMessage('Новый пароль должен содержать минимум 6 символов'),
  
  validateResults
];

module.exports = exports;