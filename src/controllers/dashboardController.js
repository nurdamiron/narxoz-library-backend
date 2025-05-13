/**
 * Дашборд контроллері
 * 
 * @description Бұл файл әкімші панеліне арналған статистикалық деректерді алу функцияларын қамтиды.
 * Жүйедегі жалпы статистика, танымал кітаптар және белсенді пайдаланушылар туралы ақпарат алуға мүмкіндік береді.
 */
const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const User = db.User;
const Book = db.Book;
const Borrow = db.Borrow;
const Category = db.Category;
const Bookmark = db.Bookmark;
const { Sequelize } = require('sequelize');

/**
 * @desc    Дашборд үшін статистиканы алу
 * @route   GET /api/dashboard/stats
 * @access  Private/Admin
 * 
 * @description Бұл функция әкімші панелі үшін жалпы статистиканы қайтарады.
 * Пайдаланушылар, кітаптар, белсенді қарызға алулар, мерзімі өткен қарызға алулар
 * және категориялар санын қамтиды.
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Жалпы статистика
    const [usersCount, booksCount, categoriesCount, activeBorrowsCount, overdueBorrowsCount] = await Promise.all([
      User.count(),
      Book.count(),
      Category.count(),
      Borrow.count({ where: { status: 'active' } }),
      Borrow.count({ where: { status: 'overdue' } })
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
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            }
          ]
        },
      ],
    });

    // Кітаптардың мұқаба URL-дарын толық URL-дарға түрлендіру
    const booksWithFullUrls = mostBorrowedBooks.map(item => {
      const itemObj = item.toJSON();
      
      if (itemObj.book && itemObj.book.cover && !itemObj.book.cover.startsWith('http')) {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        itemObj.book.cover = `${serverUrl}${itemObj.book.cover}`;
      }
      
      return itemObj;
    });

    // Белсенді пайдаланушылар секциясы алынып тасталды

    // Соңғы қосылған кітаптар
    const newBooks = await Book.findAll({
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
      limit: 5
    });

    // Кітаптардың мұқаба URL-дарын толық URL-дарға түрлендіру
    const newBooksWithFullUrls = newBooks.map(book => {
      const bookObj = book.toJSON();
      
      if (bookObj.cover && !bookObj.cover.startsWith('http')) {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        bookObj.cover = `${serverUrl}${bookObj.cover}`;
      }
      
      return bookObj;
    });

    // Жауап
    res.status(200).json({
      success: true,
      data: {
        counts: {
          users: usersCount,
          books: booksCount,
          categories: categoriesCount,
          activeBorrows: activeBorrowsCount,
          overdueBorrows: overdueBorrowsCount,
          totalBorrows: activeBorrowsCount + overdueBorrowsCount
        },
        mostBorrowedBooks: booksWithFullUrls,
        newBooks: newBooksWithFullUrls
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жылдық статистиканы алу
 * @route   GET /api/dashboard/yearly-stats
 * @access  Private/Admin
 * 
 * @description Бұл функция жыл бойынша қарызға алулар статистикасын қайтарады.
 * Әрбір ай үшін қарызға алулар санын көрсетеді.
 */
exports.getYearlyStats = async (req, res, next) => {
  try {
    // Ағымдағы жыл немесе сұраныс параметрінен жыл алу
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    
    // Ай бойынша топтастырылған қарызға алулар санын есептеу
    const monthlyStats = await Borrow.findAll({
      attributes: [
        [Sequelize.fn('MONTH', Sequelize.col('borrowDate')), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: Sequelize.where(
        Sequelize.fn('YEAR', Sequelize.col('borrowDate')),
        year
      ),
      group: [Sequelize.fn('MONTH', Sequelize.col('borrowDate'))],
      order: [[Sequelize.literal('month'), 'ASC']]
    });
    
    // Барлық айлар үшін толық нәтиже құру
    const fullYearStats = Array(12).fill(0);
    monthlyStats.forEach(stat => {
      // MONTH функциясы 1-ден (қаңтар) 12-ге (желтоқсан) дейінгі сандарды қайтарады
      const month = stat.getDataValue('month') - 1; // 0-ден бастау үшін -1
      fullYearStats[month] = parseInt(stat.getDataValue('count'), 10);
    });
    
    // Ай аттары (қазақ тілінде)
    const monthNames = [
      'Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым',
      'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'
    ];
    
    // Жауап деректерін құрылымдау
    const chartData = {
      labels: monthNames,
      data: fullYearStats
    };
    
    res.status(200).json({
      success: true,
      year,
      data: chartData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Санат статистикасын алу
 * @route   GET /api/dashboard/category-stats
 * @access  Private/Admin
 * 
 * @description Бұл функция әр санаттағы кітаптар мен қарызға алулар санын қайтарады.
 */
exports.getCategoryStats = async (req, res, next) => {
  try {
    // Әр санаттағы кітаптар санын есептеу
    const categoriesWithCounts = await Category.findAll({
      attributes: [
        'id', 
        'name', 
        [Sequelize.fn('COUNT', Sequelize.col('books.id')), 'bookCount']
      ],
      include: [
        {
          model: Book,
          as: 'books',
          attributes: []
        }
      ],
      group: ['Category.id'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('books.id')), 'DESC']]
    });
    
    // Әр санат үшін қарызға алулар санын есептеу
    const result = await Promise.all(categoriesWithCounts.map(async (category) => {
      const borrowCount = await Borrow.count({
        include: [
          {
            model: Book,
            as: 'book',
            where: { categoryId: category.id }
          }
        ]
      });
      
      return {
        id: category.id,
        name: category.name,
        bookCount: parseInt(category.getDataValue('bookCount'), 10),
        borrowCount
      };
    }));
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};