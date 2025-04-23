// controllers/borrowController.js
const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const Borrow = db.Borrow;
const Book = db.Book;
const User = db.User;
const Category = db.Category;
const Notification = db.Notification;

/**
 * @desc    Кітапты қарызға алу
 * @route   POST /api/borrows
 * @access  Private
 * 
 * @description Бұл функция пайдаланушының кітапты қарызға алу процесін басқарады.
 * Кітаптың қолжетімділігін тексереді, қарызға алу жазбасын жасайды және 
 * кітаптың қолжетімді даналар санын жаңартады.
 */
exports.borrowBook = async (req, res, next) => {
  try {
    // Сұраныс денесінен кітап идентификаторын алу
    const { bookId } = req.body;

    // Кітапты іздеу
    const book = await Book.findByPk(bookId);

    // Кітап табылмаса қате қайтару
    if (!book) {
      return next(new ErrorResponse(`${bookId} ID-мен кітап табылмады`, 404));
    }

    // Кітаптың қолжетімді екенін тексеру
    if (book.availableCopies <= 0) {
      return next(
        new ErrorResponse('Бұл кітап қазіргі уақытта қарызға алу үшін қолжетімді емес', 400)
      );
    }

    // Пайдаланушының бұл кітапты бұрыннан қарызға алғанын тексеру
    const existingBorrow = await Borrow.findOne({
      where: {
        bookId,
        userId: req.user.id,
        status: 'active',
      },
    });

    // Егер пайдаланушы бұл кітапты әлдеқашан қарызға алып, әлі қайтармаған болса
    if (existingBorrow) {
      return next(
        new ErrorResponse(
          'Сіз бұл кітапты әлдеқашан қарызға алдыңыз және әлі қайтармадыңыз',
          400
        )
      );
    }

    // Қайтару мерзімін есептеу (әдепкі: 14 күн немесе кітапта көрсетілгендей)
    const borrowDuration = book.borrowDuration || 14; // күндер
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + borrowDuration);

    // Транзакцияны бастау
    const transaction = await db.sequelize.transaction();

    try {
      // Қарызға алу жазбасын жасау
      const borrow = await Borrow.create(
        {
          bookId,
          userId: req.user.id,
          dueDate,
          status: 'active',
        },
        { transaction }
      );

      // Қолжетімді даналар санын азайту
      await book.update(
        {
          availableCopies: book.availableCopies - 1,
        },
        { transaction }
      );

      // Пайдаланушы үшін хабарландыру жасау
      await Notification.create(
        {
          userId: req.user.id,
          title: 'Кітап сәтті тапсырыс берілді',
          message: `Сіз "${book.title}" кітабын сәтті тапсырыс бердіңіз. Қайтару мерзімі - ${dueDate.toLocaleDateString()}`,
          type: 'info',
          relatedModel: 'Borrow',
          relatedId: borrow.id,
        },
        { transaction }
      );

      // Транзакцияны аяқтау
      await transaction.commit();

      // Кітап және пайдаланушы мәліметтерімен бірге қарызға алуды қайтару
      const borrowWithDetails = await Borrow.findByPk(borrow.id, {
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author', 'cover'],
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
        data: borrowWithDetails,
      });
    } catch (err) {
      // Қате болған жағдайда транзакцияны қайтару
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Қарызға алынған кітапты қайтару
 * @route   PUT /api/borrows/:id/return
 * @access  Private
 * 
 * @description Бұл функция кітапты қайтару процесін басқарады. Ол қарызға алу мәртебесін
 * жаңартады, кітаптың қолжетімді даналар санын арттырады және пайдаланушыға 
 * хабарландыру жібереді.
 */
exports.returnBook = async (req, res, next) => {
  try {
    // Қарызға алу жазбасын іздеу
    let borrow = await Borrow.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'availableCopies'],
        },
      ],
    });

    // Қарызға алу жазбасы табылмаса қате қайтару
    if (!borrow) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен қарызға алу жазбасы табылмады`, 404)
      );
    }

    // Пайдаланушы осы қарызға алу жазбасының иесі немесе әкімші/кітапханашы екенін тексеру
    if (borrow.userId !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'librarian') {
      return next(new ErrorResponse('Бұл кітапты қайтаруға рұқсатыңыз жоқ', 401));
    }

    // Кітаптың әлдеқашан қайтарылғанын тексеру
    if (borrow.status === 'returned') {
      return next(new ErrorResponse('Бұл кітап әлдеқашан қайтарылған', 400));
    }

    // Транзакцияны бастау
    const transaction = await db.sequelize.transaction();

    try {
      // Қарызға алу жазбасын жаңарту
      await borrow.update(
        {
          status: 'returned',
          returnDate: new Date(),
        },
        { transaction }
      );

      // Кітаптың қолжетімді даналар санын арттыру
      const book = await Book.findByPk(borrow.bookId, { transaction });
      await book.update(
        {
          availableCopies: book.availableCopies + 1,
        },
        { transaction }
      );

      // Пайдаланушы үшін хабарландыру жасау
      await Notification.create(
        {
          userId: borrow.userId,
          title: 'Кітап сәтті қайтарылды',
          message: `Сіз "${borrow.book.title}" кітабын сәтті қайтардыңыз. Уақытында қайтарғаныңыз үшін рахмет!`,
          type: 'info',
          relatedModel: 'Borrow',
          relatedId: borrow.id,
        },
        { transaction }
      );

      // Транзакцияны аяқтау
      await transaction.commit();

      // Жаңартылған қарызға алу жазбасын мәліметтермен бірге алу
      borrow = await Borrow.findByPk(req.params.id, {
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author', 'cover'],
          },
        ],
      });

      res.status(200).json({
        success: true,
        data: borrow,
      });
    } catch (err) {
      // Қате болған жағдайда транзакцияны қайтару
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Ағымдағы пайдаланушының қарызға алу тарихын алу
 * @route   GET /api/borrows
 * @access  Private
 * 
 * @description Бұл функция сұраныс жіберген пайдаланушының қарызға алу тарихын
 * қайтарады. Мәртебе және беттеу бойынша сүзуді қолдайды.
 */
exports.getUserBorrows = async (req, res, next) => {
  try {
    // Сұраныс параметрлерінен мәртебе сүзгісін алу
    const { status } = req.query;

    // Сұраныс шартын құру
    const where = { userId: req.user.id };

    // Егер берілген болса, мәртебе бойынша сүзу
    if (status && ['active', 'returned', 'overdue'].includes(status)) {
      where.status = status;
    }

    // Беттеу
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    // Беттеумен бірге қарызға алуларды іздеу
    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where,
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      order: [['borrowDate', 'DESC']],
      limit,
      offset,
    });

    // Беттеу нәтижесі
    const pagination = {};

    if (offset + borrows.length < count) {
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
      count: borrows.length,
      pagination,
      totalPages: Math.ceil(count / limit),
      total: count,
      data: borrows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Барлық қарызға алуларды алу (тек әкімші немесе кітапханашы үшін)
 * @route   GET /api/borrows/all
 * @access  Private/Admin/Librarian
 * 
 * @description Бұл функция жүйедегі барлық қарызға алуларды іздейді және қайтарады.
 * Сүзу және іздеу опцияларын қолдайды.
 */
exports.getAllBorrows = async (req, res, next) => {
  try {
    // Сүзу параметрлері
    const { status, userId, bookId, startDate, endDate, overdue } = req.query;

    // Сұраныс шартын құру
    const where = {};

    // Мәртебе бойынша сүзу
    if (status && ['active', 'returned', 'overdue'].includes(status)) {
      where.status = status;
    }

    // Пайдаланушы ID бойынша сүзу
    if (userId) {
      where.userId = userId;
    }

    // Кітап ID бойынша сүзу
    if (bookId) {
      where.bookId = bookId;
    }

    // Күн аралығы бойынша сүзу
    if (startDate || endDate) {
      where.borrowDate = {};

      if (startDate) {
        where.borrowDate[Op.gte] = new Date(startDate);
      }

      if (endDate) {
        where.borrowDate[Op.lte] = new Date(endDate);
      }
    }

    // Мерзімі өткен қарызға алуларды сүзу
    if (overdue === 'true') {
      where.status = 'active';
      where.dueDate = { [Op.lt]: new Date() };
    }

    // Беттеу
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    // Беттеумен бірге қарызға алуларды іздеу
    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where,
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'studentId'],
        },
      ],
      order: [['borrowDate', 'DESC']],
      limit,
      offset,
    });

    // Беттеу нәтижесі
    const pagination = {};

    if (offset + borrows.length < count) {
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
      count: borrows.length,
      pagination,
      totalPages: Math.ceil(count / limit),
      total: count,
      data: borrows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жеке қарызға алу жазбасын алу
 * @route   GET /api/borrows/:id
 * @access  Private
 * 
 * @description Бұл функция жеке қарызға алу жазбасының мәліметтерін қайтарады.
 * Тек қарызға алу иесі, әкімші немесе кітапханашы кіре алады.
 */
exports.getBorrow = async (req, res, next) => {
  try {
    // Қарызға алу жазбасын іздеу
    const borrow = await Borrow.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover', 'description'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'studentId'],
        },
      ],
    });

    // Қарызға алу жазбасы табылмаса қате қайтару
    if (!borrow) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен қарызға алу жазбасы табылмады`, 404)
      );
    }

    // Тек иесіне, әкімшіге немесе кітапханашыға рұқсат ету
    if (borrow.userId !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'librarian') {
      return next(new ErrorResponse('Бұл қарызға алу жазбасын көруге рұқсатыңыз жоқ', 401));
    }

    res.status(200).json({
      success: true,
      data: borrow,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Қарызға алу жазбасын жаңарту (тек әкімші немесе кітапханашы үшін)
 * @route   PUT /api/borrows/:id
 * @access  Private/Admin/Librarian
 * 
 * @description Бұл функция қарызға алу жазбасын жаңартуға мүмкіндік береді.
 * Әкімшілер немесе кітапханашылар мәртебесін, қайтару мерзімін және ескертпелерді жаңарта алады.
 */
exports.updateBorrow = async (req, res, next) => {
  try {
    // Тек белгілі өрістерді жаңартуға рұқсат ету
    const { status, dueDate, notes } = req.body;

    // Қарызға алу жазбасын іздеу
    const borrow = await Borrow.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'availableCopies'],
        },
      ],
    });

    // Қарызға алу жазбасы табылмаса қате қайтару
    if (!borrow) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен қарызға алу жазбасы табылмады`, 404)
      );
    }

    // Транзакцияны бастау
    const transaction = await db.sequelize.transaction();

    try {
      const fieldsToUpdate = {};

      // Егер мәртебе берілген және рұқсат етілген болса, оны қосу
      if (status && ['active', 'returned', 'overdue'].includes(status)) {
        fieldsToUpdate.status = status;
      }

      // Егер қайтару мерзімі берілген болса, оны қосу
      if (dueDate) {
        fieldsToUpdate.dueDate = dueDate;
      }

      // Егер ескертпелер берілген болса, оларды қосу
      if (notes !== undefined) {
        fieldsToUpdate.notes = notes;
      }

      // Егер мәртебе 'returned' болса және бұрын 'returned' болмаса, қайтару күнін орнату
      if (status === 'returned' && borrow.status !== 'returned') {
        fieldsToUpdate.returnDate = new Date();

        // Егер кітап қайтарылса, қолжетімді даналар санын арттыру
        const book = await Book.findByPk(borrow.bookId, { transaction });
        await book.update(
          {
            availableCopies: book.availableCopies + 1,
          },
          { transaction }
        );

        // Пайдаланушы үшін хабарландыру жасау
        await Notification.create(
          {
            userId: borrow.userId,
            title: 'Книга отмечена как возвращенная',
            message: `Книга "${borrow.book.title}" была отмечена как возвращенная.`,
            type: 'info',
            relatedModel: 'Borrow',
            relatedId: borrow.id,
          },
          { transaction }
        );
      }

      // Қарызға алу жазбасын жаңарту
      await borrow.update(fieldsToUpdate, { transaction });

      // Транзакцияны аяқтау
      await transaction.commit();

      // Мәліметтермен бірге жаңартылған қарызға алуды алу
      const updatedBorrow = await Borrow.findByPk(req.params.id, {
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author', 'cover'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'studentId'],
          },
        ],
      });

      res.status(200).json({
        success: true,
        data: updatedBorrow,
      });
    } catch (err) {
      // Қате болған жағдайда транзакцияны қайтару
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Мерзімі өткен қарызға алуларды тексеру және хабарландырулар жіберу
 * @route   GET /api/borrows/check-overdue
 * @access  Private/Admin/Librarian
 * 
 * @description Бұл функция мерзімі өткен қарызға алуларды іздейді, олардың мәртебесін
 * 'overdue' етіп жаңартады және пайдаланушыларға хабарландырулар жібереді.
 */
exports.checkOverdueBorrows = async (req, res, next) => {
  try {
    // Қайтару мерзімі өткен белсенді қарызға алуларды табу
    const overdueBorrows = await Borrow.findAll({
      where: {
        status: 'active',
        dueDate: { [Op.lt]: new Date() },
      },
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    // Мәртебені 'overdue' етіп жаңарту және хабарландырулар жасау
    let updatedCount = 0;

    for (const borrow of overdueBorrows) {
      // Әр қарызға алу үшін транзакцияны бастау
      const transaction = await db.sequelize.transaction();

      try {
        // Тек әлі 'overdue' етіп белгіленбеген болса ғана жаңарту
        if (borrow.status !== 'overdue') {
          // Мәртебені жаңарту
          await borrow.update(
            {
              status: 'overdue',
            },
            { transaction }
          );

          // Хабарландыру жасау
          await Notification.create(
            {
              userId: borrow.userId,
              title: 'Кітапты қайтару мерзімі өтіп кетті',
              message: `"${borrow.book.title}" кітабын қайтару мерзімі өтіп кетті. Кітапты мүмкіндігінше тезірек кітапханаға қайтарыңыз.`,
              type: 'overdue',
              relatedModel: 'Borrow',
              relatedId: borrow.id,
            },
            { transaction }
          );

          // Транзакцияны аяқтау
          await transaction.commit();
          updatedCount++;
        } else {
          // Жаңартулар қажет емес, тек аяқтау
          await transaction.commit();
        }
      } catch (err) {
        // Қате болған жағдайда транзакцияны қайтару
        await transaction.rollback();
        throw err;
      }
    }

    res.status(200).json({
      success: true,
      count: overdueBorrows.length,
      updatedCount,
      data: overdueBorrows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жақында қайтарылу керек кітаптарды алу және еске салу хабарландыруларын жіберу
 * @route   GET /api/borrows/send-reminders
 * @access  Private/Admin/Librarian
 * 
 * @description Бұл функция жақын арада қайтарылуы керек кітаптарды іздейді және
 * пайдаланушыларға еске салу хабарландыруларын жібереді.
 */
exports.sendDueReminders = async (req, res, next) => {
  try {
    // Қазіргі уақыттан 3 күн кейінгі күнді есептеу
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const today = new Date();

    // Келесі 3 күн ішінде қайтарылуы керек белсенді қарызға алуларды табу
    const upcomingDueBorrows = await Borrow.findAll({
      where: {
        status: 'active',
        dueDate: {
          [Op.gte]: today,
          [Op.lte]: threeDaysFromNow,
        },
      },
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    // Еске салу хабарландыруларын жасау
    let notificationsCreated = 0;

    for (const borrow of upcomingDueBorrows) {
      // Бұл қарызға алу үшін еске салу хабарландыруы бұрыннан бар-жоғын тексеру
      const existingNotification = await Notification.findOne({
        where: {
          userId: borrow.userId,
          relatedModel: 'Borrow',
          relatedId: borrow.id,
          type: 'return',
          // Тек соңғы 24 сағат ішіндегі хабарландыруларды іздеу
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      // Хабарландыру әлі жоқ болса ғана жасау
      if (!existingNotification) {
        // Жаңа хабарландыру жасау
        await Notification.create({
          userId: borrow.userId,
          title: 'Кітапты қайтару мерзімі туралы еске салу',
          message: `"${borrow.book.title}" кітабын қайтару мерзімі ${borrow.dueDate.toLocaleDateString()} күні аяқталады. Кітапты уақытында қайтаруыңызды сұраймыз.`,
          type: 'return',
          relatedModel: 'Borrow',
          relatedId: borrow.id,
        });

        notificationsCreated++;
      }
    }

    res.status(200).json({
      success: true,
      count: upcomingDueBorrows.length,
      notificationsCreated,
      data: upcomingDueBorrows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Қарызға алу статистикасын алу
 * @route   GET /api/borrows/stats
 * @access  Private/Admin
 * 
 * @description Бұл функция жүйедегі қарызға алулар туралы жалпы статистиканы қайтарады.
 * Әртүрлі мәртебелер бойынша қарызға алулар санын, ең көп қарызға алынған кітаптарды
 * және ең белсенді пайдаланушыларды қамтиды.
 */
exports.getBorrowStats = async (req, res, next) => {
  try {
    // Әртүрлі қарызға алу мәртебелері бойынша сандарды алу
    const [activeBorrows, returnedBorrows, overdueBorrows, totalBorrows] = await Promise.all([
      Borrow.count({ where: { status: 'active' } }),
      Borrow.count({ where: { status: 'returned' } }),
      Borrow.count({ where: { status: 'overdue' } }),
      Borrow.count(),
    ]);

    // Ең көп қарызға алынған кітаптар
    const mostBorrowedBooks = await Borrow.findAll({
      attributes: [
        'bookId',
        [db.sequelize.fn('COUNT', db.sequelize.col('bookId')), 'borrowCount'],
      ],
      group: ['bookId'],
      order: [[db.sequelize.literal('borrowCount'), 'DESC']],
      limit: 5,
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover'],
        },
      ],
    });

    // Ең белсенді қарызға алушылар
    const mostActiveBorrowers = await Borrow.findAll({
      attributes: [
        'userId',
        [db.sequelize.fn('COUNT', db.sequelize.col('userId')), 'borrowCount'],
      ],
      group: ['userId'],
      order: [[db.sequelize.literal('borrowCount'), 'DESC']],
      limit: 5,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'studentId'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: {
        counts: {
          active: activeBorrows,
          returned: returnedBorrows,
          overdue: overdueBorrows,
          total: totalBorrows,
        },
        mostBorrowedBooks,
        mostActiveBorrowers,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Қарызға алу мерзімін ұзарту
 * @route   PUT /api/borrows/:id/extend
 * @access  Private
 * 
 * @description Бұл функция пайдаланушыға қарызға алу мерзімін ұзартуға мүмкіндік береді.
 * Тек белсенді және мерзімі өтпеген қарызға алуларды ұзартуға болады.
 */
exports.extendBorrow = async (req, res, next) => {
  try {
    // Қарызға алу жазбасын іздеу
    const borrow = await Borrow.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'borrowDuration'],
        },
      ],
    });

    // Қарызға алу жазбасы табылмаса қате қайтару
    if (!borrow) {
      return next(
        new ErrorResponse(`${req.params.id} ID-мен қарызға алу жазбасы табылмады`, 404)
      );
    }

    // Тек қарызға алушы, әкімші немесе кітапханашы ұзарта алады
    if (borrow.userId !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'librarian') {
      return next(new ErrorResponse('Бұл қарызға алуды ұзартуға рұқсатыңыз жоқ', 401));
    }

    // Қарызға алу белсенді екенін тексеру
    if (borrow.status !== 'active') {
      return next(
        new ErrorResponse('Тек белсенді қарызға алуларды ұзартуға болады', 400)
      );
    }

    // Қарызға алу мерзімі өтіп кеткенін тексеру
    if (new Date() > borrow.dueDate) {
      return next(
        new ErrorResponse('Мерзімі өткен қарызға алуларды ұзартуға болмайды', 400)
      );
    }

    // Жаңа қайтару мерзімін есептеу (7 күн немесе кітаптың borrowDuration/2)
    const extensionDays = borrow.book.borrowDuration 
      ? Math.ceil(borrow.book.borrowDuration / 2) 
      : 7;
    
    const newDueDate = new Date(borrow.dueDate);
    newDueDate.setDate(newDueDate.getDate() + extensionDays);

    // Транзакцияны бастау
    const transaction = await db.sequelize.transaction();

    try {
      // Қайтару мерзімін жаңарту
      await borrow.update(
        {
          dueDate: newDueDate,
        },
        { transaction }
      );

      // Хабарландыру жасау
      await Notification.create(
        {
          userId: borrow.userId,
          title: 'Кітапты қайтару мерзімі ұзартылды',
          message: `"${borrow.book.title}" кітабын қайтару мерзімі ${newDueDate.toLocaleDateString()} дейін ұзартылды.`,
          type: 'info',
          relatedModel: 'Borrow',
          relatedId: borrow.id,
        },
        { transaction }
      );

      // Транзакцияны аяқтау
      await transaction.commit();

      // Жаңартылған қарызға алуды алу
      const updatedBorrow = await Borrow.findByPk(req.params.id, {
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author', 'cover'],
          },
        ],
      });

      res.status(200).json({
        success: true,
        data: updatedBorrow,
      });
    } catch (err) {
      // Қате болған жағдайда транзакцияны қайтару
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};