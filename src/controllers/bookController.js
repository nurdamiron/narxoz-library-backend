// controllers/bookController.js
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const Book = db.Book;
const Category = db.Category;
const Bookmark = db.Bookmark;
const User = db.User;

/**
 * @desc    Барлық кітаптарды алу
 * @route   GET /api/books
 * @access  Public
 * 
 * @description Бұл функция барлық кітаптарды іздейді және түрлі сүзу,
 * іздеу және сұрыптау параметрлерін қолдайды. Аутентификацияланған пайдаланушылар
 * үшін кітаптардың бетбелгіде бар-жоғын көрсетеді.
 */
exports.getBooks = async (req, res, next) => {
  try {
    // Сұраныс опцияларын инициализациялау
    const queryOptions = {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
      where: {},
      order: [['publicationYear', 'DESC']],
    };

    // Іздеу функционалдығы
    if (req.query.search) {
      // Негізгі іздеу үшін LIKE немесе толық мәтінді іздеу үшін MATCH AGAINST (қолдау болса)
      queryOptions.where = {
        [Op.or]: [
          { title: { [Op.like]: `%${req.query.search}%` } },
          { author: { [Op.like]: `%${req.query.search}%` } },
          { description: { [Op.like]: `%${req.query.search}%` } },
        ],
      };
    }

    // Категория ID бойынша сүзу
    if (req.query.categoryId) {
      queryOptions.where.categoryId = req.query.categoryId;
    }

    // Категория атауы бойынша сүзу
    if (req.query.categoryName) {
      const category = await Category.findOne({
        where: { name: req.query.categoryName },
      });
      if (category) {
        queryOptions.where.categoryId = category.id;
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }
    }

    // Жариялану жылы аралығы бойынша сүзу
    if (req.query.yearRange) {
      const [startYear, endYear] = req.query.yearRange.split('-').map(Number);

      if (startYear && endYear) {
        // Аралық сұранысы
        queryOptions.where.publicationYear = {
          [Op.between]: [startYear, endYear],
        };
      } else if (startYear) {
        // Тек startYear анықталған, startYear-дан кейінгі барлық кітаптар
        queryOptions.where.publicationYear = {
          [Op.gte]: startYear,
        };
      }
    } else if (req.query.year) {
      // Нақты жыл сұранысы
      queryOptions.where.publicationYear = parseInt(req.query.year, 10);
    }

    // Тіл бойынша сүзу
    if (req.query.language) {
      const languages = req.query.language.split(',');
      queryOptions.where.language = {
        [Op.in]: languages,
      };
    }

    // Қолжетімділік бойынша сүзу
    if (req.query.available === 'true') {
      queryOptions.where.availableCopies = {
        [Op.gt]: 0,
      };
    }

    // Сұрыптау
    if (req.query.sort) {
      const sortField = req.query.sort.startsWith('-')
        ? req.query.sort.substring(1)
        : req.query.sort;
      const sortDirection = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';
      
      queryOptions.order = [[sortField, sortDirection]];
    }

    // Беттеу
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    queryOptions.limit = limit;
    queryOptions.offset = offset;

    // Беттеумен кітаптарды алу
    const { count, rows: books } = await Book.findAndCountAll(queryOptions);

    // Аутентификацияланған пайдаланушылар үшін isBookmarked өрісін қосу
    let booksWithBookmarkStatus = books;
    
    if (req.user) {
      const bookIds = books.map(book => book.id);
      const bookmarks = await Bookmark.findAll({
        where: {
          userId: req.user.id,
          bookId: {
            [Op.in]: bookIds,
          },
        },
      });

      const bookmarkedIds = bookmarks.map(bookmark => bookmark.bookId);
      
      booksWithBookmarkStatus = books.map(book => {
        const bookObj = book.toJSON();
        bookObj.isBookmarked = bookmarkedIds.includes(book.id);
        return bookObj;
      });
    }

    // Беттеу нәтижесі
    const pagination = {};

    if (offset + books.length < count) {
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
      count: booksWithBookmarkStatus.length,
      pagination,
      totalPages: Math.ceil(count / limit),
      total: count,
      data: booksWithBookmarkStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жеке кітапты алу
 * @route   GET /api/books/:id
 * @access  Public
 * 
 * @description Бұл функция жеке кітапты ID бойынша іздейді және қайтарады.
 * Аутентификацияланған пайдаланушылар үшін кітаптың бетбелгіде бар-жоғын көрсетеді.
 */
exports.getBook = async (req, res, next) => {
  try {
    // ID бойынша кітапты іздеу
    const book = await Book.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Кітап табылмаса қате қайтару
    if (!book) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен кітап табылмады`, 404)
      );
    }

    // Кітаптың пайдаланушы үшін бетбелгіде бар-жоғын тексеру
    let isBookmarked = false;
    if (req.user) {
      const bookmark = await Bookmark.findOne({
        where: {
          bookId: req.params.id,
          userId: req.user.id,
        },
      });
      isBookmarked = !!bookmark;
    }

    // isBookmarked қосу үшін қарапайым объектке түрлендіру
    const bookData = book.toJSON();
    bookData.isBookmarked = isBookmarked;

    res.status(200).json({
      success: true,
      data: bookData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жаңа кітап жасау (тек Әкімші)
 * @route   POST /api/books
 * @access  Private/Admin
 * 
 * @description Бұл функция жаңа кітапты жасайды. Тек әкімші пайдаланушылар
 * жаңа кітап жасай алады.
 */
exports.createBook = async (req, res, next) => {
  try {
    // Категорияның бар-жоғын тексеру
    const category = await Category.findByPk(req.body.categoryId);
    if (!category) {
      return next(
        new ErrorResponse(`${req.body.categoryId} ID-мен категория табылмады`, 404)
      );
    }

    // Кітап жасау
    const book = await Book.create(req.body);

    res.status(201).json({
      success: true,
      data: book,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Кітапты жаңарту (тек Әкімші)
 * @route   PUT /api/books/:id
 * @access  Private/Admin
 * 
 * @description Бұл функция кітап мәліметтерін жаңартады. Тек әкімші пайдаланушылар
 * кітаптарды жаңарта алады.
 */
exports.updateBook = async (req, res, next) => {
  try {
    // ID бойынша кітапты іздеу
    let book = await Book.findByPk(req.params.id);

    // Кітап табылмаса қате қайтару
    if (!book) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен кітап табылмады`, 404)
      );
    }

    // Егер категория жаңартылса, оның бар-жоғын тексеру
    if (req.body.categoryId) {
      const category = await Category.findByPk(req.body.categoryId);
      if (!category) {
        return next(
          new ErrorResponse(`${req.body.categoryId} ID-мен категория табылмады`, 404)
        );
      }
    }

    // Кітапты жаңарту
    await book.update(req.body);

    // Байланыстары бар кітап мәліметтерін жаңарту
    book = await Book.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Кітапты жою (тек Әкімші)
 * @route   DELETE /api/books/:id
 * @access  Private/Admin
 * 
 * @description Бұл функция кітапты және оның байланысты жазбаларын жояды.
 * Тек әкімші пайдаланушылар кітаптарды жоя алады.
 */
exports.deleteBook = async (req, res, next) => {
  try {
    // ID бойынша кітапты іздеу
    const book = await Book.findByPk(req.params.id);

    // Кітап табылмаса қате қайтару
    if (!book) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен кітап табылмады`, 404)
      );
    }

    // Байланысты бетбелгілерді жою
    await Bookmark.destroy({
      where: { bookId: req.params.id },
    });

    // Кітап мұқабасын жою (егер ол бар және әдепкі емес болса)
    if (book.cover && book.cover !== 'default-book-cover.jpg') {
      const coverPath = path.join(__dirname, '../../src/uploads/books', book.cover);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    // Кітапты жою
    await book.destroy();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Кітап мұқабасын жүктеу
 * @route   PUT /api/books/:id/cover
 * @access  Private/Admin
 * 
 * @description Бұл функция кітап мұқабасын жүктеуге мүмкіндік береді.
 * Тек әкімші пайдаланушылар кітап мұқабаларын жүктей алады.
 */
exports.bookCoverUpload = async (req, res, next) => {
  try {
    // ID бойынша кітапты іздеу
    const book = await Book.findByPk(req.params.id);

    // Кітап табылмаса қате қайтару
    if (!book) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен кітап табылмады`, 404)
      );
    }

    // Файл жүктелгенін тексеру
    if (!req.files || !req.files.file) {
      return next(new ErrorResponse('Файл жүктеңіз', 400));
    }

    const file = req.files.file;

    // Файлдың сурет екенін тексеру
    if (!file.mimetype.startsWith('image')) {
      return next(new ErrorResponse('Тек сурет файлдарын жүктеңіз', 400));
    }

    // Файл өлшемін тексеру
    const maxSize = process.env.MAX_FILE_UPLOAD || 1024 * 1024; // Әдепкісі 1МБ
    if (file.size > maxSize) {
      return next(
        new ErrorResponse(
          `${maxSize / (1024 * 1024)}МБ-дан кіші суретті жүктеңіз`,
          400
        )
      );
    }

    // Егер жоқ болса, жүктеулер директориясын жасау
    const uploadsDir = path.join(__dirname, '../../src/uploads/books');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Арнайы файл атын жасау
    const fileExt = path.extname(file.name);
    file.name = `book_cover_${book.id}${fileExt}`;
    const filePath = path.join(uploadsDir, file.name);

    // Ескі мұқабаны жою (егер ол бар және әдепкі емес болса)
    if (book.cover && book.cover !== 'default-book-cover.jpg') {
      const oldCoverPath = path.join(uploadsDir, book.cover);
      if (fs.existsSync(oldCoverPath)) {
        fs.unlinkSync(oldCoverPath);
      }
    }

    // Файл жүктеу
    file.mv(filePath, async (err) => {
      if (err) {
        console.error(err);
        return next(new ErrorResponse('Файл жүктеу кезінде қате орын алды', 500));
      }

      // Кітаптың мұқаба өрісін жаңарту
      await book.update({ cover: file.name });

      res.status(200).json({
        success: true,
        data: file.name,
      });
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Танымал кітаптарды алу
 * @route   GET /api/books/popular
 * @access  Public
 * 
 * @description Бұл функция ең жоғары рейтингі бар кітаптарды қайтарады.
 */
exports.getPopularBooks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 4;

    // Рейтингі ең жоғары кітаптарды алу
    const books = await Book.findAll({
      where: {
        rating: { [Op.gt]: 0 },
      },
      order: [
        ['rating', 'DESC'],
        ['reviewCount', 'DESC'],
      ],
      limit,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Аутентификацияланған пайдаланушылар үшін isBookmarked өрісін қосу
    let booksWithBookmarkStatus = books;
    
    if (req.user) {
      const bookIds = books.map(book => book.id);
      const bookmarks = await Bookmark.findAll({
        where: {
          userId: req.user.id,
          bookId: {
            [Op.in]: bookIds,
          },
        },
      });

      const bookmarkedIds = bookmarks.map(bookmark => bookmark.bookId);
      
      booksWithBookmarkStatus = books.map(book => {
        const bookObj = book.toJSON();
        bookObj.isBookmarked = bookmarkedIds.includes(book.id);
        return bookObj;
      });
    }

    res.status(200).json({
      success: true,
      count: booksWithBookmarkStatus.length,
      data: booksWithBookmarkStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жаңа кітаптарды алу
 * @route   GET /api/books/new
 * @access  Public
 * 
 * @description Бұл функция жақында қосылған кітаптарды қайтарады.
 */
exports.getNewBooks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 4;

    // Ең соңғы қосылған кітаптарды алу
    const books = await Book.findAll({
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Аутентификацияланған пайдаланушылар үшін isBookmarked өрісін қосу
    let booksWithBookmarkStatus = books;
    
    if (req.user) {
      const bookIds = books.map(book => book.id);
      const bookmarks = await Bookmark.findAll({
        where: {
          userId: req.user.id,
          bookId: {
            [Op.in]: bookIds,
          },
        },
      });

      const bookmarkedIds = bookmarks.map(bookmark => bookmark.bookId);
      
      booksWithBookmarkStatus = books.map(book => {
        const bookObj = book.toJSON();
        bookObj.isBookmarked = bookmarkedIds.includes(book.id);
        return bookObj;
      });
    }

    res.status(200).json({
      success: true,
      count: booksWithBookmarkStatus.length,
      data: booksWithBookmarkStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Кітап қорын жаңарту (тек әкімші)
 * @route   PUT /api/books/:id/inventory
 * @access  Private/Admin
 * 
 * @description Бұл функция кітаптың жалпы және қолжетімді даналар санын жаңартады.
 * Тек әкімші пайдаланушылар кітап қорын жаңарта алады.
 */
exports.updateInventory = async (req, res, next) => {
  try {
    const { totalCopies, availableCopies } = req.body;

    // Кем дегенде бір өріс берілгенін тексеру
    if (totalCopies === undefined && availableCopies === undefined) {
      return next(
        new ErrorResponse('totalCopies немесе availableCopies беріңіз', 400)
      );
    }

    // ID бойынша кітапты іздеу
    const book = await Book.findByPk(req.params.id);

    // Кітап табылмаса қате қайтару
    if (!book) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен кітап табылмады`, 404)
      );
    }

    // Қор өрістерін жаңарту
    if (totalCopies !== undefined) {
      book.totalCopies = totalCopies;
    }

    if (availableCopies !== undefined) {
      book.availableCopies = availableCopies;
    }

    // availableCopies totalCopies-тен аспауын тексеру
    if (book.availableCopies > book.totalCopies) {
      book.availableCopies = book.totalCopies;
    }

    await book.save();

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Барлық категорияларды алу
 * @route   GET /api/books/categories
 * @access  Public
 * 
 * @description Бұл функция барлық кітап категорияларын қайтарады.
 */
exports.getCategories = async (req, res, next) => {
  try {
    // Категорияларды алу
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Категория жасау
 * @route   POST /api/books/categories
 * @access  Private/Admin
 * 
 * @description Бұл функция жаңа кітап категориясын жасайды. 
 * Тек әкімші пайдаланушылар жаңа категориялар жасай алады.
 */
exports.createCategory = async (req, res, next) => {
  try {
    // Жаңа категория жасау
    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Категорияны жаңарту
 * @route   PUT /api/books/categories/:id
 * @access  Private/Admin
 * 
 * @description Бұл функция кітап категориясын жаңартады.
 * Тек әкімші пайдаланушылар категорияларды жаңарта алады.
 */
exports.updateCategory = async (req, res, next) => {
  try {
    // ID бойынша категорияны іздеу
    const category = await Category.findByPk(req.params.id);

    // Категория табылмаса қате қайтару
    if (!category) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен категория табылмады`, 404)
      );
    }

    // Категорияны жаңарту
    await category.update(req.body);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Категорияны жою
 * @route   DELETE /api/books/categories/:id
 * @access  Private/Admin
 * 
 * @description Бұл функция кітап категориясын жояды, егер оған байланысты
 * кітаптар болмаса. Тек әкімші пайдаланушылар категорияларды жоя алады.
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    // ID бойынша категорияны іздеу
    const category = await Category.findByPk(req.params.id);

    // Категория табылмаса қате қайтару
    if (!category) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен категория табылмады`, 404)
      );
    }

    // Категорияда кітаптар бар-жоғын тексеру
    const bookCount = await Book.count({
      where: { categoryId: req.params.id },
    });

    // Егер категорияда кітаптар болса, жоюға болмайды
    if (bookCount > 0) {
      return next(
        new ErrorResponse(
          `${bookCount} байланысты кітаптары бар категорияны жоюға болмайды`,
          400
        )
      );
    }

    // Категорияны жою
    await category.destroy();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
