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
const { validationResult } = require('express-validator');
const multer = require('multer');
const { Sequelize } = require('sequelize');

// Настройка хранилища для загрузки обложек
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads/covers');
    // Убедимся, что директория существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Создаем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `book-${req.params.id}-${uniqueSuffix}${ext}`);
  }
});

// Фильтр файлов - только изображения
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ErrorResponse('Тек сурет файлдарын жүктеуге рұқсат етілген', 400), false);
  }
};

// Инициализация multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
}).single('file');

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
          { isbn: { [Op.like]: `%${req.query.search}%` } }, // ISBN бойынша іздеу
        ],
      };
    }

    // Категория ID бойынша сүзу
    if (req.query.categoryId) {
      queryOptions.where.categoryId = req.query.categoryId;
    }

    // Тіл бойынша сүзу (егер көрсетілген болса)
    if (req.query.language) {
      queryOptions.where.language = req.query.language;
    }
    
    // Жыл аралығы бойынша сүзу
    if (req.query.yearFrom || req.query.yearTo) {
      queryOptions.where.publicationYear = {};
      
      if (req.query.yearFrom) {
        queryOptions.where.publicationYear[Op.gte] = parseInt(req.query.yearFrom, 10);
      }
      
      if (req.query.yearTo) {
        queryOptions.where.publicationYear[Op.lte] = parseInt(req.query.yearTo, 10);
      }
    }
    
    // Қолжетімділік бойынша сүзу
    if (req.query.available === 'true') {
      queryOptions.where.availableCopies = { [Op.gt]: 0 };
    }
    
    // Сұрыптау
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
      
      switch (req.query.sortBy) {
        case 'title':
          queryOptions.order = [['title', sortOrder]];
          break;
        case 'author':
          queryOptions.order = [['author', sortOrder]];
          break;
        case 'year':
          queryOptions.order = [['publicationYear', sortOrder]];
          break;
        case 'popularity':
          // Popularity sorting would ideally use a counter of borrows/bookmarks
          queryOptions.order = [['createdAt', sortOrder]];
          break;
        default:
          queryOptions.order = [['publicationYear', 'DESC']];
      }
    }
    
    // Беттеу
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    
    // Қосымша беттеу параметрлерін қосу
    queryOptions.limit = limit;
    queryOptions.offset = offset;

    // Кітаптардың жалпы санын есептеу
    const count = await Book.count({ where: queryOptions.where });
    
    // Кітаптарды алу
    const books = await Book.findAll(queryOptions);

    // Аутентификацияланған пайдаланушылар үшін бетбелгі жағдайын қосу
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
        
        // Добавляем полный URL до обложки если она есть
        if (bookObj.cover) {
          // Проверяем, является ли путь абсолютным URL или относительным
          if (!bookObj.cover.startsWith('http')) {
            const serverUrl = `${req.protocol}://${req.get('host')}`;
            bookObj.cover = `${serverUrl}${bookObj.cover}`;
          }
        }
        
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
      total: count,
      totalPages: Math.ceil(count / limit),
      pagination,
      data: booksWithBookmarkStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Нақты кітапты алу
 * @route   GET /api/books/:id
 * @access  Public
 * 
 * @description Бұл функция ID бойынша нақты кітапты қайтарады.
 * Аутентификацияланған пайдаланушылар үшін кітаптың бетбелгіде
 * бар-жоғын көрсетеді.
 */
exports.getBook = async (req, res, next) => {
  try {
    // ID бойынша кітапты алу
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

    // Кітапты объектке түрлендіру
    const bookObj = book.toJSON();

    // Добавляем полный URL до обложки если она есть
    if (bookObj.cover) {
      // Проверяем, является ли путь абсолютным URL или относительным
      if (!bookObj.cover.startsWith('http')) {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        bookObj.cover = `${serverUrl}${bookObj.cover}`;
      }
    }

    // Аутентификацияланған пайдаланушылар үшін бетбелгі жағдайын қосу
    if (req.user) {
      const bookmark = await Bookmark.findOne({
        where: {
          userId: req.user.id,
          bookId: book.id,
        },
      });

      bookObj.isBookmarked = !!bookmark;
    }

    res.status(200).json({
      success: true,
      data: bookObj,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жаңа кітап жасау
 * @route   POST /api/books
 * @access  Private/Admin
 * 
 * @description Бұл функция жаңа кітап жасауға мүмкіндік береді.
 * Тек әкімші пайдаланушылар жаңа кітаптар жасай алады.
 */
exports.createBook = async (req, res, next) => {
  try {
    // Валидация нәтижелерін тексеру
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    // Категория ID болса, ол өмір сүретінін тексеру
    if (req.body.categoryId) {
      const category = await Category.findByPk(req.body.categoryId);
      if (!category) {
        return next(
          new ErrorResponse(`${req.body.categoryId} ID-мен категория табылмады`, 404)
        );
      }
    }

    // Жаңа кітап жасау
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
 * @desc    Кітапты жаңарту
 * @route   PUT /api/books/:id
 * @access  Private/Admin
 * 
 * @description Бұл функция бар кітапты жаңартуға мүмкіндік береді.
 * Тек әкімші пайдаланушылар кітаптарды жаңарта алады.
 */
exports.updateBook = async (req, res, next) => {
  try {
    // ID бойынша кітапты алу
    const book = await Book.findByPk(req.params.id);

    // Кітап табылмаса қате қайтару
    if (!book) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен кітап табылмады`, 404)
      );
    }

    // Категория ID болса, ол өмір сүретінін тексеру
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

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Кітапты жою
 * @route   DELETE /api/books/:id
 * @access  Private/Admin
 * 
 * @description Бұл функция кітапты дерекқордан жояды.
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

    // Если у книги есть обложка, удаляем файл
    if (book.cover && !book.cover.startsWith('http')) {
      const coverPath = path.join(__dirname, '../../public', book.cover);
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
 * @description Бұл функция кітап үшін жаңа мұқаба суретін жүктеуге мүмкіндік береді.
 * Тек әкімші пайдаланушылар кітап мұқабаларын жүктей алады.
 */
exports.uploadBookCover = async (req, res, next) => {
  try {
    // ID бойынша кітапты алу
    const book = await Book.findByPk(req.params.id);

    // Кітап табылмаса қате қайтару
    if (!book) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен кітап табылмады`, 404)
      );
    }

    // Multer арқылы файлды жүктеу
    upload(req, res, async function(err) {
      if (err) {
        console.error('Ошибка загрузки файла:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new ErrorResponse('Файл өлшемі 5MB-дан аспауы керек', 400)
          );
        }
        return next(err);
      }

      if (!req.file) {
        console.error('Файл не был загружен');
        return next(
          new ErrorResponse('Жүктеу үшін файл таңдаңыз', 400)
        );
      }

      console.log('Файл успешно загружен:', req.file);

      // Сақтау режимін анықтау (локальды немесе сыртқы)
      const storeLocally = req.body.storeLocally === 'true';
      
      try {
        const filePath = req.file.path;
        const fileName = req.file.filename;
        
        // Убедимся, что путь доступен
        if (!fs.existsSync(filePath)) {
          console.error('Путь к загруженному файлу не существует:', filePath);
          return next(
            new ErrorResponse('Ошибка при сохранении файла', 500)
          );
        }
        
        console.log('Путь к загруженному файлу:', filePath);
        console.log('Имя файла:', fileName);
        
        // Сыртқы хостингке жүктеу немесе локальды сақтау
        let coverUrl;
        
        if (storeLocally) {
          // Локальды сақтау - жай ғана жүктелген файлдың жолын пайдалану
          coverUrl = `/uploads/covers/${fileName}`;
          console.log(`📸 Мұқаба локальды сақталды: ${coverUrl}`);
        } else {
          // Бұл жерде сыртқы хостингке жүктеу кодын іске асыруға болады
          // Мысалы: Amazon S3, Cloudinary, т.б.
          // Қазіргі уақытта, біз тек локальды сақтауды пайдаланамыз
          coverUrl = `/uploads/covers/${fileName}`;
          console.log(`📸 Мұқаба жүктелді: ${coverUrl}`);
        }

        // Ескі мұқаба файлын жою (әдепкіден басқа)
        const oldCover = book.cover;
        if (oldCover && !oldCover.includes('default-book-cover') && oldCover.startsWith('/uploads/')) {
          const oldCoverPath = path.join(__dirname, '../../public', oldCover);
          if (fs.existsSync(oldCoverPath)) {
            fs.unlinkSync(oldCoverPath);
            console.log(`🗑️ Ескі мұқаба жойылды: ${oldCoverPath}`);
          }
        }

        // Кітапты жаңарту
        await book.update({ 
          cover: coverUrl,
          coverStoredLocally: storeLocally  // Мұқаба сақтау режимін сақтау
        });

        // Проверим, успешно ли обновилась запись в базе данных
        const updatedBook = await Book.findByPk(req.params.id);
        console.log('Обновленная запись в БД:', updatedBook.cover);

        // Толық URL мекенжайын құру
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        const fullCoverUrl = `${serverUrl}${coverUrl}`;
        console.log('Полный URL обложки:', fullCoverUrl);

        res.status(200).json({
          success: true,
          data: {
            id: book.id,
            cover: coverUrl, // Возвращаем относительный путь
            fullCoverUrl: fullCoverUrl, // Возвращаем полный URL
            coverStoredLocally: storeLocally
          },
          message: 'Кітап мұқабасы сәтті жүктелді'
        });
      } catch (error) {
        console.error('Ошибка при обработке загруженного файла:', error);
        // Жүктелген файлды тазалау
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        throw error;
      }
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
 * @description Бұл функция кітап категориясын жояды.
 * Тек әкімші пайдаланушылар категорияларды жоя алады.
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

    // Бұл категорияға байланысты кітаптар бар-жоғын тексеру
    const booksCount = await Book.count({
      where: {
        categoryId: category.id,
      },
    });

    if (booksCount > 0) {
      return next(
        new ErrorResponse(
          `Бұл категорияға байланысты ${booksCount} кітап бар. Алдымен оларды басқа категорияға ауыстырыңыз.`,
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

/**
 * @desc    Танымал кітаптарды алу
 * @route   GET /api/books/popular
 * @access  Public
 * 
 * @description Бұл функция ең танымал кітаптарды қайтарады.
 * Танымалдылық бетбелгілер саны бойынша анықталады.
 */
exports.getPopularBooks = async (req, res, next) => {
  try {
    // Бетбелгілер саны бойынша сұрыпталған кітаптарды алу
    const books = await Book.findAll({
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
        {
          model: Bookmark,
          as: 'bookmarks',
          attributes: [],
        }
      ],
      attributes: {
        include: [
          [Sequelize.literal('(SELECT COUNT(*) FROM Bookmarks WHERE Bookmarks.bookId = Book.id)'), 'bookmarkCount']
        ]
      },
      order: [
        [Sequelize.literal('bookmarkCount'), 'DESC']
      ],
      limit: 10
    });

    // Кітаптардың мұқаба URL-дарын толық URL-дарға түрлендіру
    const booksWithFullUrls = books.map(book => {
      const bookObj = book.toJSON();
      
      if (bookObj.cover && !bookObj.cover.startsWith('http')) {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        bookObj.cover = `${serverUrl}${bookObj.cover}`;
      }
      
      return bookObj;
    });

    res.status(200).json({
      success: true,
      count: booksWithFullUrls.length,
      data: booksWithFullUrls,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жаңа қосылған кітаптарды алу
 * @route   GET /api/books/new
 * @access  Public
 * 
 * @description Бұл функция соңғы қосылған кітаптарды қайтарады.
 */
exports.getNewBooks = async (req, res, next) => {
  try {
    // Соңғы қосылған кітаптарды алу
    const books = await Book.findAll({
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        }
      ],
      order: [
        ['createdAt', 'DESC']
      ],
      limit: 10
    });

    // Кітаптардың мұқаба URL-дарын толық URL-дарға түрлендіру
    const booksWithFullUrls = books.map(book => {
      const bookObj = book.toJSON();
      
      if (bookObj.cover && !bookObj.cover.startsWith('http')) {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        bookObj.cover = `${serverUrl}${bookObj.cover}`;
      }
      
      return bookObj;
    });

    res.status(200).json({
      success: true,
      count: booksWithFullUrls.length,
      data: booksWithFullUrls,
    });
  } catch (err) {
    next(err);
  }
};