const Book = require('../models/Book');
const Category = require('../models/Category');
const Language = require('../models/Language');
const BookCopy = require('../models/BookCopy');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

/**
 * Получение всех книг с фильтрацией и пагинацией
 */
exports.getAllBooks = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      language,
      year,
      author,
      available
    } = options;

    // Формирование условия для фильтрации
    const whereClause = {};
    if (category) whereClause.category_id = category;
    if (language) whereClause.language_id = language;
    if (year) whereClause.publication_year = year;
    if (author) whereClause.author = { [Op.like]: `%${author}%` };
    if (available === true) whereClause.available_copies = { [Op.gt]: 0 };

    // Пагинация
    const offset = (page - 1) * limit;

    // Получение книг
    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Language, attributes: ['id', 'name', 'code'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['title', 'ASC']]
    });

    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: books
    };
  } catch (error) {
    logger.error('Ошибка при получении списка книг:', error);
    throw error;
  }
};

/**
 * Получение книги по ID
 */
exports.getBookById = async (id) => {
  try {
    const book = await Book.findByPk(id, {
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Language, attributes: ['id', 'name', 'code'] }
      ]
    });

    if (!book) {
      throw new Error('Книга не найдена');
    }

    return book;
  } catch (error) {
    logger.error(`Ошибка при получении книги по ID (${id}):`, error);
    throw error;
  }
};

/**
 * Создание новой книги
 */
exports.createBook = async (bookData, fileData = null) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Проверка наличия основных данных
    if (!bookData.title || !bookData.author) {
      throw new Error('Название и автор книги обязательны');
    }

    // Обработка файла обложки, если загружен
    let coverPath = null;
    if (fileData) {
      coverPath = `/uploads/books/${fileData.filename}`;
    }

    // Создание книги
    const book = await Book.create({
      title: bookData.title,
      author: bookData.author,
      description: bookData.description,
      cover: coverPath,
      category_id: bookData.category_id,
      language_id: bookData.language_id,
      publication_year: bookData.publication_year,
      total_copies: bookData.total_copies || 1,
      available_copies: bookData.available_copies || bookData.total_copies || 1,
      isbn: bookData.isbn
    }, { transaction });

    await transaction.commit();
    
    // Получение полной информации о созданной книге
    const createdBook = await this.getBookById(book.id);
    return createdBook;
  } catch (error) {
    await transaction.rollback();
    logger.error('Ошибка при создании книги:', error);
    throw error;
  }
};

/**
 * Обновление книги
 */
exports.updateBook = async (id, bookData, fileData = null) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Получение книги
    const book = await Book.findByPk(id, { transaction });
    
    if (!book) {
      throw new Error('Книга не найдена');
    }

    // Обработка файла обложки, если загружен новый
    let coverPath = book.cover;
    if (fileData) {
      // Удаление старой обложки, если она существует
      if (book.cover) {
        const oldCoverPath = path.join(__dirname, '..', book.cover);
        if (fs.existsSync(oldCoverPath)) {
          fs.unlinkSync(oldCoverPath);
        }
      }
      
      coverPath = `/uploads/books/${fileData.filename}`;
    }

    // Проверка логики доступных экземпляров
    let availableCopies = book.available_copies;
    
    // Если меняется общее количество экземпляров
    if (bookData.total_copies !== undefined) {
      const newTotal = parseInt(bookData.total_copies);
      const currentBorrowed = book.total_copies - book.available_copies;
      
      // Новое количество доступных = новое общее минус текущие выданные
      availableCopies = Math.max(0, newTotal - currentBorrowed);
    }
    
    // Если также явно указано новое количество доступных
    if (bookData.available_copies !== undefined) {
      availableCopies = parseInt(bookData.available_copies);
    }

    // Обновление книги
    await book.update({
      title: bookData.title || book.title,
      author: bookData.author || book.author,
      description: bookData.description !== undefined ? bookData.description : book.description,
      cover: coverPath,
      category_id: bookData.category_id !== undefined ? bookData.category_id : book.category_id,
      language_id: bookData.language_id !== undefined ? bookData.language_id : book.language_id,
      publication_year: bookData.publication_year !== undefined ? bookData.publication_year : book.publication_year,
      total_copies: bookData.total_copies !== undefined ? bookData.total_copies : book.total_copies,
      available_copies: availableCopies,
      isbn: bookData.isbn !== undefined ? bookData.isbn : book.isbn
    }, { transaction });

    await transaction.commit();

    // Получение полной информации об обновленной книге
    const updatedBook = await this.getBookById(id);
    return updatedBook;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Ошибка при обновлении книги (ID: ${id}):`, error);
    throw error;
  }
};

/**
 * Удаление книги
 */
exports.deleteBook = async (id) => {
  const transaction = await sequelize.transaction();
  
  try {
    const book = await Book.findByPk(id, { transaction });
    
    if (!book) {
      throw new Error('Книга не найдена');
    }
    
    // Удаление обложки, если она существует
    if (book.cover) {
      const coverPath = path.join(__dirname, '..', book.cover);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }
    
    // Удаление книги
    await book.destroy({ transaction });
    
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Ошибка при удалении книги (ID: ${id}):`, error);
    throw error;
  }
};

/**
 * Поиск книг
 */
exports.searchBooks = async (query, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    
    if (!query) {
      throw new Error('Поисковый запрос не указан');
    }
    
    // Пагинация
    const offset = (page - 1) * limit;
    
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
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['title', 'ASC']]
    });
    
    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: books
    };
  } catch (error) {
    logger.error('Ошибка при поиске книг:', error);
    throw error;
  }
};

/**
 * Получение популярных книг
 */
exports.getPopularBooks = async (limit = 10) => {
  try {
    // Получение книг с наибольшим количеством выдач
    const popularBooks = await Book.findAll({
      attributes: {
        include: [
          [sequelize.fn('COUNT', sequelize.col('Borrows.id')), 'borrow_count']
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
    
    return popularBooks;
  } catch (error) {
    logger.error('Ошибка при получении популярных книг:', error);
    throw error;
  }
};

/**
 * Получение недавно добавленных книг
 */
exports.getRecentBooks = async (limit = 10) => {
  try {
    const recentBooks = await Book.findAll({
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Language, attributes: ['id', 'name', 'code'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });
    
    return recentBooks;
  } catch (error) {
    logger.error('Ошибка при получении недавно добавленных книг:', error);
    throw error;
  }
};

module.exports = exports;