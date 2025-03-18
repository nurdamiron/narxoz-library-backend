// Продолжение файла bookController.js

// Удаление книги
exports.deleteBook = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    
    try {
      const book = await Book.findByPk(req.params.id);
      
      if (!book) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Книга не найдена'
        });
      }
      
      // Проверка, есть ли активные выдачи книги
      const activeLoans = await book.countBorrows({
        where: { status: 'active' }
      });
      
      if (activeLoans > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Невозможно удалить книгу с активными выдачами'
        });
      }
      
      // Удаление обложки, если она существует
      if (book.cover) {
        const coverPath = path.join(__dirname, '..', book.cover);
        if (fs.existsSync(coverPath)) {
          fs.unlinkSync(coverPath);
        }
      }
      
      await book.destroy({ transaction });
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Книга успешно удалена'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Ошибка при удалении книги:', error);
      next(error);
    }
  };
  
  // Поиск книг
  exports.searchBooks = async (req, res, next) => {
    try {
      const { query, page = 1, limit = 10 } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Параметр поиска не указан'
        });
      }
      
      // Пагинация
      const { offset, limit: limitValue } = paginate(page, limit);
      
      // Поиск книг
      const { count, rows: books } = await Book.findAndCountAll({
        where: {
          [Op.or]: [
            { title: { [Op.like]: `%${query}%` } },
            { author: { [Op.like]: `%${query}%` } },
            { description: { [Op.like]: `%${query}%` } },
            { isbn: { [Op.like]: `%${query}%` } }
          ]
        },
        include: [
          { model: Category, attributes: ['id', 'name'] },
          { model: Language, attributes: ['id', 'name', 'code'] }
        ],
        limit: parseInt(limitValue),
        offset: parseInt(offset),
        order: [['title', 'ASC']]
      });
      
      res.json({
        success: true,
        count,
        totalPages: Math.ceil(count / limitValue),
        currentPage: parseInt(page),
        data: books
      });
    } catch (error) {
      logger.error('Ошибка при поиске книг:', error);
      next(error);
    }
  };
  
  // Получение книг по категории
  exports.getBooksByCategory = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      // Проверка существования категории
      const category = await Category.findByPk(id);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Категория не найдена'
        });
      }
      
      // Пагинация
      const { offset, limit: limitValue } = paginate(page, limit);
      
      // Получение книг
      const { count, rows: books } = await Book.findAndCountAll({
        where: { category_id: id },
        include: [
          { model: Category, attributes: ['id', 'name'] },
          { model: Language, attributes: ['id', 'name', 'code'] }
        ],
        limit: parseInt(limitValue),
        offset: parseInt(offset),
        order: [['title', 'ASC']]
      });
      
      res.json({
        success: true,
        category,
        count,
        totalPages: Math.ceil(count / limitValue),
        currentPage: parseInt(page),
        data: books
      });
    } catch (error) {
      logger.error('Ошибка при получении книг по категории:', error);
      next(error);
    }
  };
  
  // Получение популярных книг
  exports.getPopularBooks = async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      
      // Получение книг с наибольшим количеством выдач
      const popularBooks = await Book.findAll({
        attributes: {
          include: [
            [sequelize.fn('COUNT', sequelize.col('borrows.id')), 'borrow_count']
          ]
        },
        include: [
          { model: Category, attributes: ['id', 'name'] },
          { 
            model: Borrow,
            attributes: [],
            required: false
          }
        ],
        group: ['Book.id', 'Category.id'],
        order: [[sequelize.literal('borrow_count'), 'DESC']],
        limit: parseInt(limit)
      });
      
      res.json({
        success: true,
        data: popularBooks
      });
    } catch (error) {
      logger.error('Ошибка при получении популярных книг:', error);
      next(error);
    }
  };
  
  // Получение недавно добавленных книг
  exports.getRecentBooks = async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      
      const recentBooks = await Book.findAll({
        include: [
          { model: Category, attributes: ['id', 'name'] },
          { model: Language, attributes: ['id', 'name', 'code'] }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit)
      });
      
      res.json({
        success: true,
        data: recentBooks
      });
    } catch (error) {
      logger.error('Ошибка при получении недавно добавленных книг:', error);
      next(error);
    }
  };
  
  module.exports = exports;