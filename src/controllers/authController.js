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
    const { email, password } = req.body;

    // Email және құпия сөзді тексеру
    if (!email || !password) {
      return next(new ErrorResponse('Email және құпия сөз енгізіңіз', 400));
    }

    // Пайдаланушыны тексеру
    const user = await User.findOne({ 
      where: { email },
      attributes: { exclude: ['password'] } // Жауапта құпия сөзді қайтармау
    });

    if (!user) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }

    // Құпия сөзді тексеру
    const fullUser = await User.findOne({ where: { email } });
    const isMatch = await fullUser.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }

    // Пайдаланушы ақпаратын қайтару
    res.status(200).json({
      success: true,
      data: user
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
 * @desc    Әкімші тіркеу (тек бас әкімшілер үшін)
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
    // Тек әкімші басқа әкімшілерді жасай алады
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Әкімші тіркелгілерін жасауға рұқсатыңыз жоқ', 403));
    }

    const { name, email, password, role } = req.body;

    // Рөлдің әкімші немесе кітапханашы екенін тексеру
    if (role !== 'admin' && role !== 'librarian') {
      return next(new ErrorResponse('Жарамсыз рөл', 400));
    }

    // Әкімші пайдаланушысын жасау
    const user = await User.create({
      name,
      email,
      password,
      role,
      // Әкімші үшін міндетті өрістер
      faculty: 'Әкімшілік',
      specialization: 'Кітапхана басқару',
      studentId: 'ADMIN-' + Math.floor(1000 + Math.random() * 9000),
      year: 'N/A'
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
 * Жаңа құпия сөз дерекқорға сақталмас бұрын хэшталады, бұл
 * қауіпсіздікті қамтамасыз етеді.
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    // Ағымдағы құпия сөзді тексеру
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Құпия сөз дұрыс емес', 401));
    }

    // Құпия сөзді жаңарту
    user.password = req.body.newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Құпия сөз сәтті жаңартылды'
    });
  } catch (err) {
    next(err);
  }
};