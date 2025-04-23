// controllers/authController.js
const { validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const User = db.User;

/**
 * @desc    Пайдаланушы кіру
 * @route   POST /api/auth/login
 * @access  Public
 * @description Бұл функция пайдаланушының жүйеге кіруін өңдейді. 
 * Пайдаланушы email және құпия сөзді жібереді, жүйе оларды деректер
 * қорындағы мәліметтермен салыстырады. Аутентификация сәтті болған 
 * жағдайда, пайдаланушы туралы ақпаратты қайтарады. JWT токені 
 * пайдаланылмайды, әр сұраныс логин/құпия сөзді тікелей тексереді.
 */
exports.login = async (req, res, next) => {
  try {
    // Валидация нәтижелерін тексеру
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          param: err.param,
          message: err.msg
        }))
      });
    }

    const { email, password } = req.body;

    // Email және құпия сөзді тексеру
    if (!email || !password) {
      return next(new ErrorResponse('Email және құпия сөз енгізіңіз', 400));
    }

    // Пайдаланушыны тексеру
    const user = await User.findOne({ 
      where: { email }
    });

    if (!user) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }

    // Құпия сөзді тікелей салыстыру
    const isMatch = password === user.password;

    if (!isMatch) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }

    // Пайдаланушы ақпаратын қайтару (құпия сөзсіз)
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;

    res.status(200).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (err) {
    next(err);
  }
};


/**
 * @desc    Ағымдағы аутентификацияланған пайдаланушыны алу
 * @route   GET /api/auth/me
 * @access  Private
 * @description Бұл функция аутентификациядан өткен пайдаланушының
 * толық ақпаратын қайтарады. Бұл сұраныс "protect" миддлвэрімен
 * қорғалған, яғни аутентификация қажет. Пайдаланушы мәліметтері 
 * қайтарылған кезде, құпия сөз жойылады.
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return next(new ErrorResponse('Пайдаланушы табылмады', 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Пайдаланушы мәліметтерін жаңарту
 * @route   PUT /api/auth/updatedetails
 * @access  Private
 * @description Бұл функция аутентификацияланған пайдаланушының
 * жеке мәліметтерін жаңартады. Жаңартуға болатын өрістер: аты,
 * email, телефон, факультет, мамандық және курс/жыл. Құпия сөзді
 * бұл функция арқылы жаңарту мүмкін емес, бұл үшін арнайы
 * updatePassword функциясы пайдаланылады.
 */
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      faculty: req.body.faculty,
      specialization: req.body.specialization,
      year: req.body.year
    };

    // Анықталмаған өрістерді сүзу
    Object.keys(fieldsToUpdate).forEach(
      key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return next(new ErrorResponse('Пайдаланушы табылмады', 404));
    }

    // Пайдаланушыны жаңарту
    await user.update(fieldsToUpdate);

    // Жаңартылған пайдаланушы мәліметтерін алу
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Әкімші немесе кітапханашы тіркеу (тек бас әкімшілер үшін)
 * @route   POST /api/auth/register-admin
 * @access  Private/Admin
 * @description Бұл функция жаңа әкімші немесе кітапханашы пайдаланушысын
 * жасауға мүмкіндік береді. Тек "admin" рөлі бар пайдаланушылар ғана
 * осы функцияны пайдалана алады. Жаңа пайдаланушы үшін аты, email,
 * құпия сөзі және рөлі (admin немесе librarian) көрсетілуі керек.
 * Басқа өрістер автоматты түрде әдепкі мәндермен толтырылады.
 */
exports.registerAdmin = async (req, res, next) => {
  try {
    // Валидация нәтижелерін тексеру
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          param: err.param,
          message: err.msg
        }))
      });
    }

    // Тек әкімші басқа әкімшілерді жасай алады
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Әкімші тіркелгілерін жасауға рұқсатыңыз жоқ', 403));
    }

    const { name, email, password, role } = req.body;

    // Міндетті өрістерді тексеру
    if (!name || !email || !password || !role) {
      return next(new ErrorResponse('Барлық міндетті өрістерді толтырыңыз', 400));
    }

    // Email форматын тексеру
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new ErrorResponse('Жарамды email енгізіңіз', 400));
    }

    // Email бұрыннан бар-жоғын тексеру
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return next(new ErrorResponse('Бұл email пайдаланушы тіркелгісі бұрыннан бар', 400));
    }

    // Рөлдің әкімші немесе кітапханашы екенін тексеру
    if (role !== 'admin' && role !== 'librarian') {
      return next(new ErrorResponse('Жарамсыз рөл. Тек "admin" немесе "librarian" рөлі болуы керек', 400));
    }

    // Құпия сөз ұзындығын тексеру
    if (password.length < 6) {
      return next(new ErrorResponse('Құпия сөз кем дегенде 6 таңбадан тұруы керек', 400));
    }

    // Әкімші пайдаланушысын жасау
    const user = await User.create({
      name,
      email,
      password,
      role,
      // Әкімші үшін әдепкі өрістер
      faculty: req.body.faculty || 'Әкімшілік',
      specialization: req.body.specialization || 'Кітапхана басқару',
      studentId: req.body.studentId || `ADMIN-${Math.floor(1000 + Math.random() * 9000)}`,
      year: req.body.year || 'N/A'
    });

    // Жауапта құпия сөзді жою
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Email бар-жоғын тексеру
 * @route   POST /api/auth/check-email
 * @access  Public
 * @description Бұл функция берілген email мекенжайының деректер
 * қорында бар-жоғын тексереді. Қауіпсіздік мақсатында, функция
 * тек email бар-жоғын көрсетеді, пайдаланушы туралы қосымша
 * ақпаратты қайтармайды. Бұл функция жүйеге кіру немесе тіркелу
 * формаларында email өрісін тексеру үшін пайдаланылады.
 */
exports.checkEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorResponse('Email енгізіңіз', 400));
    }

    const existingUser = await User.findOne({ where: { email } });

    res.status(200).json({
      success: true,
      exists: !!existingUser
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Құпия сөзді өзгерту
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 * @description Бұл функция аутентификацияланған пайдаланушының
 * құпия сөзін өзгертуге мүмкіндік береді. Пайдаланушы ағымдағы
 * құпия сөзін және жаңа құпия сөзін енгізуі керек. Ағымдағы
 * құпия сөз дұрыс болған жағдайда ғана жаңа құпия сөз орнатылады.
 */
exports.updatePassword = async (req, res, next) => {
  try {
    // Валидация нәтижелерін тексеру
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          param: err.param,
          message: err.msg
        }))
      });
    }
    
    const { currentPassword, newPassword } = req.body;

    // Міндетті өрістерді тексеру
    if (!currentPassword || !newPassword) {
      return next(new ErrorResponse('Ағымдағы және жаңа құпия сөзді енгізіңіз', 400));
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return next(new ErrorResponse('Пайдаланушы табылмады', 404));
    }

    // Ағымдағы құпия сөзді тікелей салыстыру
    const isMatch = currentPassword === user.password;
    if (!isMatch) {
      return next(new ErrorResponse('Ағымдағы құпия сөз дұрыс емес', 401));
    }

    // Жаңа құпия сөз ұзындығын тексеру
    if (newPassword.length < 6) {
      return next(new ErrorResponse('Жаңа құпия сөз кем дегенде 6 таңбадан тұруы керек', 400));
    }

    // Құпия сөзді тікелей жаңарту (хэшсіз)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Құпия сөз сәтті жаңартылды'
    });
  } catch (err) {
    next(err);
  }
};