const Book = require('../models/Book');
const Category = require('../models/Category');
const Language = require('../models/Language');
const Borrow = require('../models/Borrow');
const Review = require('../models/Review');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Поиск книг
 * 
 * @param {Object} options - Параметры поиска
 * @param {string} options.query - Поисковый запрос
 * @param {number} [options.page=1] - Номер страницы
 * @param {number} [options.limit=10] - Количество элементов на странице
 * @returns {Promise<Object>} Объект с результатами поиска и метаданными
 */
exports.searchBooks = async (options) => {
  try {
    const { query, page = 1, limit = 10 } = options;
    
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
 * Получение книг по категории
 * 
 * @param {number} categoryId - ID категории
 * @param {Object} options - Параметры запроса
 * @param {number} [options.page=1] - Номер страницы
 * @param {number} [options.limit=10] - Количество элементов на странице
 * @returns {Promise<Object>} Объект с книгами и метаданными
 */
exports.getBooksByCategory = async (categoryId, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    
    // Проверка существования категории
    const category = await Category.findByPk(categoryId);
    
    if (!category) {
      throw new Error('Категория не найдена');
    }
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Получение книг
    const { count, rows: books } = await Book.findAndCountAll({
      where: { category_id: categoryId },
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Language, attributes: ['id', 'name', 'code'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['title', 'ASC']]
    });
    
    return {
      category,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: books
    };
  } catch (error) {
    logger.error(`Ошибка при получении книг по категории (ID: ${categoryId}):`, error);
    throw error;
  }
};

/**
 * Получение популярных книг
 * 
 * @param {number} [limit=10] - Количество книг
 * @returns {Promise<Array>} Массив популярных книг
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
 * 
 * @param {number} [limit=10] - Количество книг
 * @returns {Promise<Array>} Массив недавно добавленных книг
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

/**
 * Получение топ-книг по рейтингу
 * 
 * @param {number} [limit=10] - Количество книг
 * @returns {Promise<Array>} Массив книг с высокими рейтингами
 */
exports.getTopRatedBooks = async (limit = 10) => {
  try {
    // Подзапрос для получения среднего рейтинга
    const topRatedBooks = await Book.findAll({
      attributes: {
        include: [
          [sequelize.fn('AVG', sequelize.col('Reviews.rating')), 'average_rating'],
          [sequelize.fn('COUNT', sequelize.col('Reviews.id')), 'review_count']
        ]
      },
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { 
          model: Review,
          attributes: [],
          where: { is_approved: true },
          required: true
        }
      ],
      group: ['Book.id', 'Category.id'],
      having: sequelize.literal('COUNT(Reviews.id) >= 3'), // Минимум 3 рецензии
      order: [[sequelize.literal('average_rating'), 'DESC']],
      limit: parseInt(limit)
    });
    
    return topRatedBooks;
  } catch (error) {
    logger.error('Ошибка при получении топ-книг по рейтингу:', error);
    throw error;
  }
};

/**
 * Расширенный поиск книг с множеством фильтров
 * 
 * @param {Object} filters - Фильтры для поиска
 * @param {string} [filters.title] - Название книги
 * @param {string} [filters.author] - Автор книги
 * @param {number} [filters.category_id] - ID категории
 * @param {number} [filters.language_id] - ID языка
 * @param {number} [filters.year_from] - Год издания от
 * @param {number} [filters.year_to] - Год издания до
 * @param {string} [filters.isbn] - ISBN книги
 * @param {boolean} [filters.available] - Только доступные для выдачи
 * @param {Object} options - Опции запроса (пагинация, сортировка)
 * @returns {Promise<Object>} Результаты поиска
 */
exports.advancedSearch = async (filters = {}, options = {}) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      sortBy = 'title',
      sortOrder = 'ASC'
    } = options;
    
    // Формирование условий поиска
    const whereClause = {};
    
    if (filters.title) {
      whereClause.title = { [Op.like]: `%${filters.title}%` };
    }
    
    if (filters.author) {
      whereClause.author = { [Op.like]: `%${filters.author}%` };
    }
    
    if (filters.category_id) {
      whereClause.category_id = filters.category_id;
    }
    
    if (filters.language_id) {
      whereClause.language_id = filters.language_id;
    }
    
    // Фильтрация по году издания
    if (filters.year_from || filters.year_to) {
      whereClause.publication_year = {};
      
      if (filters.year_from) {
        whereClause.publication_year[Op.gte] = filters.year_from;
      }
      
      if (filters.year_to) {
        whereClause.publication_year[Op.lte] = filters.year_to;
      }
    }
    
    if (filters.isbn) {
      whereClause.isbn = { [Op.like]: `%${filters.isbn}%` };
    }
    
    if (filters.available === true) {
      whereClause.available_copies = { [Op.gt]: 0 };
    }
    
    // Настройка сортировки
    let order = [['title', 'ASC']]; // По умолчанию сортировка по названию
    
    // Доступные поля для сортировки
    const allowedFields = ['title', 'author', 'publication_year', 'created_at'];
    const allowedOrders = ['ASC', 'DESC'];
    
    if (allowedFields.includes(sortBy) && allowedOrders.includes(sortOrder)) {
      order = [[sortBy, sortOrder]];
    }
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Выполнение поиска
    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Language, attributes: ['id', 'name', 'code'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order
    });
    
    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: books
    };
  } catch (error) {
    logger.error('Ошибка при выполнении расширенного поиска книг:', error);
    throw error;
  }
};

module.exports = exports;