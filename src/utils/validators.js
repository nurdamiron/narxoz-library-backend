// utils/validators.js
const { body, param, query, validationResult } = require('express-validator');

/**
 * Валидация нәтижелерін өңдеу миддлвэрі
 * 
 * @description Валидация қателерін тексеріп, оларды қайтарады
 * @param {Object} req - Сұраныс объектісі
 * @param {Object} res - Жауап объектісі
 * @param {Function} next - Келесі миддлвэрге өту функциясы
 * @returns {Object|void} - Қате болған жағдайда қате жауабы, әйтпесе келесі миддлвэрге өтеді
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Кітап валидация ережелері
 * 
 * @description Кітапты жасау/жаңарту кезінде қолданылатын валидация ережелері
 * @returns {Array} - Валидация ережелері массиві
 */
const bookValidationRules = () => {
  return [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Кітап атауы міндетті')
      .isLength({ max: 255 })
      .withMessage('Кітап атауы 255 таңбадан аспауы керек'),
    body('author')
      .trim()
      .notEmpty()
      .withMessage('Автор аты міндетті')
      .isLength({ max: 255 })
      .withMessage('Автор аты 255 таңбадан аспауы керек'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Категория міндетті'),
    body('publicationYear')
      .optional()
      .isInt({ min: 1000, max: new Date().getFullYear() })
      .withMessage('Жарияланған жыл жарамды болуы керек'),
    body('available')
      .optional()
      .isBoolean()
      .withMessage('Қолжетімділік жай-күйі логикалық мән болуы керек'),
    body('description')
      .optional()
      .trim(),
  ];
};

/**
 * Пайдаланушы валидация ережелері
 * 
 * @description Пайдаланушыны жасау кезінде қолданылатын валидация ережелері
 * @returns {Array} - Валидация ережелері массиві
 */
const userValidationRules = () => {
  return [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Аты міндетті')
      .isLength({ max: 255 })
      .withMessage('Аты 255 таңбадан аспауы керек'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email міндетті')
      .isEmail()
      .withMessage('Жарамды email енгізіңіз')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Құпия сөз міндетті')
      .isLength({ min: 6 })
      .withMessage('Құпия сөз кем дегенде 6 таңбадан тұруы керек'),
    body('role')
      .optional()
      .isIn(['user', 'admin', 'moderator', 'student', 'teacher'])
      .withMessage('Рөл user, admin, moderator, student немесе teacher болуы керек'),
    body('phone')
      .optional()
      .trim(),
    body('faculty')
      .optional()
      .trim(),
    body('specialization')
      .optional()
      .trim(),
    body('studentId')
      .optional()
      .trim(),
    body('year')
      .optional()
      .trim(),
  ];
};

/**
 * Кіру валидация ережелері
 * 
 * @description Жүйеге кіру кезінде қолданылатын валидация ережелері
 * @returns {Array} - Валидация ережелері массиві
 */
const loginValidationRules = () => {
  return [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email міндетті')
      .isEmail()
      .withMessage('Жарамды email енгізіңіз'),
    body('password')
      .notEmpty()
      .withMessage('Құпия сөз міндетті'),
  ];
};

/**
 * Пайдаланушыны жаңарту валидация ережелері
 * 
 * @description Пайдаланушы мәліметтерін жаңарту кезінде қолданылатын валидация ережелері
 * @returns {Array} - Валидация ережелері массиві
 */
const updateUserValidationRules = () => {
  return [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Аты 255 таңбадан аспауы керек'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Жарамды email енгізіңіз')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim(),
    body('faculty')
      .optional()
      .trim(),
    body('specialization')
      .optional()
      .trim(),
    body('studentId')
      .optional()
      .trim(),
    body('year')
      .optional()
      .trim(),
  ];
};

/**
 * Құпия сөзді өзгерту валидация ережелері
 * 
 * @description Құпия сөзді өзгерту кезінде қолданылатын валидация ережелері
 * @returns {Array} - Валидация ережелері массиві
 */
const changePasswordValidationRules = () => {
  return [
    body('currentPassword')
      .notEmpty()
      .withMessage('Ағымдағы құпия сөз міндетті'),
    body('newPassword')
      .notEmpty()
      .withMessage('Жаңа құпия сөз міндетті')
      .isLength({ min: 6 })
      .withMessage('Құпия сөз кем дегенде 6 таңбадан тұруы керек'),
  ];
};

/**
 * Қарызға алу валидация ережелері
 * 
 * @description Кітап қарызға алу кезінде қолданылатын валидация ережелері
 * @returns {Array} - Валидация ережелері массиві
 */
const borrowValidationRules = () => {
  return [
    body('bookId')
      .notEmpty()
      .withMessage('Кітап ID міндетті')
      .isInt()
      .withMessage('Кітап ID бүтін сан болуы керек'),
    body('userId')
      .optional()
      .isInt()
      .withMessage('Пайдаланушы ID бүтін сан болуы керек'),
  ];
};

/**
 * ID параметрі валидация ережесі
 * 
 * @description URL параметріндегі ID валидациясы үшін қолданылатын ереже
 * @returns {Array} - Валидация ережесі массиві
 */
const idParamValidationRule = () => {
  return [
    param('id')
      .isInt()
      .withMessage('ID бүтін сан болуы керек'),
  ];
};

module.exports = {
  validate,
  bookValidationRules,
  userValidationRules,
  loginValidationRules,
  updateUserValidationRules,
  changePasswordValidationRules,
  borrowValidationRules,
  idParamValidationRule,
};