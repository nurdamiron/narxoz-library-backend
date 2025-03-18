const borrowService = require('../services/borrowService');
const logger = require('../utils/logger');

/**
 * Выдача книги пользователю
 * @route POST /api/borrow/books/:id
 */
exports.borrowBook = async (req, res, next) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id; // ID пользователя из middleware аутентификации
    
    const borrow = await borrowService.borrowBook(bookId, userId);
    
    res.status(201).json({
      success: true,
      data: borrow
    });
  } catch (error) {
    logger.error(`Ошибка при выдаче книги (ID книги: ${req.params.id}):`, error);
    
    if (error.message === 'Книга не найдена' || error.message === 'Пользователь не найден') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('недоступна') || 
        error.message.includes('уже взяли') || 
        error.message.includes('лимита выдачи')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Возврат книги
 * @route POST /api/borrow/:id/return
 */
exports.returnBook = async (req, res, next) => {
  try {
    const borrowId = req.params.id;
    const userId = req.user.id;
    const isAdmin = ['admin', 'librarian'].includes(req.user.role);
    
    const borrow = await borrowService.returnBook(borrowId, userId, isAdmin);
    
    res.json({
      success: true,
      data: borrow
    });
  } catch (error) {
    logger.error(`Ошибка при возврате книги (ID выдачи: ${req.params.id}):`, error);
    
    if (error.message === 'Запись о выдаче не найдена') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('уже возвращена') || 
        error.message.includes('нет прав')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Продление срока выдачи
 * @route POST /api/borrow/:id/extend
 */
exports.extendBorrow = async (req, res, next) => {
  try {
    const borrowId = req.params.id;
    const userId = req.user.id;
    const { days } = req.body;
    const isAdmin = ['admin', 'librarian'].includes(req.user.role);
    
    const borrow = await borrowService.extendBorrow(borrowId, userId, days, isAdmin);
    
    res.json({
      success: true,
      data: borrow
    });
  } catch (error) {
    logger.error(`Ошибка при продлении срока выдачи (ID выдачи: ${req.params.id}):`, error);
    
    if (error.message === 'Запись о выдаче не найдена') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('нельзя продлить') || 
        error.message.includes('нет прав')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Получение активных выдач пользователя
 * @route GET /api/borrow/my
 */
exports.getUserBorrows = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, page, limit } = req.query;
    
    const borrows = await borrowService.getUserBorrows(userId, {
      status,
      page,
      limit
    });
    
    res.json({
      success: true,
      ...borrows
    });
  } catch (error) {
    logger.error('Ошибка при получении выданных книг пользователя:', error);
    next(error);
  }
};

/**
 * Получение истории выдач пользователя
 * @route GET /api/borrow/history
 */
exports.getUserBorrowHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    
    const borrows = await borrowService.getUserBorrowHistory(userId, {
      page,
      limit
    });
    
    res.json({
      success: true,
      ...borrows
    });
  } catch (error) {
    logger.error('Ошибка при получении истории выдач пользователя:', error);
    next(error);
  }
};

/**
 * Получение всех выдач (для администратора/библиотекаря)
 * @route GET /api/borrow
 */
exports.getAllBorrows = async (req, res, next) => {
  try {
    // Проверка прав доступа
    if (!['admin', 'librarian'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для выполнения этой операции'
      });
    }
    
    const { status, user_id, book_id, page, limit } = req.query;
    
    const borrows = await borrowService.getAllBorrows({
      status,
      user_id,
      book_id,
      page,
      limit
    });
    
    res.json({
      success: true,
      ...borrows
    });
  } catch (error) {
    logger.error('Ошибка при получении всех выдач:', error);
    next(error);
  }
};

/**
 * Получение просроченных выдач
 * @route GET /api/borrow/overdue
 */
exports.getOverdueBooks = async (req, res, next) => {
  try {
    // Проверка прав доступа
    if (!['admin', 'librarian'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для выполнения этой операции'
      });
    }
    
    const { page, limit } = req.query;
    
    const overdue = await borrowService.getOverdueBooks({
      page,
      limit
    });
    
    res.json({
      success: true,
      ...overdue
    });
  } catch (error) {
    logger.error('Ошибка при получении просроченных выдач:', error);
    next(error);
  }
};

/**
 * Получение статистики по выдачам (для администратора/библиотекаря)
 * @route GET /api/borrow/stats
 */
exports.getBorrowStatistics = async (req, res, next) => {
  try {
    // Проверка прав доступа
    if (!['admin', 'librarian'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для выполнения этой операции'
      });
    }
    
    const { period, start_date, end_date } = req.query;
    
    const stats = await borrowService.getBorrowStatistics({
      period,
      start_date,
      end_date
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Ошибка при получении статистики по выдачам:', error);
    next(error);
  }
};

module.exports = exports;