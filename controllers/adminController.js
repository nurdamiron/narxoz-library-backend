// Продолжение файла controllers/adminController.js

// Получение статистики выдач по времени
exports.getBorrowTimeline = async (req, res, next) => {
    try {
      const { period = 'week', count = 12 } = req.query;
      
      let dateFormat;
      let groupBy;
      let startDate = new Date();
      
      // Определение формата даты и начальной даты в зависимости от периода
      switch (period) {
        case 'day':
          dateFormat = '%Y-%m-%d';
          groupBy = 'day';
          startDate.setDate(startDate.getDate() - count);
          break;
        case 'week':
          dateFormat = '%Y-%u'; // Год-Неделя
          groupBy = 'week';
          startDate.setDate(startDate.getDate() - count * 7);
          break;
        case 'month':
          dateFormat = '%Y-%m';
          groupBy = 'month';
          startDate.setMonth(startDate.getMonth() - count);
          break;
        default:
          dateFormat = '%Y-%m-%d';
          groupBy = 'day';
          startDate.setDate(startDate.getDate() - count);
      }
      
      // Получение статистики выдач
      const borrowTimeline = await Borrow.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('borrow_date'), dateFormat), 'period'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          borrow_date: { [Op.gte]: startDate }
        },
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('borrow_date'), dateFormat)],
        order: [[sequelize.col('borrow_date'), 'ASC']]
      });
      
      res.json({
        success: true,
        data: {
          period,
          timeline: borrowTimeline
        }
      });
    } catch (error) {
      logger.error('Ошибка при получении статистики выдач по времени:', error);
      next(error);
    }
  };
  
  // Получение активности пользователя
  exports.getUserActivity = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;
      
      // Проверка существования пользователя
      const user = await User.findByPk(id, {
        attributes: ['id', 'name', 'email', 'role', 'faculty', 'student_id']
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }
      
      // Получение последних выдач пользователя
      const recentBorrows = await Borrow.findAll({
        where: { user_id: id },
        include: [
          {
            model: Book,
            attributes: ['id', 'title', 'author']
          }
        ],
        order: [['borrow_date', 'DESC']],
        limit: parseInt(limit)
      });
      
      // Получение статистики пользователя
      const totalBorrows = await Borrow.count({
        where: { user_id: id }
      });
      
      const activeBorrows = await Borrow.count({
        where: { 
          user_id: id,
          status: 'active'
        }
      });
      
      const overdueBorrows = await Borrow.count({
        where: {
          user_id: id,
          status: 'active',
          due_date: { [Op.lt]: new Date() }
        }
      });
      
      // Получение категорий, которые пользователь чаще всего читает
      const favoriteCategories = await Category.findAll({
        attributes: [
          'id', 'name',
          [sequelize.fn('COUNT', sequelize.col('Books->Borrows.id')), 'borrow_count']
        ],
        include: [
          {
            model: Book,
            attributes: [],
            include: [
              {
                model: Borrow,
                attributes: [],
                where: { user_id: id }
              }
            ]
          }
        ],
        group: ['Category.id'],
        order: [[sequelize.literal('borrow_count'), 'DESC']],
        limit: 5
      });
      
      res.json({
        success: true,
        data: {
          user,
          stats: {
            totalBorrows,
            activeBorrows,
            overdueBorrows
          },
          recentBorrows,
          favoriteCategories
        }
      });
    } catch (error) {
      logger.error('Ошибка при получении активности пользователя:', error);
      next(error);
    }
  };
  
  // Получение отчета о просроченных выдачах
  exports.getOverdueReport = async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      // Пагинация
      const offset = (page - 1) * limit;
      
      // Текущая дата
      const currentDate = new Date();
      
      // Получение просроченных выдач
      const { count, rows: overdueBorrows } = await Borrow.findAndCountAll({
        where: {
          status: 'active',
          due_date: { [Op.lt]: currentDate }
        },
        include: [
          {
            model: User,
            attributes: ['id', 'name', 'email', 'faculty', 'student_id']
          },
          {
            model: Book,
            attributes: ['id', 'title', 'author', 'isbn']
          }
        ],
        order: [['due_date', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // Расчет дней просрочки для каждой выдачи
      const overdueWithDays = overdueBorrows.map(borrow => {
        const dueDate = new Date(borrow.due_date);
        const diffTime = Math.abs(currentDate - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...borrow.toJSON(),
          days_overdue: diffDays
        };
      });
      
      res.json({
        success: true,
        count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        data: overdueWithDays
      });
    } catch (error) {
      logger.error('Ошибка при получении отчета о просроченных выдачах:', error);
      next(error);
    }
  };
  
  // Получение отчета о состоянии библиотечного фонда
  exports.getLibraryInventoryReport = async (req, res, next) => {
    try {
      // Общее количество книг
      const totalBooks = await Book.count();
      
      // Общее количество экземпляров
      const totalCopies = await Book.sum('total_copies');
      
      // Доступное количество экземпляров
      const availableCopies = await Book.sum('available_copies');
      
      // Процент доступности
      const availabilityPercentage = totalCopies > 0 ? (availableCopies / totalCopies) * 100 : 0;
      
      // Книги, которые закончились (все экземпляры выданы)
      const outOfStockBooks = await Book.count({
        where: { available_copies: 0 }
      });
      
      // Статистика по категориям
      const categoryStats = await Category.findAll({
        attributes: [
          'id', 'name',
          [sequelize.fn('COUNT', sequelize.col('Books.id')), 'book_count'],
          [sequelize.fn('SUM', sequelize.col('Books.total_copies')), 'total_copies'],
          [sequelize.fn('SUM', sequelize.col('Books.available_copies')), 'available_copies']
        ],
        include: [
          {
            model: Book,
            attributes: []
          }
        ],
        group: ['Category.id'],
        order: [[sequelize.literal('book_count'), 'DESC']]
      });
      
      // Преобразование результатов
      const formattedCategoryStats = categoryStats.map(category => {
        const data = category.toJSON();
        const total = parseInt(data.total_copies) || 0;
        const available = parseInt(data.available_copies) || 0;
        
        return {
          ...data,
          total_copies: total,
          available_copies: available,
          availability_percentage: total > 0 ? (available / total) * 100 : 0
        };
      });
      
      res.json({
        success: true,
        data: {
          summary: {
            total_books: totalBooks,
            total_copies: totalCopies,
            available_copies: availableCopies,
            availability_percentage: availabilityPercentage,
            out_of_stock_books: outOfStockBooks
          },
          categories: formattedCategoryStats
        }
      });
    } catch (error) {
      logger.error('Ошибка при получении отчета о состоянии библиотечного фонда:', error);
      next(error);
    }
  };
  
  // Экспорт отчета о выдачах за период
  exports.exportBorrowReport = async (req, res, next) => {
    try {
      const { start_date, end_date, status } = req.query;
      
      // Формирование условия для фильтрации
      const whereClause = {};
      
      if (start_date && end_date) {
        whereClause.borrow_date = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      } else if (start_date) {
        whereClause.borrow_date = {
          [Op.gte]: new Date(start_date)
        };
      } else if (end_date) {
        whereClause.borrow_date = {
          [Op.lte]: new Date(end_date)
        };
      }
      
      if (status) {
        whereClause.status = status;
      }
      
      // Получение выдач за указанный период
      const borrows = await Borrow.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ['id', 'name', 'email', 'faculty', 'student_id']
          },
          {
            model: Book,
            attributes: ['id', 'title', 'author', 'isbn']
          }
        ],
        order: [['borrow_date', 'DESC']]
      });
      
      // Форматирование данных для отчета
      const reportData = borrows.map(borrow => {
        const data = borrow.toJSON();
        
        return {
          id: data.id,
          user_name: data.User.name,
          user_email: data.User.email,
          user_faculty: data.User.faculty,
          student_id: data.User.student_id,
          book_title: data.Book.title,
          book_author: data.Book.author,
          book_isbn: data.Book.isbn,
          borrow_date: data.borrow_date,
          due_date: data.due_date,
          return_date: data.return_date,
          status: data.status
        };
      });
      
      res.json({
        success: true,
        data: reportData,
        meta: {
          start_date: start_date || 'N/A',
          end_date: end_date || 'N/A',
          status: status || 'All',
          total_records: reportData.length
        }
      });
    } catch (error) {
      logger.error('Ошибка при экспорте отчета о выдачах:', error);
      next(error);
    }
  };
  
  module.exports = exports;