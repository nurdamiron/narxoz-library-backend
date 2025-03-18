const categoryService = require('../services/categoryService');
const logger = require('../utils/logger');

/**
 * Получение всех категорий
 * @route GET /api/categories
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    logger.error('Ошибка при получении всех категорий:', error);
    next(error);
  }
};

/**
 * Получение категории по ID
 * @route GET /api/categories/:id
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error(`Ошибка при получении категории по ID (${req.params.id}):`, error);
    
    if (error.message === 'Категория не найдена') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Создание новой категории
 * @route POST /api/categories
 */
exports.createCategory = async (req, res, next) => {
  try {
    const categoryData = req.body;
    
    const category = await categoryService.createCategory(categoryData);
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('Ошибка при создании категории:', error);
    
    if (error.message.includes('обязательно') || 
        error.message.includes('уже существует')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Обновление категории
 * @route PUT /api/categories/:id
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const categoryData = req.body;
    
    const category = await categoryService.updateCategory(id, categoryData);
    
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error(`Ошибка при обновлении категории (ID: ${req.params.id}):`, error);
    
    if (error.message === 'Категория не найдена') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('уже существует')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Удаление категории
 * @route DELETE /api/categories/:id
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await categoryService.deleteCategory(id);
    
    res.json({
      success: true,
      message: 'Категория успешно удалена'
    });
  } catch (error) {
    logger.error(`Ошибка при удалении категории (ID: ${req.params.id}):`, error);
    
    if (error.message === 'Категория не найдена') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('содержащую книги')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Получение книг по категории
 * @route GET /api/categories/:id/books
 */
exports.getBooksByCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;
    
    const result = await categoryService.getBooksByCategory(id, {
      page,
      limit
    });
    
    res.json({
      success: true,
      category: result.category,
      count: result.count,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      data: result.data
    });
  } catch (error) {
    logger.error(`Ошибка при получении книг по категории (ID: ${req.params.id}):`, error);
    
    if (error.message === 'Категория не найдена') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Получение категорий с количеством книг
 * @route GET /api/categories/stats/book-count
 */
exports.getCategoriesWithBookCount = async (req, res, next) => {
  try {
    const categories = await categoryService.getCategoriesWithBookCount();
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    logger.error('Ошибка при получении категорий с количеством книг:', error);
    next(error);
  }
};

module.exports = exports;