const Borrow = require('../models/Borrow');
const Book = require('../models/Book');
const User = require('../models/User');
const Category = require('../models/Category');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Выдача книги пользователю
 */
exports.borrowBook = async (bookId, userId) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Проверяем, существует ли книга и доступна ли для выдачи
    const book = await Book.findByPk(bookId, { transaction });
    
    if (!book) {
      await transaction.rollback();
      throw new Error('Книга не найдена');
    }
    
    if (book.available_copies <= 0) {
      await transaction.rollback();
      throw new Error('Книга в данный момент недоступна');
    }
    
    // Проверяем, не взял ли уже пользователь эту книгу
    const existingBorrow = await Borrow.findOne({
      where: {
        user_id: userId,
        book_id: bookId,
        status: 'active'
      },
      transaction
    });
    
    if (existingBorrow) {
      await transaction.rollback();
      throw new Error('Вы уже взяли эту книгу');
    }
    
    // Получаем информацию о пользователе
    const user = await User.findByPk(userId, { transaction });
    
    // Проверяем, не превышен ли лимит выдачи для пользователя
    const userBorrows = await Borrow.count({
      where: {
        user_id: userId,
        status: 'active'
      },
      transaction
    });
    
    // Определяем лимит выдачи в зависимости от роли пользователя
    const borrowLimit = user.role === 'teacher' ? 10 : 5;
    
    if (userBorrows >= borrowLimit) {
      await transaction.rollback();
      throw new Error(`Вы достигли лимита выдачи книг (${borrowLimit})`);
    }
    
    // Вычисляем дату возврата (14 дней для студентов, 30 для преподавателей)
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (user.role === 'teacher' ? 30 : 14));
    
    // Создаем запись о выдаче
    const borrow = await Borrow.create({
      user_id: userId,
      book_id: bookId,
      borrow_date: borrowDate,
      due_date: dueDate,
      status: 'active'
    }, { transaction });
    
    // Уменьшаем количество доступных экземпляров
    book.available_copies -= 1;
    await book.save({ transaction });
    
    await transaction.commit();
    
    // Получаем полную информацию о выдаче
    const borrowWithDetails = await Borrow.findByPk(borrow.id, {
      include: [
        {
          model: Book,
          include: [{ model: Category }]
        },
        { model: User }
      ]
    });
    
    return borrowWithDetails;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Ошибка при выдаче книги (ID книги: ${bookId}, ID пользователя: ${userId}):`, error);
    throw error;
  }
};

/**
 * Возврат книги
 */
exports.returnBook = async (borrowId, userId, isAdmin = false) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Получаем запись о выдаче
    const borrow = await Borrow.findByPk(borrowId, {
      include: [
        { model: Book },
        { model: User }
      ],
      transaction
    });
    
    if (!borrow) {
      await transaction.rollback();
      throw new Error('Запись о выдаче не найдена');
    }
    
    // Проверяем, что книга не была еще возвращена
    if (borrow.status === 'returned') {
      await transaction.rollback();
      throw new Error('Книга уже возвращена');
    }
    
    // Проверяем, что пользователь возвращает свою книгу или имеет права администратора/библиотекаря
    if (borrow.user_id !== userId && !isAdmin) {
      await transaction.rollback();
      throw new Error('У вас нет прав для выполнения этой операции');
    }
    
    // Обновляем запись о выдаче
    borrow.status = 'returned';
    borrow.return_date = new Date();
    await borrow.save({ transaction });
    
    // Увеличиваем количество доступных экземпляров
    const book = await Book.findByPk(borrow.book_id, { transaction });
    book.available_copies += 1;
    await book.save({ transaction });
    
    await transaction.commit();
    
    return borrow;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Ошибка при возврате книги (ID выдачи: ${borrowId}):`, error);
    throw error;
  }
};

/**
 * Продление срока выдачи
 */
exports.extendBorrow = async (borrowId, userId, days = 7, isAdmin = false) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Получаем запись о выдаче
    const borrow = await Borrow.findByPk(borrowId, {
      include: [
        { model: Book },
        { model: User }
      ],
      transaction
    });
    
    if (!borrow) {
      await transaction.rollback();
      throw new Error('Запись о выдаче не найдена');
    }
    
    // Проверяем, что книга не была еще возвращена
    if (borrow.status !== 'active') {
      await transaction.rollback();
      throw new Error('Нельзя продлить возвращенную или просроченную книгу');
    }
    
    // Проверяем, что пользователь продлевает свою книгу или имеет права администратора/библиотекаря
    if (borrow.user_id !== userId && !isAdmin) {
      await transaction.rollback();
      throw new Error('У вас нет прав для выполнения этой операции');
    }
    
    // Вычисляем новую дату возврата
    const newDueDate = new Date(borrow.due_date);
    newDueDate.setDate(newDueDate.getDate() + days);
    
    // Обновляем запись о выдаче
    await borrow.update({
      due_date: newDueDate
    }, { transaction });
    
    await transaction.commit();
    
    return await Borrow.findByPk(borrow.id, {
      include: [
        { model: Book },
        { model: User }
      ]
    });
  } catch (error) {
    await transaction.rollback();
    logger.error(`Ошибка при продлении срока выдачи (ID выдачи: ${borrowId}):`, error);
    throw error;
  }
};

/**
 * Получение выданных книг пользователя
 */
exports.getUserBorrows = async (userId, options = {}) => {
  try {
    const { status, page = 1, limit = 10 } = options;
    
    // Формируем условие для фильтрации по статусу
    const whereClause = { user_id: userId };
    if (status) {
      whereClause.status = status;
    }
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Получение записей о выдаче
    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Book,
          include: [
            { model: Category, attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['borrow_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Проверка на просроченные выдачи
    const currentDate = new Date();
    const borrowsWithStatus = borrows.map(borrow => {
      const isOverdue = borrow.status === 'active' && new Date(borrow.due_date) < currentDate;
      return {
        ...borrow.toJSON(),
        isOverdue
      };
    });
    
    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: borrowsWithStatus
    };
  } catch (error) {
    logger.error(`Ошибка при получении выданных книг пользователя (ID: ${userId}):`, error);
    throw error;
  }
};

/**
 * Получение всех выдач (для администратора/библиотекаря)
 */
exports.getAllBorrows = async (options = {}) => {
  try {
    const { 
      status, 
      user_id, 
      book_id, 
      page = 1, 
      limit = 10 
    } = options;
    
    // Формируем условие для фильтрации
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (user_id) {
      whereClause.user_id = user_id;
    }
    
    if (book_id) {
      whereClause.book_id = book_id;
    }
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Получение записей о выдаче
    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Book,
          include: [
            { model: Category, attributes: ['id', 'name'] }
          ]
        },
        { 
          model: User,
          attributes: ['id', 'name', 'email', 'role', 'faculty', 'student_id']
        }
      ],
      order: [['borrow_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Проверка на просроченные выдачи
    const currentDate = new Date();
    const borrowsWithStatus = borrows.map(borrow => {
      const isOverdue = borrow.status === 'active' && new Date(borrow.due_date) < currentDate;
      return {
        ...borrow.toJSON(),
        isOverdue
      };
    });
    
    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: borrowsWithStatus
    };
  } catch (error) {
    logger.error('Ошибка при получении всех выдач:', error);
    throw error;
  }
};

/**
 * Получение просроченных выдач
 */
exports.getOverdueBooks = async (options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Текущая дата
    const currentDate = new Date();
    
    // Получение просроченных выдач
    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where: {
        status: 'active',
        due_date: { [Op.lt]: currentDate }
      },
      include: [
        { 
          model: Book,
          include: [
            { model: Category, attributes: ['id', 'name'] }
          ]
        },
        { 
          model: User,
          attributes: ['id', 'name', 'email', 'role', 'faculty', 'student_id']
        }
      ],
      order: [['due_date', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Расчет дней просрочки
    const overdueWithDays = borrows.map(borrow => {
      const dueDate = new Date(borrow.due_date);
      const diffTime = Math.abs(currentDate - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...borrow.toJSON(),
        days_overdue: diffDays
      };
    });
    
    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: overdueWithDays
    };
  } catch (error) {
    logger.error('Ошибка при получении просроченных выдач:', error);
    throw error;
  }
};

module.exports = exports;