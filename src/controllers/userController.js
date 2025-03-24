/**
 * Пайдаланушы контроллері
 * 
 * @description Бұл файл пайдаланушыларды басқару функцияларын қамтиды.
 * Пайдаланушыларды жасау, алу, жаңарту, жою және аватарды жүктеу функцияларын қамтиды.
 */
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { User, Bookmark, Borrow } = require('../models');

/**
 * Аватарлар үшін жүктеу конфигурациясы
 * 
 * @description Пайдаланушы аватарларын жүктеу және сақтау параметрлерін орнатады
 */
// Жүктелген файлдар үшін сақтау орнын орнату
const storage = multer.diskStorage({
  /**
   * Файлды сақтау орнын анықтау
   * 
   * @description Жүктелген файлдың қай каталогқа сақталатынын анықтайды
   */
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/avatars/';
    // Каталог жоқ болса, жасау
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  
  /**
   * Сақталатын файл атын анықтау
   * 
   * @description Жүктелген файлдың қалай аталатынын анықтайды
   */
  filename: function (req, file, cb) {
    // Уақыт белгісі мен бастапқы кеңейтіммен бірегей файл атын жасау
    cb(
      null,
      `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

/**
 * Файл фильтрі
 * 
 * @description Тек сурет файлдарын қабылдау үшін фильтр
 */
const fileFilter = (req, file, cb) => {
  // Тек суреттерді қабылдау
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Тек сурет файлдарына рұқсат етіледі!'), false);
  }
  cb(null, true);
};

/**
 * Жүктеуді инициализациялау
 * 
 * @description Multer жүктеуді орнату
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB максималды файл өлшемі
  },
  fileFilter: fileFilter,
}).single('avatar');

/**
 * @desc    Барлық пайдаланушыларды алу
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = asyncHandler(async (req, res, next) => {
  // Сұраныс параметрлері
  const query = {};
  
  // Рөл бойынша сүзу
  if (req.query.role) {
    query.role = req.query.role;
  }
  
  // Аты бойынша іздеу
  if (req.query.search) {
    query.name = { [Op.like]: `%${req.query.search}%` };
  }
  
  // Беттеу параметрлері
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const offset = (page - 1) * limit;
  
  // Пайдаланушыларды құпия сөзді шығармай іздеу
  const { count, rows: users } = await User.findAndCountAll({
    where: query,
    attributes: { exclude: ['password'] },
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });
  
  // Беттеу нәтижесі
  const pagination = {};
  
  if (offset + users.length < count) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }
  
  if (offset > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }
  
  res.status(200).json({
    success: true,
    count: users.length,
    pagination,
    totalPages: Math.ceil(count / limit),
    total: count,
    data: users,
  });
});

/**
 * @desc    Жеке пайдаланушыны алу
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUser = asyncHandler(async (req, res, next) => {
  // Пайдаланушыны ID бойынша іздеу
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
  });

  // Пайдаланушы табылмаса қате қайтару
  if (!user) {
    return next(
      new ErrorResponse(`${req.params.id} ID-мен пайдаланушы табылмады`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Пайдаланушы жасау
 * @route   POST /api/users
 * @access  Private/Admin
 */
exports.createUser = asyncHandler(async (req, res, next) => {
  // Пайдаланушы жасау
  const user = await User.create(req.body);

  // Құпия сөзді жауаптан жасыру
  const userResponse = user.toJSON();
  delete userResponse.password;

  res.status(201).json({
    success: true,
    data: userResponse,
  });
});

/**
 * @desc    Пайдаланушыны жаңарту
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
exports.updateUser = asyncHandler(async (req, res, next) => {
  // Пайдаланушыны ID бойынша іздеу
  const user = await User.findByPk(req.params.id);

  // Пайдаланушы табылмаса қате қайтару
  if (!user) {
    return next(
      new ErrorResponse(`${req.params.id} ID-мен пайдаланушы табылмады`, 404)
    );
  }

  // Осы нүкте арқылы құпия сөз жаңартуын болдырмау
  if (req.body.password) {
    delete req.body.password;
  }

  // Пайдаланушыны жаңарту
  const updatedUser = await user.update(req.body);

  // Құпия сөзді жауаптан жасыру
  const userResponse = updatedUser.toJSON();
  delete userResponse.password;

  res.status(200).json({
    success: true,
    data: userResponse,
  });
});

/**
 * @desc    Пайдаланушыны жою
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = asyncHandler(async (req, res, next) => {
  // Пайдаланушыны ID бойынша іздеу
  const user = await User.findByPk(req.params.id);

  // Пайдаланушы табылмаса қате қайтару
  if (!user) {
    return next(
      new ErrorResponse(`${req.params.id} ID-мен пайдаланушы табылмады`, 404)
    );
  }

  // Пайдаланушыны жою
  await user.destroy();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Ағымдағы кірген пайдаланушыны алу
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  // Сұраныс объектісіндегі пайдаланушы ID бойынша пайдаланушыны алу
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] },
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Пайдаланушы мәліметтерін жаңарту
 * @route   PUT /api/users/me
 * @access  Private
 */
exports.updateMe = asyncHandler(async (req, res, next) => {
  // Жаңартуға рұқсат етілген өрістерді анықтау
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    faculty: req.body.faculty,
    specialization: req.body.specialization,
    year: req.body.year,
  };

  // Анықталмаған немесе null мәндерді жою
  Object.keys(fieldsToUpdate).forEach(
    (key) =>
      (fieldsToUpdate[key] === undefined || fieldsToUpdate[key] === null) &&
      delete fieldsToUpdate[key]
  );

  // Пайдаланушыны іздеу
  const user = await User.findByPk(req.user.id);
  
  // Пайдаланушы табылмаса қате қайтару
  if (!user) {
    return next(new ErrorResponse(`Пайдаланушы табылмады`, 404));
  }

  // Пайдаланушыны жаңарту
  const updatedUser = await user.update(fieldsToUpdate);

  // Құпия сөзді жауаптан жасыру
  const userResponse = updatedUser.toJSON();
  delete userResponse.password;

  res.status(200).json({
    success: true,
    data: userResponse,
  });
});

/**
 * @desc    Аватар жүктеу
 * @route   PUT /api/users/me/avatar
 * @access  Private
 */
exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  // Multer арқылы файл жүктеу
  upload(req, res, async function (err) {
    // Файл жүктеу кезінде қате болса
    if (err) {
      return next(new ErrorResponse(`Аватар жүктеу қатесі: ${err.message}`, 400));
    }

    // Файл жүктелмесе
    if (!req.file) {
      return next(new ErrorResponse('Файл жүктеңіз', 400));
    }

    // Пайдаланушыны іздеу
    const user = await User.findByPk(req.user.id);
    
    // Пайдаланушы табылмаса қате қайтару
    if (!user) {
      return next(new ErrorResponse(`Пайдаланушы табылмады`, 404));
    }

    // Егер пайдаланушыда бұрыннан аватар болса, ескі аватарды жою
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Пайдаланушыны жаңа аватар жолымен жаңарту
    const avatarPath = req.file.path;
    const updatedUser = await user.update({ avatar: avatarPath });

    // Құпия сөзді жауаптан жасыру
    const userResponse = updatedUser.toJSON();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: userResponse,
    });
  });
});

/**
 * @desc    Пайдаланушы статистикасын алу (бетбелгілер, қарызға алу тарихы, т.б.)
 * @route   GET /api/users/me/stats
 * @access  Private
 */
exports.getMyStats = asyncHandler(async (req, res, next) => {
  // Пайдаланушының бетбелгілер санын есептеу
  const bookmarksCount = await Bookmark.count({
    where: { userId: req.user.id },
  });

  // Белсенді қарызға алулар санын есептеу (қайтарылмаған)
  const activeBorrowsCount = await Borrow.count({
    where: { userId: req.user.id, status: 'active' },
  });

  // Барлық қарызға алулар санын есептеу
  const totalBorrowsCount = await Borrow.count({
    where: { userId: req.user.id },
  });

  // Мерзімі өткен қарызға алулар санын есептеу
  const now = new Date();
  const overdueBorrowsCount = await Borrow.count({
    where: {
      userId: req.user.id,
      status: 'active',
      dueDate: { [Op.lt]: now },
    },
  });

  // Пайдаланушының жақында қарызға алған кітаптарын алу
  const recentBorrows = await Borrow.findAll({
    where: { userId: req.user.id },
    limit: 5,
    order: [['borrowDate', 'DESC']],
    include: [
      {
        model: db.Book,
        as: 'book',
        attributes: ['id', 'title', 'author', 'cover'],
        include: [
          {
            model: db.Category,
            as: 'category',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });

  // Статистиканы қайтару
  res.status(200).json({
    success: true,
    data: {
      bookmarks: bookmarksCount,
      activeborrows: activeBorrowsCount,
      totalBorrows: totalBorrowsCount,
      overdueborrows: overdueBorrowsCount,
      recentBorrows: recentBorrows,
    },
  });
});

/**
 * @desc    Құпия сөзді өзгерту
 * @route   PUT /api/users/me/password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
  // Сұраныс денесінен ағымдағы және жаңа құпия сөзді алу
  const { currentPassword, newPassword } = req.body;

  // Екеуі де берілгенін тексеру
  if (!currentPassword || !newPassword) {
    return next(
      new ErrorResponse('Ағымдағы және жаңа құпия сөзді енгізіңіз', 400)
    );
  }

  // Пайдаланушыны іздеу
  const user = await User.findByPk(req.user.id);

  // Ағымдағы құпия сөзді тексеру
  const isMatch = await user.matchPassword(currentPassword);

  // Ағымдағы құпия сөз дұрыс емес болса
  if (!isMatch) {
    return next(new ErrorResponse('Ағымдағы құпия сөз дұрыс емес', 401));
  }

  // Құпия сөзді жаңарту
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Құпия сөз сәтті жаңартылды',
  });
});