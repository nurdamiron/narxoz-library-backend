const bookService = require('../services/bookService');
const logger = require('../utils/logger');

/**
 * Получение всех книг с фильтрацией и пагинацией
 * @route GET /api/books
 */
exports.getAllBooks = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      category,
      language,
      year,
      author,
      available
    } = req.query;

    const books = await bookService.getAllBooks({
      page,
      limit,
      category,
      language,
      year,
      author,
      available: available === 'true'
    });

    res.json({
      success: true,
      ...books
    });
  } catch (error) {
    logger.error('Ошибка при получении списка книг:', error);
    next(error);
  }
};

/**
 * Получение книги по ID
 * @route GET /api/books/:id
 */
exports.getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const book = await bookService.getBookById(id);

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    logger.error(`Ошибка при получении книги по ID (${req.params.id}):`, error);
    
    if (error.message === 'Книга не найдена') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

/**
 * Создание новой книги
 * @route POST /api/books
 */
exports.createBook = async (req, res, next) => {
  try {
    const bookData = req.body;
    const fileData = req.file;

    const book = await bookService.createBook(bookData, fileData);

    res.status(201).json({
      success: true,
      data: book
    });
  } catch (error) {
    logger.error('Ошибка при создании книги:', error);
    
    if (error.message.includes('обязательны')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Обновление книги
 * @route PUT /api/books/:id
 */
exports.updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookData = req.body;
    const fileData = req.file;

    const book = await bookService.updateBook(id, bookData, fileData);

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    logger.error(`Ошибка при обновлении книги (ID: ${req.params.id}):`, error);
    
    if (error.message === 'Книга не найдена') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

/**
 * Удаление книги
 * @route DELETE /api/books/:id
 */
exports.deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await bookService.deleteBook(id);

    res.json({
      success: true,
      message: 'Книга успешно удалена'
    });
  } catch (error) {
    logger.error(`Ошибка при удалении книги (ID: ${req.params.id}):`, error);
    
    if (error.message === 'Книга не найдена') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

/**
 * Поиск книг
 * @route GET /api/books/search
 */
exports.searchBooks = async (req, res, next) => {
  try {
    const { query, page, limit } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Поисковый запрос не указан'
      });
    }
    
    const results = await bookService.searchBooks(query, {
      page,
      limit
    });

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    logger.error('Ошибка при поиске книг:', error);
    next(error);
  }
};

/**
 * Получение популярных книг
 * @route GET /api/books/popular
 */
exports.getPopularBooks = async (req, res, next) => {
  try {
    const { limit } = req.query;
    
    const books = await bookService.getPopularBooks(limit);

    res.json({
      success: true,
      data: books
    });
  } catch (error) {
    logger.error('Ошибка при получении популярных книг:', error);
    next(error);
  }
};

/**
 * Получение недавно добавленных книг
 * @route GET /api/books/recent
 */
exports.getRecentBooks = async (req, res, next) => {
  try {
    const { limit } = req.query;
    
    const books = await bookService.getRecentBooks(limit);

    res.json({
      success: true,
      data: books
    });
  } catch (error) {
    logger.error('Ошибка при получении недавно добавленных книг:', error);
    next(error);
  }
};

module.exports = exports;