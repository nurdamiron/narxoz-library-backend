/**
 * Хабарландыру контроллері
 * 
 * @description Бұл файл пайдаланушы хабарландыруларын басқару функцияларын қамтиды.
 * Хабарландыруларды жасау, алу, оқылды деп белгілеу және жою функцияларын қамтиды.
 */
const { Op } = require('sequelize');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const Notification = db.Notification;
const User = db.User;

/**
 * @desc    Пайдаланушы үшін барлық хабарландыруларды алу
 * @route   GET /api/notifications
 * @access  Private
 * 
 * @description Бұл функция ағымдағы аутентификацияланған пайдаланушы үшін
 * барлық хабарландыруларды іздейді және қайтарады. Хабарландырулар жасалған
 * уақыт бойынша кері ретпен сұрыпталады.
 */
exports.getNotifications = asyncHandler(async (req, res, next) => {
  // Сұраныс параметрлерін алу
  const { read, type, limit, page } = req.query;
  
  // Сұраныс шартын құру
  const where = { userId: req.user.id };
  
  // Оқылған/оқылмаған күйі бойынша сүзу
  if (read !== undefined) {
    where.read = read === 'true';
  }
  
  // Хабарландыру түрі бойынша сүзу
  if (type && ['info', 'warning', 'return', 'overdue', 'system'].includes(type)) {
    where.type = type;
  }
  
  // Беттеу параметрлері
  const pageNum = parseInt(page, 10) || 1;
  const pageSize = parseInt(limit, 10) || 10;
  const offset = (pageNum - 1) * pageSize;
  
  // Беттеумен хабарландыруларды іздеу
  const { count, rows: notifications } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset
  });
  
  // Беттеу нәтижесі
  const pagination = {};
  
  if (offset + notifications.length < count) {
    pagination.next = {
      page: pageNum + 1,
      limit: pageSize,
    };
  }
  
  if (offset > 0) {
    pagination.prev = {
      page: pageNum - 1,
      limit: pageSize,
    };
  }

  res.status(200).json({
    success: true,
    count: notifications.length,
    pagination,
    totalPages: Math.ceil(count / pageSize),
    total: count,
    data: notifications,
  });
});

/**
 * @desc    Жеке хабарландыруды алу
 * @route   GET /api/notifications/:id
 * @access  Private
 * 
 * @description Бұл функция ID бойынша жеке хабарландыруды іздейді және қайтарады.
 * Пайдаланушы тек өз хабарландыруларына қол жеткізе алады.
 */
exports.getNotification = asyncHandler(async (req, res, next) => {
  // ID бойынша хабарландыруды іздеу
  let notification = await Notification.findByPk(req.params.id);

  // Хабарландыру табылмаса қате қайтару
  if (!notification) {
    return next(
      new ErrorResponse(`${req.params.id} ID-мен хабарландыру табылмады`, 404)
    );
  }

  // Пайдаланушының хабарландыру иесі екенін тексеру
  if (notification.userId !== req.user.id) {
    return next(
      new ErrorResponse(`${req.user.id} ID бар пайдаланушының бұл хабарландыруды көруге рұқсаты жоқ`, 401)
    );
  }

  // Хабарландыруды оқылды деп белгілеу
  notification = await notification.update({ read: true });

  res.status(200).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Хабарландыруды жою
 * @route   DELETE /api/notifications/:id
 * @access  Private
 * 
 * @description Бұл функция хабарландыруды жояды. Пайдаланушы тек
 * өз хабарландыруларын немесе әкімші ретінде кез келген хабарландыруды жоя алады.
 */
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  // ID бойынша хабарландыруды іздеу
  const notification = await Notification.findByPk(req.params.id);

  // Хабарландыру табылмаса қате қайтару
  if (!notification) {
    return next(
      new ErrorResponse(`${req.params.id} ID-мен хабарландыру табылмады`, 404)
    );
  }

  // Пайдаланушының хабарландыру иесі немесе әкімші екенін тексеру
  if (notification.userId !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`${req.user.id} ID бар пайдаланушының бұл хабарландыруды жоюға рұқсаты жоқ`, 401)
    );
  }

  // Хабарландыруды жою
  await notification.destroy();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Пайдаланушының барлық хабарландыруларын оқылды деп белгілеу
 * @route   PUT /api/notifications/read-all
 * @access  Private
 * 
 * @description Бұл функция пайдаланушының барлық оқылмаған хабарландыруларын
 * оқылды деп белгілейді.
 */
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  // Барлық оқылмаған хабарландыруларды жаңарту
  await Notification.update(
    { read: true },
    { where: { userId: req.user.id, read: false } }
  );

  res.status(200).json({
    success: true,
    message: 'Барлық хабарландырулар оқылды деп белгіленді',
  });
});

/**
 * @desc    Оқылмаған хабарландырулар санын алу
 * @route   GET /api/notifications/unread-count
 * @access  Private
 * 
 * @description Бұл функция пайдаланушы үшін оқылмаған хабарландырулар
 * санын қайтарады.
 */
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  // Оқылмаған хабарландырулар санын есептеу
  const count = await Notification.count({
    where: { 
      userId: req.user.id, 
      read: false 
    }
  });

  res.status(200).json({
    success: true,
    count
  });
});

/**
 * @desc    Барлық пайдаланушыларға хабарландыру жіберу (тек әкімші үшін)
 * @route   POST /api/notifications/broadcast
 * @access  Private/Admin
 * 
 * @description Бұл функция барлық пайдаланушыларға немесе белгілі бір топқа
 * хабарландыру жіберуге мүмкіндік береді.
 */
exports.broadcastNotification = asyncHandler(async (req, res, next) => {
  const { title, message, type = 'system', role } = req.body;
  
  // Міндетті өрістерді тексеру
  if (!title || !message) {
    return next(
      new ErrorResponse('Тақырып және хабарлама міндетті түрде берілуі керек', 400)
    );
  }
  
  // Пайдаланушылар сұранысы
  const where = {};
  
  // Егер берілген болса, рөл бойынша сүзу
  if (role) {
    where.role = role;
  }
  
  // Барлық пайдаланушыларды алу
  const users = await User.findAll({
    attributes: ['id'],
    where
  });
  
  // Әр пайдаланушы үшін хабарландыру жасау
  const notifications = [];
  
  for (const user of users) {
    notifications.push({
      userId: user.id,
      title,
      message,
      type,
      relatedModel: '',
      relatedId: null
    });
  }
  
  // Жаппай хабарландырулар жасау
  await Notification.bulkCreate(notifications);
  
  res.status(201).json({
    success: true,
    count: notifications.length,
    message: `${notifications.length} пайдаланушыға хабарландыру жіберілді`
  });
});


/**
 * @desc    Жаңа хабарландыру жасау
 * @route   POST /api/notifications
 * @access  Private/Admin
 * 
 * @description Бұл функция жаңа хабарландыру жасауға мүмкіндік береді.
 * Тек әкімшілер жаңа хабарландыруларды жасай алады.
 */
exports.createNotification = asyncHandler(async (req, res, next) => {
  // Егер берілмеген болса, хабарландырудың пайдаланушы ID-ін орнату
  if (!req.body.userId) {
    req.body.userId = req.params.userId;
  }
  
  // Хабарландыру жасау
  const notification = await Notification.create(req.body);

  res.status(201).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Хабарландыруды оқылды деп белгілеу
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 * 
 * @description Бұл функция хабарландыруды оқылды деп белгілейді.
 * Пайдаланушы тек өз хабарландыруларын оқылды деп белгілей алады.
 */
exports.markAsRead = asyncHandler(async (req, res, next) => {
  // ID бойынша хабарландыруды іздеу
  let notification = await Notification.findByPk(req.params.id);

  // Хабарландыру табылмаса қате қайтару
  if (!notification) {
    return next(
      new ErrorResponse(`${req.params.id} ID-мен хабарландыру табылмады`, 404)
    );
  }
  
  // Пайдаланушының хабарландыру иесі екенін тексеру
  if (notification.userId !== req.user.id) {
    return next(
      new ErrorResponse(`${req.user.id} ID бар пайдаланушының бұл хабарландыруды жаңартуға рұқсаты жоқ`, 401)
    );
  }

  // Хабарландыруды оқылды деп белгілеу
  notification = await notification.update({ read: true });

  res.status(200).json({
    success: true,
    data: notification,
  });
});