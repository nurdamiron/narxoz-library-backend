/**
 * Аутентификация маршруттары
 * 
 * @description Бұл файл пайдаланушы аутентификациясы және авторизациясы үшін API маршруттарын анықтайды.
 * Кіру, шығу, құпия сөзді өзгерту және пайдаланушы профилін басқару маршруттарын қамтиды.
 * Жүйеде JWT токендері пайдаланылмайды, оның орнына тікелей логин/құпия сөз тексеру әдісі қолданылады.
 * Әр сұраныс үшін пайдаланушы HTTP базалық аутентификациясы арқылы немесе сұраныс денесінде 
 * логин мен құпия сөз ұсыну арқылы аутентификациядан өтеді.
 */
const express = require('express');
const { body } = require('express-validator');
const {
  login,
  getMe,
  updateDetails,
  updatePassword,
  registerUser,
  checkEmail
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Маршрутизатор инициализациясы
const router = express.Router();

/**
 * Кіру валидациясы
 * 
 * @description Жүйеге кіру кезінде деректерді тексеру ережелері.
 * Email бос болмауы керек.
 * Құпия сөз бос болмауы керек. Бұл ережелер пайдаланушыларға
 * кіру барысында дұрыс қате хабарламаларын көрсетуге мүмкіндік береді.
 */
const loginValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email міндетті'),
  body('password')
    .notEmpty()
    .withMessage('Құпия сөз міндетті')
];

/**
 * Құпия сөзді өзгерту валидациясы
 * 
 * @description Пайдаланушы құпия сөзін өзгерту кезінде тексеру ережелері.
 * Ағымдағы құпия сөз міндетті түрде берілуі керек.
 * Жаңа құпия сөз міндетті түрде берілуі және кемінде 6 таңбадан тұруы керек.
 * Бұл ережелер құпия сөзді өзгерту барысында қауіпсіздік деңгейін қамтамасыз етеді.
 */
const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Ағымдағы құпия сөз міндетті'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Жаңа құпия сөз кемінде 6 таңбадан тұруы керек')
];

/**
 * Пайдаланушы тіркеу валидациясы
 * 
 * @description Жаңа пайдаланушы тіркеу кезіндегі деректерді тексеру ережелері.
 * Логин, құпия сөз, аты, тегі, email және рөл өрістері міндетті.
 * Email дұрыс форматта болуы керек.
 * Құпия сөз кемінде 6 таңбадан тұруы керек.
 * Рөл тек admin немесе student болуы керек.
 */
const registerUserValidation = [
  body('username')
    .notEmpty()
    .withMessage('Логин міндетті')
    .isLength({ min: 3, max: 50 })
    .withMessage('Логин 3-50 таңба аралығында болуы керек'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Құпия сөз кем дегенде 6 таңбадан тұруы керек'),
  body('firstName')
    .notEmpty()
    .withMessage('Аты міндетті')
    .isLength({ min: 2, max: 50 })
    .withMessage('Аты 2-50 таңба аралығында болуы керек'),
  body('lastName')
    .notEmpty()
    .withMessage('Тегі міндетті')
    .isLength({ min: 2, max: 50 })
    .withMessage('Тегі 2-50 таңба аралығында болуы керек'),
  body('email')
    .isEmail()
    .withMessage('Дұрыс email енгізіңіз')
    .normalizeEmail(),
  body('role')
    .notEmpty()
    .withMessage('Рөл міндетті')
    .isIn(['admin', 'student', 'moderator'])
    .withMessage('Рөл тек "admin", "moderator" немесе "student" болуы керек'),
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im)
    .withMessage('Жарамды телефон нөірін енгізіңіз')
];

// Пайдаланушы кіру
router.post('/login', loginValidation, login);

// Ағымдағы пайдаланушыны алу
router.get('/me', protect, getMe);

// Пайдаланушы мәліметтерін жаңарту
router.put('/updatedetails', protect, updateDetails);

// Құпия сөзді жаңарту
router.put('/updatepassword', protect, updatePasswordValidation, updatePassword);

// Пайдаланушы тіркеу (әкімшілер мен модераторлар үшін)
router.post(
  '/register',
  protect,
  authorize('admin', 'moderator'),
  registerUserValidation,
  registerUser
);

// Email бар-жоғын тексеру
router.post('/check-email', checkEmail);

module.exports = router;