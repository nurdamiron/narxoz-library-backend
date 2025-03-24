/**
 * Бетбелгі контроллері
 * 
 * @description Бұл файл пайдаланушылардың кітаптарға жасаған бетбелгілерін 
 * басқару функцияларын қамтиды
 */
const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const Bookmark = db.Bookmark;
const Book = db.Book;
const Category = db.Category;

/**
 * @desc    Қолданушының барлық бетбелгілерін алу
 * @route   GET /api/bookmarks
 * @access  Private
 */
exports.getBookmarks = async (req, res, next) => {
  try {
    // Қолданушының барлық бетбелгілерін іздеу
    const bookmarks = await Bookmark.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      order: [['addedAt', 'DESC']], // Жаңасынан ескісіне қарай сұрыптау
    });

    // Сәтті жауап қайтару
    res.status(200).json({
      success: true,
      count: bookmarks.length,
      data: bookmarks,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жаңа бетбелгі қосу
 * @route   POST /api/bookmarks
 * @access  Private
 */
exports.addBookmark = async (req, res, next) => {
  try {
    const { bookId } = req.body;

    // Кітаптың бар-жоғын тексеру
    const book = await Book.findByPk(bookId);
    if (!book) {
      return next(new ErrorResponse(`${bookId} идентификаторы бар кітап табылмады`, 404));
    }

    // Бетбелгінің бұрыннан бар-жоғын тексеру
    const existingBookmark = await Bookmark.findOne({
      where: {
        userId: req.user.id,
        bookId,
      },
    });

    if (existingBookmark) {
      return next(new ErrorResponse('Сіз бұл кітапты әлдеқашан бетбелгіге қосқансыз', 400));
    }

    // Жаңа бетбелгі құру
    const bookmark = await Bookmark.create({
      userId: req.user.id,
      bookId,
    });

    // Кітап мәліметтерімен бірге бетбелгіні қайтару
    const bookmarkWithBook = await Bookmark.findByPk(bookmark.id, {
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: bookmarkWithBook,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Бетбелгіні жою
 * @route   DELETE /api/bookmarks/:id
 * @access  Private
 */
exports.deleteBookmark = async (req, res, next) => {
  try {
    // Бетбелгіні ID бойынша іздеу
    const bookmark = await Bookmark.findByPk(req.params.id);

    if (!bookmark) {
      return next(
        new ErrorResponse(`${req.params.id} идентификаторы бар бетбелгі табылмады`, 404)
      );
    }

    // Қолданушы бетбелгі иесі немесе әкімші екенін тексеру
    if (bookmark.userId !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Бұл бетбелгіні жоюға рұқсатыңыз жоқ', 401));
    }

    // Бетбелгіні жою
    await bookmark.destroy();

    // Сәтті жауап қайтару
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Бетбелгіні ауыстыру (жоқ болса қосу, бар болса жою)
 * @route   POST /api/bookmarks/toggle/:bookId
 * @access  Private
 */
exports.toggleBookmark = async (req, res, next) => {
  try {
    const bookId = req.params.bookId;

    // Кітаптың бар-жоғын тексеру
    const book = await Book.findByPk(bookId);
    if (!book) {
      return next(new ErrorResponse(`${bookId} идентификаторы бар кітап табылмады`, 404));
    }

    // Бетбелгінің бұрыннан бар-жоғын тексеру
    const existingBookmark = await Bookmark.findOne({
      where: {
        userId: req.user.id,
        bookId,
      },
    });

    let result;
    let status;

    if (existingBookmark) {
      // Бетбелгі бар болса, оны жою
      await existingBookmark.destroy();
      result = { bookmarked: false };
      status = 200;
    } else {
      // Бетбелгі жоқ болса, оны қосу
      const bookmark = await Bookmark.create({
        userId: req.user.id,
        bookId,
      });

      // Кітап мәліметтерімен бірге бетбелгіні алу
      const bookmarkWithBook = await Bookmark.findByPk(bookmark.id, {
        include: [
          {
            model: Book,
            as: 'book',
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
      });

      result = { bookmarked: true, bookmark: bookmarkWithBook };
      status = 201;
    }

    // Сәтті жауап қайтару
    res.status(status).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Кітаптың қолданушы үшін бетбелгіде бар-жоғын тексеру
 * @route   GET /api/bookmarks/check/:bookId
 * @access  Private
 */
exports.checkBookmark = async (req, res, next) => {
  try {
    // Кітаптың бетбелгіде бар-жоғын тексеру
    const bookmark = await Bookmark.findOne({
      where: {
        userId: req.user.id,
        bookId: req.params.bookId,
      },
    });

    // Жауап қайтару
    res.status(200).json({
      success: true,
      data: {
        isBookmarked: !!bookmark, // Boolean түріне айналдыру
        bookmark: bookmark || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Барлық бетбелгілерді алу (тек әкімші үшін)
 * @route   GET /api/bookmarks/all
 * @access  Private/Admin
 */
exports.getAllBookmarks = async (req, res, next) => {
  try {
    // Беттеу параметрлері
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const offset = (page - 1) * limit;

    // Сұраныс опциялары
    const queryOptions = {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author'],
        },
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'studentId'],
        },
      ],
      order: [['addedAt', 'DESC']],
      limit,
      offset,
    };

    // Егер сүзгілер берілген болса, оларды қосу
    if (req.query.userId) {
      queryOptions.where = {
        ...queryOptions.where,
        userId: req.query.userId,
      };
    }

    if (req.query.bookId) {
      queryOptions.where = {
        ...queryOptions.where,
        bookId: req.query.bookId,
      };
    }

    // Беттеумен бетбелгілерді іздеу
    const { count, rows: bookmarks } = await Bookmark.findAndCountAll(queryOptions);

    // Беттеу нәтижесі
    const pagination = {};

    if (offset + bookmarks.length < count) {
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

    // Сәтті жауап қайтару
    res.status(200).json({
      success: true,
      count: bookmarks.length,
      pagination,
      totalPages: Math.ceil(count / limit),
      total: count,
      data: bookmarks,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Кітап ID бойынша бетбелгіні жою (қолданушы үшін)
 * @route   DELETE /api/bookmarks/book/:bookId
 * @access  Private
 */
exports.deleteBookmarkByBookId = async (req, res, next) => {
  try {
    // Кітап ID бойынша бетбелгіні іздеу
    const bookmark = await Bookmark.findOne({
      where: {
        userId: req.user.id,
        bookId: req.params.bookId,
      },
    });

    if (!bookmark) {
      return next(
        new ErrorResponse(`${req.params.bookId} кітап ID-сі үшін бетбелгі табылмады`, 404)
      );
    }

    // Бетбелгіні жою
    await bookmark.destroy();

    // Сәтті жауап қайтару
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Ең көп бетбелгіге қосылған кітаптарды алу (тек әкімші үшін)
 * @route   GET /api/bookmarks/trending
 * @access  Private/Admin
 */
exports.getTrendingBooks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;

    // Ең көп бетбелгіге қосылған кітаптарды алу
    const result = await Bookmark.findAll({
      attributes: [
        'bookId',
        [db.sequelize.fn('COUNT', db.sequelize.col('bookId')), 'bookmarkCount'],
      ],
      group: ['bookId'],
      order: [[db.sequelize.literal('bookmarkCount'), 'DESC']],
      limit,
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    // Сәтті жауап қайтару
    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};