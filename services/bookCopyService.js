const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Получение всех экземпляров книги
 * 
 * @param {number} bookId - ID книги
 * @param {Object} options - Опции запроса
 * @returns {Promise<Object>} Объект с экземплярами книги
 */
exports.getBookCopies = async (bookId, options = {}) => {
  try {
    const { status, condition, page = 1, limit = 10 } = options;
    
    // Проверка существования книги
    const book = await Book.findByPk(bookId);
    
    if (!book) {
      throw new Error('Книга не найдена');
    }
    
    // Формирование условия для фильтрации
    const whereClause = { book_id: bookId };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (condition) {
      whereClause.condition = condition;
    }
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Получение экземпляров книги
    const { count, rows: copies } = await BookCopy.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return {
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        total_copies: book.total_copies,
        available_copies: book.available_copies
      },
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: copies
    };
  } catch (error) {
    logger.error(`Ошибка при получении экземпляров книги (ID книги: ${bookId}):`, error);
    throw error;
  }
};

/**
 * Получение экземпляра книги по ID
 * 
 * @param {number} copyId - ID экземпляра
 * @returns {Promise<Object>} Информация об экземпляре книги
 */
exports.getBookCopyById = async (copyId) => {
  try {
    const bookCopy = await BookCopy.findByPk(copyId, {
      include: [{ model: Book }]
    });
    
    if (!bookCopy) {
      throw new Error('Экземпляр книги не найден');
    }
    
    return bookCopy;
  } catch (error) {
    logger.error(`Ошибка при получении экземпляра книги по ID (${copyId}):`, error);
    throw error;
  }
};

/**
 * Создание экземпляра книги
 * 
 * @param {number} bookId - ID книги
 * @param {Object} copyData - Данные экземпляра
 * @returns {Promise<Object>} Созданный экземпляр книги
 */
exports.createBookCopy = async (bookId, copyData) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Проверка существования книги
    const book = await Book.findByPk(bookId, { transaction });
    
    if (!book) {
      throw new Error('Книга не найдена');
    }
    
    // Генерация инвентарного номера, если не указан
    const inventoryNumber = copyData.inventory_number || `${bookId}-${Date.now()}`;
    
    // Создание экземпляра книги
    const bookCopy = await BookCopy.create({
      book_id: bookId,
      inventory_number: inventoryNumber,
      status: copyData.status || 'available',
      condition: copyData.condition || 'good',
      location: copyData.location,
      acquisition_date: copyData.acquisition_date || new Date(),
      notes: copyData.notes
    }, { transaction });
    
    // Обновление количества экземпляров книги
    book.total_copies += 1;
    
    // Если статус "available", то увеличиваем количество доступных экземпляров
    if (bookCopy.status === 'available') {
      book.available_copies += 1;
    }
    
    await book.save({ transaction });
    
    await transaction.commit();
    return bookCopy;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Ошибка при создании экземпляра книги (ID книги: ${bookId}):`, error);
    throw error;
  }
};

/**
 * Обновление экземпляра книги
 * 
 * @param {number} copyId - ID экземпляра
 * @param {Object} copyData - Данные для обновления
 * @returns {Promise<Object>} Обновленный экземпляр книги
 */
exports.updateBookCopy = async (copyId, copyData) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Получение экземпляра книги
    const bookCopy = await BookCopy.findByPk(copyId, { 
      include: [{ model: Book }],
      transaction 
    });
    
    if (!bookCopy) {
      throw new Error('Экземпляр книги не найден');
    }
    
    // Проверка изменения статуса
    const oldStatus = bookCopy.status;
    const newStatus = copyData.status || oldStatus;
    
    // Обновление экземпляра книги
    await bookCopy.update({
      inventory_number: copyData.inventory_number || bookCopy.inventory_number,
      status: newStatus,
      condition: copyData.condition || bookCopy.condition,
      location: copyData.location !== undefined ? copyData.location : bookCopy.location,
      notes: copyData.notes !== undefined ? copyData.notes : bookCopy.notes
    }, { transaction });
    
    // Обновление количества доступных экземпляров книги при изменении статуса
    if (oldStatus !== newStatus) {
      const book = bookCopy.Book;
      
      // Если статус изменился с доступно на недоступно
      if (oldStatus === 'available' && newStatus !== 'available') {
        book.available_copies = Math.max(0, book.available_copies - 1);
      }
      // Если статус изменился с недоступно на доступно
      else if (oldStatus !== 'available' && newStatus === 'available') {
        book.available_copies += 1;
      }
      
      await book.save({ transaction });
    }
    
    await transaction.commit();
    
    // Получение обновленного экземпляра с информацией о книге
    const updatedCopy = await BookCopy.findByPk(copyId, {
      include: [{ model: Book }]
    });
    
    return updatedCopy;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Ошибка при обновлении экземпляра книги (ID: ${copyId}):`, error);
    throw error;
  }
};

/**
 * Удаление экземпляра книги
 * 
 * @param {number} copyId - ID экземпляра
 * @returns {Promise<boolean>} Результат операции
 */
exports.deleteBookCopy = async (copyId) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Получение экземпляра книги
    const bookCopy = await BookCopy.findByPk(copyId, { 
      include: [{ model: Book }],
      transaction 
    });
    
    if (!bookCopy) {
      throw new Error('Экземпляр книги не найден');
    }
    
    // Проверка, не выдан ли экземпляр
    if (bookCopy.status === 'borrowed') {
      throw new Error('Невозможно удалить выданный экземпляр книги');
    }
    
    // Обновление количества экземпляров книги
    const book = bookCopy.Book;
    book.total_copies -= 1;
    
    // Если экземпляр был доступен, уменьшаем количество доступных экземпляров
    if (bookCopy.status === 'available') {
      book.available_copies = Math.max(0, book.available_copies - 1);
    }
    
    await book.save({ transaction });
    
    // Удаление экземпляра книги
    await bookCopy.destroy({ transaction });
    
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Ошибка при удалении экземпляра книги (ID: ${copyId}):`, error);
    throw error;
  }
};

/**
 * Получение списка всех экземпляров книг с фильтрацией
 * 
 * @param {Object} options - Параметры запроса
 * @returns {Promise<Object>} Список экземпляров с пагинацией
 */
exports.getAllBookCopies = async (options = {}) => {
  try {
    const { 
      status, 
      condition, 
      location,
      book_id,
      page = 1, 
      limit = 10 
    } = options;
    
    // Формирование условия для фильтрации
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (condition) {
      whereClause.condition = condition;
    }
    
    if (location) {
      whereClause.location = { [Op.like]: `%${location}%` };
    }
    
    if (book_id) {
      whereClause.book_id = book_id;
    }
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Получение экземпляров книг
    const { count, rows: copies } = await BookCopy.findAndCountAll({
      where: whereClause,
      include: [{ 
        model: Book,
        attributes: ['id', 'title', 'author', 'isbn'] 
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: copies
    };
  } catch (error) {
    logger.error('Ошибка при получении списка экземпляров книг:', error);
    throw error;
  }
};

/**
 * Массовое обновление статуса экземпляров книг
 * 
 * @param {Array<number>} copyIds - Массив ID экземпляров
 * @param {string} newStatus - Новый статус
 * @returns {Promise<number>} Количество обновленных экземпляров
 */
exports.bulkUpdateStatus = async (copyIds, newStatus) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (!Array.isArray(copyIds) || copyIds.length === 0) {
      throw new Error('Необходимо указать массив ID экземпляров книг');
    }
    
    // Проверка валидности нового статуса
    const validStatuses = ['available', 'borrowed', 'reserved', 'lost', 'damaged', 'in_processing'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Недопустимый статус экземпляра');
    }
    
    // Получение текущих экземпляров для обновления количества доступных книг
    const copies = await BookCopy.findAll({
      where: { id: { [Op.in]: copyIds } },
      include: [{ model: Book }],
      transaction
    });
    
    // Группировка экземпляров по книгам и статусам для учета изменений
    const bookUpdates = {};
    
    copies.forEach(copy => {
      const bookId = copy.book_id;
      if (!bookUpdates[bookId]) {
        bookUpdates[bookId] = {
          book: copy.Book,
          statusChanges: {
            fromAvailable: 0,
            toAvailable: 0
          }
        };
      }
      
      // Учет изменений статусов
      if (copy.status === 'available' && newStatus !== 'available') {
        bookUpdates[bookId].statusChanges.fromAvailable += 1;
      } else if (copy.status !== 'available' && newStatus === 'available') {
        bookUpdates[bookId].statusChanges.toAvailable += 1;
      }
    });
    
    // Обновление статуса экземпляров
    const [updatedCount] = await BookCopy.update(
      { status: newStatus },
      { 
        where: { id: { [Op.in]: copyIds } },
        transaction
      }
    );
    
    // Обновление количества доступных экземпляров книг
    for (const bookId in bookUpdates) {
      const { book, statusChanges } = bookUpdates[bookId];
      const netChange = statusChanges.toAvailable - statusChanges.fromAvailable;
      
      if (netChange !== 0) {
        book.available_copies = Math.max(0, book.available_copies + netChange);
        await book.save({ transaction });
      }
    }
    
    await transaction.commit();
    return updatedCount;
  } catch (error) {
    await transaction.rollback();
    logger.error('Ошибка при массовом обновлении статуса экземпляров книг:', error);
    throw error;
  }
};