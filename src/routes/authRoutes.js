/**
 * Аутентификация маршруттары
 * 
 * @description Бұл файл пайдаланушы аутентификациясы және авторизациясы үшін API маршруттарын анықтайды.
 * Тіркелу, кіру, құпия сөзді өзгерту және профильді басқару маршруттарын қамтиды.
 */
const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  registerAdmin,
  refreshToken,
  checkEmail,
  checkStudentId
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Маршрутизатор инициализациясы
const router = express.Router();

/**
 * Тіркелу валидация ережелері
 * 
 * @description Пайдаланушы тіркелгенде енгізілген деректерді тексеру ережелері
 */
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Аты 2-50 таңба аралығында болуы керек'),
  body('email')
    .isEmail()
    .withMessage('Жарамды email енгізіңіз')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Құпия сөз кем дегенде 6 таңбадан тұруы керек'),
  body('faculty')
    .trim()
    .notEmpty()
    .withMessage('Факультет міндетті өріс'),
  body('specialization')
    .trim()
    .notEmpty()
    .withMessage('Мамандық міндетті өріс'),
  body('studentId')
    .trim()
    .notEmpty()
    .withMessage('Студент ID міндетті өріс'),
  body('year')
    .trim()
    .notEmpty()
    .withMessage('Оқу жылы міндетті өріс')
];

/**
 * Кіру валидация ережелері
 * 
 * @description Жүйеге кіру кезінде енгізілген деректерді тексеру ережелері
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Жарамды email енгізіңіз')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Құпия сөз міндетті өріс')
];

/**
 * Құпия сөзді өзгерту валидация ережелері
 * 
 * @description Пайдаланушы құпия сөзін өзгерту кезінде тексеру ережелері
 */
const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Ағымдағы құпия сөз міндетті'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Жаңа құпия сөз кем дегенде 6 таңбадан тұруы керек')
];

// Пайдаланушы тіркеу
router.post('/register', registerValidation, register);

// Пайдаланушы кіру
router.post('/login', loginValidation, login);

// Пайдаланушы шығу
router.get('/logout', logout);

// Ағымдағы пайдаланушыны алу
router.get('/me', protect, getMe);

// Пайдаланушы мәліметтерін жаңарту
router.put('/updatedetails', protect, updateDetails);

// Құпия сөзді жаңарту
router.put('/updatepassword', protect, updatePasswordValidation, updatePassword);

// Құпия сөзді ұмыту
router.post('/forgotpassword', forgotPassword);

// Құпия сөзді қалпына келтіру
router.put('/resetpassword/:resettoken', resetPassword);

// Токенді жаңарту
router.post('/refresh-token', refreshToken);

// Әкімші маршруттары
router.post(
  '/register-admin',
  protect,
  authorize('admin'),
  registerAdmin
);

// Email бар-жоғын тексеру
router.post('/check-email', checkEmail);

// Студент ID бар-жоғын тексеру
router.post('/check-student-id', checkStudentId);

module.exports = router;