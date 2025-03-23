const crypto = require('crypto');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const User = db.User;

/**
 * @desc    Пайдаланушыны тіркеу
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    // Валидация қателерін тексеру
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, password, phone, faculty, specialization, studentId, year } = req.body;

    // Пайдаланушыны жасау
    const user = await User.create({
      name,
      email,
      password,
      phone,
      faculty,
      specialization,
      studentId,
      year,
      role: 'user'
    });

    // Токен жасау
    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Пайдаланушы кіру
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Email және құпия сөзді тексеру
    if (!email || !password) {
      return next(new ErrorResponse('Email және құпия сөз енгізіңіз', 400));
    }

    // Пайдаланушыны тексеру
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }

    // Құпия сөздің сәйкестігін тексеру
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Жарамсыз тіркелгі деректері', 401));
    }

    // Токен жасау
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Әкімшіні тіркеу (тек супер әкімшілер әкімшілерді жасай алады)
 * @route   POST /api/auth/register-admin
 * @access  Private/Admin
 */
exports.registerAdmin = async (req, res, next) => {
  try {
    // Тек әкімші басқа әкімшілерді немесе кітапханашыларды жасай алады
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Әкімші тіркелгілерін жасауға рұқсатыңыз жоқ', 403));
    }

    const { name, email, password, role } = req.body;

    // Рөлдің әкімші немесе кітапханашы екенін тексеру
    if (role !== 'admin' && role !== 'librarian') {
      return next(new ErrorResponse('Жарамсыз рөл тағайындау', 400));
    }

    // Әкімші пайдаланушысын жасау
    const user = await User.create({
      name,
      email,
      password,
      role,
      // Егер әкімші болса, бұлар қажет болмауы мүмкін, бірақ олар міндетті өрістер
      faculty: 'Administration',
      specialization: 'Library Management',
      studentId: 'ADMIN-' + Math.floor(1000 + Math.random() * 9000),
      year: 'N/A'
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Пайдаланушы шығу / cookie тазалау
 * @route   GET /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Ағымдағы кірген пайдаланушыны алу
 * @route   GET /api/auth/me
 * @access  Private
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

    // Жаңартылған мәліметтермен пайдаланушыны қайта алу
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
 * @desc    Құпия сөзді жаңарту
 * @route   PUT /api/auth/updatepassword
 * @access  Private
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

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Құпия сөзді ұмыту
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });

    if (!user) {
      return next(new ErrorResponse('Бұндай email бар пайдаланушы жоқ', 404));
    }

    // Қалпына келтіру токенін алу
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Токенді хэштеу және resetPasswordToken өрісіне орнату
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Мерзімді 10 минутқа орнату
    const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);

    // Пайдаланушыны қалпына келтіру токенімен және мерзімімен жаңарту
    await user.update({
      resetPasswordToken,
      resetPasswordExpire
    });

    // Қалпына келтіру URL мекенжайын жасау
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // TODO: Қалпына келтіру токенімен электрондық хат жіберу
    // Тестілеу мақсатында қалпына келтіру URL мекенжайын қайтару
    res.status(200).json({
      success: true,
      message: 'Құпия сөзді қалпына келтіру электрондық хаты жіберілді',
      resetUrl, // Өндірісте мұны жауапқа қоспаңыз
      resetToken // Өндірісте мұны жауапқа қоспаңыз
    });
  } catch (err) {
    console.error(err);
    
    // Дерекқордағы токен өрістерін қалпына келтіру
    await User.update(
      {
        resetPasswordToken: null,
        resetPasswordExpire: null
      },
      {
        where: { email: req.body.email }
      }
    );

    return next(new ErrorResponse('Электрондық хат жіберілмеді', 500));
  }
};

/**
 * @desc    Құпия сөзді қалпына келтіру
 * @route   PUT /api/auth/resetpassword/:resettoken
 * @access  Public
 */
exports.resetPassword = async (req, res, next) => {
  try {
    // Хэштелген токенді алу
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      where: {
        resetPasswordToken,
        resetPasswordExpire: { [db.Sequelize.Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return next(new ErrorResponse('Жарамсыз токен', 400));
    }

    // Жаңа құпия сөзді орнату
    user.password = req.body.password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Токенді жаңарту
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new ErrorResponse('Жаңарту токенін ұсыныңыз', 400));
    }

    // Жаңарту токенін тексеру
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Пайдаланушыны алу
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return next(new ErrorResponse('Жарамсыз токен', 401));
    }

    // Жаңа кіру токенін жасау
    sendTokenResponse(user, 200, res);
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new ErrorResponse('Жарамсыз немесе мерзімі өткен токен', 401));
    }
    next(err);
  }
};


/**
 * @desc    Проверить, существует ли email
 * @route   POST /api/auth/check-email
 * @access  Public
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
 * @desc    Проверить, существует ли студенческий ID
 * @route   POST /api/auth/check-student-id
 * @access  Public
 */
exports.checkStudentId = async (req, res, next) => {
  try {
    const { studentId } = req.body;

    const existingUser = await User.findOne({ where: { studentId } });

    res.status(200).json({
      success: true,
      exists: !!existingUser
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Токен жауабын жіберу көмекші функциясы
 * 
 * @description Бұл функция JWT токенін жасайды, оны cookie-ге орнатады және
 * пайдаланушы мәліметтерімен бірге жауап қайтарады
 * 
 * @param {Object} user - Пайдаланушы нысаны
 * @param {Number} statusCode - HTTP статус коды
 * @param {Object} res - Жауап нысаны
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Токен жасау
  const token = user.getSignedJwtToken();

  // Жаңарту токенін жасау
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    { expiresIn: '7d' }
  );

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 күн
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // Жауапта құпия сөзді жібермеу
  const userResponse = { ...user.get() };
  delete userResponse.password;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      refreshToken,
      data: userResponse
    });
};