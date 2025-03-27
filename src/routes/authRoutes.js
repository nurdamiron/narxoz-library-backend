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
  registerAdmin,
  checkEmail
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Маршрутизатор инициализациясы
const router = express.Router();

/**
 * Кіру валидациясы
 * 
 * @description Жүйеге кіру кезінде деректерді тексеру ережелері.
 * Email дұрыс форматта болуы және бос болмауы керек.
 * Құпия сөз бос болмауы керек. Бұл ережелер пайдаланушыларға
 * кіру барысында дұрыс қате хабарламаларын көрсетуге мүмкіндік береді.
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Дұрыс email енгізіңіз')
    .normalizeEmail(),
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

// Пайдаланушы кіру
router.post('/login', loginValidation, login);

// Ағымдағы пайдаланушыны алу
router.get('/me', protect, getMe);

// Пайдаланушы мәліметтерін жаңарту
router.put('/updatedetails', protect, updateDetails);

// Құпия сөзді жаңарту
router.put('/updatepassword', protect, updatePasswordValidation, updatePassword);

// Әкімші маршруттары
router.post(
  '/register-admin',
  protect,
  authorize('admin'),
  registerAdmin
);

// Email бар-жоғын тексеру
router.post('/check-email', checkEmail);

module.exports = router;