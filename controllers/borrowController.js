const Borrow = require('../models/Borrow');
const Book = require('../models/Book');
const User = require('../models/User');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const paginate = require('../utils/pagination');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

// Выдача книги пользователю
exports.borrowBook = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const bookId = req.params.id;
    const userId = req.user.id;
    
    // Проверяем, существует ли книга и доступна ли для выдачи
    const book = await Book.findByPk(bookId, { transaction });
    
    if (!book) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Книга не найдена'
      });
    }
    
    if (book.available_copies <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Книга в данный момент недоступна'
      });
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
      return res.status(400).json({
        success: false,
        message: 'Вы уже взяли эту книгу'
      });
    }
    
    // Проверяем, не превышен ли лимит выдачи для пользователя
    const userBorrows = await Borrow.count({
      where: {
        user_id: userId,
        status: 'active'
      },
      transaction
    });
    
    const borrowLimit = req.user.role === 'teacher' ? 10 : 5; // Разные лимиты для разных ролей
    
    if (userBorrows >= borrowLimit) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Вы достигли лимита выдачи книг (${borrowLimit})`
      });
    }
    
    // Вычисляем дату возврата (14 дней для студентов, 30 дней для преподавателей)
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (req.user.role === 'teacher' ? 30 : 14));
    
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
    
    // Создаем уведомление о выдаче
    await notificationService.createNotification({
      user_id: userId,
      type: 'borrow',
      message: `Вы взяли книгу "${book.title}". Срок возврата: ${dueDate.toLocaleDateString()}`
    });
    
    res.status(201).json({
      success: true,
      data: {
        ...borrow.toJSON(),
        book: {
          id: book.id,
          title: book.title,
          author: book.author
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Ошибка при выдаче книги:', error);
    next(error);
  }
};

// Возврат книги
exports.returnBook = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const borrowId = req.params.id;
    
    // Проверяем, существует ли запись о выдаче
    const borrow = await Borrow.findByPk(borrowId, {
      include: [{ model: Book }],
      transaction
    });
    
    if (!borrow) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Запись о выдаче не найдена'
      });
    }
    
    // Проверяем, что книга не была еще возвращена
    if (borrow.status === 'returned') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Книга уже возвращена'
      });
    }
    
    // Проверяем, что пользователь возвращает свою книгу или имеет права администратора/библиотекаря
    if (borrow.user_id !== req.user.id && 
        !['admin', 'librarian'].includes(req.user.role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для выполнения этой операции'
      });
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
    
    // Создаем уведомление о возврате
    await notificationService.createNotification({
      user_id: borrow.user_id,
      type: 'return',
      message: `Вы вернули книгу "${book.title}"`
    });
    
    res.json({
      success: true,
      data: borrow
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Ошибка при возврате книги:', error);
    next(error);
  }
};

// Продление срока выдачи
exports.extendBorrow = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const borrowId = req.params.id;
    
    // Проверяем, существует ли запись о выдаче
    const borrow = await Borrow.findByPk(borrowId, {
      include: [{ model: Book }],
      transaction
    });
    
    if (!borrow) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Запись о выдаче не найдена'
      });
    }
    
    // Проверяем, что книга не была еще возвращена
    if (borrow.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Нельзя продлить возвращенную или просроченную книгу'
      });
    }
    
    // Проверяем, что пользователь продлевает свою книгу или имеет права администратора/библиотекаря
    if (borrow.user_id !== req.user.id && 
        !['admin', 'librarian'].includes(req.user.role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для выполнения этой операции'
      });
    }
    
    // Проверяем, сколько раз книга уже была продлена (максимум 2 раза)
    const extensionCount = await Borrow.count({
      where: {
        user_id: borrow.user_id,
        book_id: borrow.book_id,
        status: 'returned',
        [Op.and]: [
          { borrow_date: { [Op.gte]: borrow.borrow_date } },
          { return_date: { [Op.lte]: new Date() } }
        ]
      }
    });
    
    if (extensionCount >= 2) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Превышено максимальное количество продлений'
      });
    }
    
    // Вычисляем новую дату возврата (добавляем 7 дней)
    const newDueDate = new Date(borrow.due_date);
    newDueDate.setDate(newDueDate.getDate() + 7);
    
    // Обновляем запись о выдаче
    borrow.due_date = newDueDate;
    await borrow.save({ transaction });
    
    await transaction.commit();
    
    // Создаем уведомление о продлении
    await notificationService.createNotification({
      user_id: borrow.user_id,
      type: 'extension',
      message: `Срок возврата книги "${borrow.Book.title}" продлен до ${newDueDate.toLocaleDateString()}`
    });
    
    res.json({
      success: true,
      data: borrow
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Ошибка при продлении срока выдачи:', error);
    next(error);
  }
};

// Получение выданных книг пользователя
exports.getUserBorrows = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Формируем условие для фильтрации по статусу
    const whereClause = { user_id: userId };
    if (status) {
      whereClause.status = status;
    }
    
    // Пагинация
    const { offset, limit: limitValue } = paginate(page, limit);
    
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
      limit: parseInt(limitValue),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limitValue),
      currentPage: parseInt(page),
      data: borrows
    });
  } catch (error) {
    logger.error('Ошибка при получении выданных книг пользователя:', error);
    next(error);
  }
};

// Получение истории выдач пользователя
exports.getUserBorrowHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // Пагинация
    const { offset, limit: limitValue } = paginate(page, limit);
    
    // Получение записей о выдаче
    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where: { 
        user_id: userId,
        status: 'returned'
      },
      include: [
        { 
          model: Book,
          include: [
            { model: Category, attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['return_date', 'DESC']],
      limit: parseInt(limitValue),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limitValue),
      currentPage: parseInt(page),
      data: borrows
    });
  } catch (error) {
    logger.error('Ошибка при получении истории выдач пользователя:', error);
    next(error);
  }
};

// Получение всех выдач (для администратора/библиотекаря)
exports.getAllBorrows = async (req, res, next) => {
  try {
    const { status, user_id, book_id, page = 1, limit = 10 } = req.query;
    
    // Формируем условие для фильтрации
    const whereClause = {};
    if (status) whereClause.status = status;
    if (user_id) whereClause.user_id = user_id;
    if (book_id) whereClause.book_id = book_id;
    
    // Пагинация
    const { offset, limit: limitValue } = paginate(page, limit);
    
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
      limit: parseInt(limitValue),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limitValue),
      currentPage: parseInt(page),
      data: borrows
    });
  } catch (error) {
    logger.error('Ошибка при получении всех выдач:', error);
    next(error);
  }
};

// Получение просроченных выдач
exports.getOverdueBooks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Пагинация
    const { offset, limit: limitValue } = paginate(page, limit);
    
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
      limit: parseInt(limitValue),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limitValue),
      currentPage: parseInt(page),
      data: borrows
    });
  } catch (error) {
    logger.error('Ошибка при получении просроченных выдач:', error);
    next(error);
  }
};

module.exports = exports;