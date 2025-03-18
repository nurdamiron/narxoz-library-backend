const Borrow = require('../models/Borrow');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const User = require('../models/User');
const Category = require('../models/Category');
const Review = require('../models/Review');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Генерация отчета о просроченных книгах
 * 
 * @param {Object} options - Опции отчета
 * @returns {Promise<Object>} Отчет о просроченных книгах
 */
exports.generateOverdueReport = async (options = {}) => {
  try {
    const { days = 0, faculty, format = 'json' } = options;
    
    // Текущая дата
    const currentDate = new Date();
    
    // Фильтрация по количеству дней просрочки
    let dueDate = new Date();
    if (days > 0) {
      dueDate.setDate(dueDate.getDate() - days);
    }
    
    // Формирование условия для фильтрации
    const whereClause = {
      status: 'active',
      due_date: { [Op.lt]: currentDate }
    };
    
    // Если указана просрочка в днях, добавляем фильтрацию
    if (days > 0) {
      whereClause.due_date = { [Op.lt]: dueDate };
    }
    
    // Получение просроченных выдач
    const overdueLoans = await Borrow.findAll({
      where: whereClause,
      include: [
        {
          model: Book,
          attributes: ['id', 'title', 'author', 'isbn']
        },
        {
          model: User,
          attributes: ['id', 'name', 'email', 'role', 'faculty', 'student_id']
        }
      ],
      order: [['due_date', 'ASC']]
    });
    
    // Фильтрация по факультету, если указан
    let filteredLoans = overdueLoans;
    if (faculty) {
      filteredLoans = overdueLoans.filter(loan => 
        loan.User && loan.User.faculty && loan.User.faculty.toLowerCase() === faculty.toLowerCase()
      );
    }
    
    // Обработка результатов
    const reportData = filteredLoans.map(loan => {
      const dueDate = new Date(loan.due_date);
      const diffTime = Math.abs(currentDate - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        id: loan.id,
        book: {
          id: loan.Book.id,
          title: loan.Book.title,
          author: loan.Book.author,
          isbn: loan.Book.isbn
        },
        user: {
          id: loan.User.id,
          name: loan.User.name,
          email: loan.User.email,
          role: loan.User.role,
          faculty: loan.User.faculty,
          student_id: loan.User.student_id
        },
        borrow_date: loan.borrow_date,
        due_date: loan.due_date,
        days_overdue: diffDays
      };
    });
    
    // Группировка по факультетам для статистики
    const facultyStats = {};
    filteredLoans.forEach(loan => {
      const faculty = loan.User.faculty || 'Не указан';
      if (!facultyStats[faculty]) {
        facultyStats[faculty] = {
          count: 0,
          users: new Set()
        };
      }
      
      facultyStats[faculty].count += 1;
      facultyStats[faculty].users.add(loan.User.id);
    });
    
    // Преобразование статистики по факультетам
    const formattedFacultyStats = Object.keys(facultyStats).map(faculty => ({
      faculty,
      overdue_count: facultyStats[faculty].count,
      unique_users: facultyStats[faculty].users.size
    }));
    
    // Формирование отчета
    const report = {
      generated_at: new Date().toISOString(),
      total_overdue: filteredLoans.length,
      days_filter: days > 0 ? days : null,
      faculty_filter: faculty || null,
      faculty_stats: formattedFacultyStats,
      items: reportData
    };
    
    // Экспорт в нужном формате
    if (format === 'csv') {
      // Реализация экспорта в CSV
      return this.exportToCsv(reportData, 'overdue_report', [
        { header: 'ID', key: 'id' },
        { header: 'Книга', key: 'book.title' },
        { header: 'Автор', key: 'book.author' },
        { header: 'ISBN', key: 'book.isbn' },
        { header: 'Пользователь', key: 'user.name' },
        { header: 'Email', key: 'user.email' },
        { header: 'Роль', key: 'user.role' },
        { header: 'Факультет', key: 'user.faculty' },
        { header: 'Студенческий ID', key: 'user.student_id' },
        { header: 'Дата выдачи', key: 'borrow_date' },
        { header: 'Срок возврата', key: 'due_date' },
        { header: 'Дней просрочки', key: 'days_overdue' }
      ]);
    }
    
    return report;
  } catch (error) {
    logger.error('Ошибка при генерации отчета о просроченных книгах:', error);
    throw error;
  }
};

/**
 * Генерация отчета о состоянии библиотечного фонда
 * 
 * @param {Object} options - Опции отчета
 * @returns {Promise<Object>} Отчет о состоянии библиотечного фонда
 */
exports.generateInventoryReport = async (options = {}) => {
  try {
    const { category_id, format = 'json' } = options;
    
    // Формирование условия для фильтрации
    const whereClause = {};
    if (category_id) {
      whereClause.category_id = category_id;
    }
    
    // Получение информации о книгах
    const books = await Book.findAll({
      where: whereClause,
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { 
          model: BookCopy,
          attributes: ['id', 'status', 'condition']
        }
      ],
      order: [['title', 'ASC']]
    });
    
    // Общие показатели
    let totalBooks = books.length;
    let totalCopies = 0;
    let availableCopies = 0;
    let borrowedCopies = 0;
    let damagedCopies = 0;
    let lostCopies = 0;
    
    // Статистика по категориям
    const categoryStats = {};
    
    // Обработка книг и подсчет статистики
    const reportItems = books.map(book => {
      // Подсчет экземпляров по статусам
      const copyStats = {
        total: book.BookCopies.length,
        available: 0,
        borrowed: 0,
        reserved: 0,
        damaged: 0,
        lost: 0,
        in_processing: 0
      };
      
      book.BookCopies.forEach(copy => {
        copyStats[copy.status] += 1;
        
        // Увеличение общих счетчиков
        totalCopies += 1;
        if (copy.status === 'available') availableCopies += 1;
        if (copy.status === 'borrowed') borrowedCopies += 1;
        if (copy.status === 'damaged') damagedCopies += 1;
        if (copy.status === 'lost') lostCopies += 1;
      });
      
      // Обновление статистики по категориям
      const categoryName = book.Category ? book.Category.name : 'Без категории';
      const categoryId = book.Category ? book.Category.id : 0;
      
      if (!categoryStats[categoryId]) {
        categoryStats[categoryId] = {
          id: categoryId,
          name: categoryName,
          books_count: 0,
          copies_count: 0,
          available_copies: 0
        };
      }
      
      categoryStats[categoryId].books_count += 1;
      categoryStats[categoryId].copies_count += copyStats.total;
      categoryStats[categoryId].available_copies += copyStats.available;
      
      // Формирование данных о книге
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        category: book.Category ? {
          id: book.Category.id,
          name: book.Category.name
        } : null,
        publication_year: book.publication_year,
        copies: copyStats,
        availability_percentage: copyStats.total > 0 ? 
          (copyStats.available / copyStats.total * 100).toFixed(2) : 0
      };
    });
    
    // Формирование отчета
    const report = {
      generated_at: new Date().toISOString(),
      summary: {
        total_books: totalBooks,
        total_copies: totalCopies,
        available_copies: availableCopies,
        borrowed_copies: borrowedCopies,
        damaged_copies: damagedCopies,
        lost_copies: lostCopies,
        availability_percentage: totalCopies > 0 ? 
          (availableCopies / totalCopies * 100).toFixed(2) : 0
      },
      categories: Object.values(categoryStats),
      items: reportItems
    };
    
    // Экспорт в нужном формате
    if (format === 'csv') {
      // Реализация экспорта в CSV
      return this.exportToCsv(reportItems, 'inventory_report', [
        { header: 'ID', key: 'id' },
        { header: 'Название', key: 'title' },
        { header: 'Автор', key: 'author' },
        { header: 'ISBN', key: 'isbn' },
        { header: 'Категория', key: 'category.name' },
        { header: 'Год издания', key: 'publication_year' },
        { header: 'Всего экземпляров', key: 'copies.total' },
        { header: 'Доступно', key: 'copies.available' },
        { header: 'Выдано', key: 'copies.borrowed' },
        { header: 'Повреждено', key: 'copies.damaged' },
        { header: 'Утеряно', key: 'copies.lost' },
        { header: '% доступности', key: 'availability_percentage' }
      ]);
    }
    
    return report;
  } catch (error) {
    logger.error('Ошибка при генерации отчета о состоянии библиотечного фонда:', error);
    throw error;
  }
};

/**
 * Генерация отчета о выдачах за период
 * 
 * @param {Object} options - Опции отчета
 * @returns {Promise<Object>} Отчет о выдачах
 */
exports.generateBorrowReport = async (options = {}) => {
  try {
    const { 
      start_date, 
      end_date, 
      user_id, 
      book_id, 
      category_id,
      format = 'json' 
    } = options;
    
    // Формирование условий для фильтрации
    const borrowWhereClause = {};
    
    if (start_date || end_date) {
      borrowWhereClause.borrow_date = {};
      
      if (start_date) {
        borrowWhereClause.borrow_date[Op.gte] = new Date(start_date);
      }
      
      if (end_date) {
        borrowWhereClause.borrow_date[Op.lte] = new Date(end_date);
      }
    }
    
    if (user_id) {
      borrowWhereClause.user_id = user_id;
    }
    
    if (book_id) {
      borrowWhereClause.book_id = book_id;
    }
    
    // Формирование условий для фильтрации книг по категории
    const bookWhereClause = {};
    if (category_id) {
      bookWhereClause.category_id = category_id;
    }
    
    // Получение данных о выдачах
    const borrows = await Borrow.findAll({
      where: borrowWhereClause,
      include: [
        {
          model: Book,
          where: Object.keys(bookWhereClause).length > 0 ? bookWhereClause : undefined,
          include: [
            { model: Category, attributes: ['id', 'name'] }
          ]
        },
        {
          model: User,
          attributes: ['id', 'name', 'email', 'role', 'faculty', 'student_id']
        }
      ],
      order: [['borrow_date', 'DESC']]
    });
    
    // Обработка данных о выдачах
    const reportItems = borrows.map(borrow => {
      // Расчет количества дней пользования книгой
      const borrowDate = new Date(borrow.borrow_date);
      const returnDate = borrow.return_date ? new Date(borrow.return_date) : new Date();
      const diffTime = Math.abs(returnDate - borrowDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        id: borrow.id,
        book: {
          id: borrow.Book.id,
          title: borrow.Book.title,
          author: borrow.Book.author,
          isbn: borrow.Book.isbn,
          category: borrow.Book.Category ? {
            id: borrow.Book.Category.id,
            name: borrow.Book.Category.name
          } : null
        },
        user: {
          id: borrow.User.id,
          name: borrow.User.name,
          email: borrow.User.email,
          role: borrow.User.role,
          faculty: borrow.User.faculty,
          student_id: borrow.User.student_id
        },
        borrow_date: borrow.borrow_date,
        due_date: borrow.due_date,
        return_date: borrow.return_date,
        status: borrow.status,
        borrow_days: diffDays,
        is_overdue: borrow.status === 'active' && new Date(borrow.due_date) < new Date()
      };
    });
    
    // Сбор статистики
    const summary = {
      total_borrows: borrows.length,
      returned: borrows.filter(b => b.status === 'returned').length,
      active: borrows.filter(b => b.status === 'active').length,
      overdue: borrows.filter(b => 
        b.status === 'active' && new Date(b.due_date) < new Date()
      ).length
    };
    
    // Статистика по категориям
    const categoryStats = {};
    borrows.forEach(borrow => {
      if (!borrow.Book.Category) return;
      
      const categoryId = borrow.Book.Category.id;
      const categoryName = borrow.Book.Category.name;
      
      if (!categoryStats[categoryId]) {
        categoryStats[categoryId] = {
          id: categoryId,
          name: categoryName,
          borrow_count: 0
        };
      }
      
      categoryStats[categoryId].borrow_count += 1;
    });
    
    // Статистика по пользователям
    const userStats = {};
    borrows.forEach(borrow => {
      const userId = borrow.User.id;
      const userName = borrow.User.name;
      
      if (!userStats[userId]) {
        userStats[userId] = {
          id: userId,
          name: userName,
          borrow_count: 0
        };
      }
      
      userStats[userId].borrow_count += 1;
    });
    
    // Статистика по ролям пользователей
    const roleStats = {};
    borrows.forEach(borrow => {
      const role = borrow.User.role || 'Не указана';
      
      if (!roleStats[role]) {
        roleStats[role] = 0;
      }
      
      roleStats[role] += 1;
    });
    
    // Формирование отчета
    const report = {
      generated_at: new Date().toISOString(),
      period: {
        start: start_date || 'All time',
        end: end_date || 'Current date'
      },
      filters: {
        user_id: user_id || null,
        book_id: book_id || null,
        category_id: category_id || null
      },
      summary,
      category_stats: Object.values(categoryStats),
      top_users: Object.values(userStats).sort((a, b) => b.borrow_count - a.borrow_count).slice(0, 10),
      role_stats: Object.entries(roleStats).map(([role, count]) => ({ role, count })),
      items: reportItems
    };
    
    // Экспорт в нужном формате
    if (format === 'csv') {
      // Реализация экспорта в CSV
      return this.exportToCsv(reportItems, 'borrow_report', [
        { header: 'ID', key: 'id' },
        { header: 'Книга', key: 'book.title' },
        { header: 'Автор', key: 'book.author' },
        { header: 'ISBN', key: 'book.isbn' },
        { header: 'Категория', key: 'book.category.name' },
        { header: 'Пользователь', key: 'user.name' },
        { header: 'Email', key: 'user.email' },
        { header: 'Роль', key: 'user.role' },
        { header: 'Факультет', key: 'user.faculty' },
        { header: 'Студенческий ID', key: 'user.student_id' },
        { header: 'Дата выдачи', key: 'borrow_date' },
        { header: 'Срок возврата', key: 'due_date' },
        { header: 'Дата возврата', key: 'return_date' },
        { header: 'Статус', key: 'status' },
        { header: 'Дней пользования', key: 'borrow_days' },
        { header: 'Просрочена', key: 'is_overdue' }
      ]);
    }
    
    return report;
  } catch (error) {
    logger.error('Ошибка при генерации отчета о выдачах:', error);
    throw error;
  }
};

/**
 * Генерация отчета об активности пользователей
 * 
 * @param {Object} options - Опции отчета
 * @returns {Promise<Object>} Отчет об активности пользователей
 */
exports.generateUserActivityReport = async (options = {}) => {
  try {
    const { 
      start_date, 
      end_date, 
      role,
      faculty,
      format = 'json' 
    } = options;
    
    // Формирование условий для фильтрации пользователей
    const userWhereClause = {};
    
    if (role) {
      userWhereClause.role = role;
    }
    
    if (faculty) {
      userWhereClause.faculty = faculty;
    }
    
    // Формирование условий для фильтрации выдач по датам
    const borrowWhereClause = {};
    
    if (start_date || end_date) {
      borrowWhereClause.borrow_date = {};
      
      if (start_date) {
        borrowWhereClause.borrow_date[Op.gte] = new Date(start_date);
      }
      
      if (end_date) {
        borrowWhereClause.borrow_date[Op.lte] = new Date(end_date);
      }
    }
    
    // Получение пользователей с их выдачами
    const users = await User.findAll({
      where: userWhereClause,
      include: [
        {
          model: Borrow,
          where: Object.keys(borrowWhereClause).length > 0 ? borrowWhereClause : undefined,
          required: false,
          include: [
            { model: Book, include: [{ model: Category }] }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });
    
    // Обработка данных пользователей
    const reportItems = users.map(user => {
      // Подсчет выдач
      const borrows = user.Borrows || [];
      const totalBorrows = borrows.length;
      const activeBorrows = borrows.filter(b => b.status === 'active').length;
      const overdueBorrows = borrows.filter(b => 
        b.status === 'active' && new Date(b.due_date) < new Date()
      ).length;
      
      // Подсчет категорий
      const categories = {};
      borrows.forEach(borrow => {
        if (!borrow.Book || !borrow.Book.Category) return;
        
        const categoryId = borrow.Book.Category.id;
        const categoryName = borrow.Book.Category.name;
        
        if (!categories[categoryId]) {
          categories[categoryId] = {
            id: categoryId,
            name: categoryName,
            count: 0
          };
        }
        
        categories[categoryId].count += 1;
      });
      
      // Сортировка категорий по популярности
      const favoriteCategories = Object.values(categories)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        faculty: user.faculty,
        student_id: user.student_id,
        stats: {
          total_borrows: totalBorrows,
          active_borrows: activeBorrows,
          overdue_borrows: overdueBorrows,
          favorite_categories: favoriteCategories
        }
      };
    });
    
    // Фильтрация пользователей без выдач, если требуется только активные
    const filteredItems = options.active_only ? 
      reportItems.filter(item => item.stats.total_borrows > 0) : 
      reportItems;
    
    // Сортировка по активности (количеству выдач)
    const sortedItems = filteredItems.sort(
      (a, b) => b.stats.total_borrows - a.stats.total_borrows
    );
    
    // Статистика по ролям
    const roleStats = {};
    sortedItems.forEach(item => {
      const role = item.role || 'Не указана';
      
      if (!roleStats[role]) {
        roleStats[role] = {
          total_users: 0,
          total_borrows: 0,
          active_borrows: 0,
          overdue_borrows: 0
        };
      }
      
      roleStats[role].total_users += 1;
      roleStats[role].total_borrows += item.stats.total_borrows;
      roleStats[role].active_borrows += item.stats.active_borrows;
      roleStats[role].overdue_borrows += item.stats.overdue_borrows;
    });
    
    // Статистика по факультетам
    const facultyStats = {};
    sortedItems.forEach(item => {
      const faculty = item.faculty || 'Не указан';
      
      if (!facultyStats[faculty]) {
        facultyStats[faculty] = {
          total_users: 0,
          total_borrows: 0,
          active_borrows: 0,
          overdue_borrows: 0
        };
      }
      
      facultyStats[faculty].total_users += 1;
      facultyStats[faculty].total_borrows += item.stats.total_borrows;
      facultyStats[faculty].active_borrows += item.stats.active_borrows;
      facultyStats[faculty].overdue_borrows += item.stats.overdue_borrows;
    });
    
    // Формирование отчета
    const report = {
      generated_at: new Date().toISOString(),
      period: {
        start: start_date || 'All time',
        end: end_date || 'Current date'
      },
      filters: {
        role: role || null,
        faculty: faculty || null,
        active_only: options.active_only || false
      },
      summary: {
        total_users: sortedItems.length,
        total_borrows: sortedItems.reduce((sum, item) => sum + item.stats.total_borrows, 0),
        active_borrows: sortedItems.reduce((sum, item) => sum + item.stats.active_borrows, 0),
        overdue_borrows: sortedItems.reduce((sum, item) => sum + item.stats.overdue_borrows, 0)
      },
      role_stats: Object.entries(roleStats).map(([role, stats]) => ({ role, ...stats })),
      faculty_stats: Object.entries(facultyStats).map(([faculty, stats]) => ({ faculty, ...stats })),
      items: sortedItems
    };
    
    // Экспорт в нужном формате
    if (format === 'csv') {
      // Реализация экспорта в CSV
      return this.exportToCsv(sortedItems, 'user_activity_report', [
        { header: 'ID', key: 'id' },
        { header: 'Имя', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Роль', key: 'role' },
        { header: 'Факультет', key: 'faculty' },
        { header: 'Студенческий ID', key: 'student_id' },
        { header: 'Всего выдач', key: 'stats.total_borrows' },
        { header: 'Активные выдачи', key: 'stats.active_borrows' },
        { header: 'Просроченные выдачи', key: 'stats.overdue_borrows' }
      ]);
    }
    
    return report;
  } catch (error) {
    logger.error('Ошибка при генерации отчета об активности пользователей:', error);
    throw error;
  }
};

/**
 * Экспорт данных в CSV формат
 * 
 * @param {Array} data - Массив данных для экспорта
 * @param {string} filename - Имя файла
 * @param {Array} columns - Описание колонок
 * @returns {Object} Объект с данными для экспорта
 */
exports.exportToCsv = (data, filename, columns) => {
  try {
    // Заголовок CSV
    let csv = columns.map(col => `"${col.header}"`).join(',') + '\n';
    
    // Данные CSV
    data.forEach(item => {
      const row = columns.map(col => {
        // Получение значения по пути (например, 'user.name')
        const path = col.key.split('.');
        let value = item;
        
        for (const key of path) {
          if (value === null || value === undefined) {
            value = '';
            break;
          }
          value = value[key];
        }
        
        // Обработка пустых значений
        if (value === null || value === undefined) {
          value = '';
        }
        
        // Экранирование кавычек
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
        }
        
        return `"${value}"`;
      }).join(',');
      
      csv += row + '\n';
    });
    
    return {
      filename: `${filename}_${new Date().toISOString().substring(0, 10)}.csv`,
      content: csv,
      contentType: 'text/csv'
    };
  } catch (error) {
    logger.error('Ошибка при экспорте данных в CSV:', error);
    throw error;
  }
};

module.exports = exports;