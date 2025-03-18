const Book = require('../models/Book');
const User = require('../models/User');
const Borrow = require('../models/Borrow');
const Review = require('../models/Review');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Добавление рецензии на книгу
 * 
 * @param {number} bookId - ID книги
 * @param {number} userId - ID пользователя
 * @param {Object} reviewData - Данные рецензии
 * @returns {Promise<Object>} Созданная рецензия
 */
exports.addReview = async (bookId, userId, reviewData) => {
  try {
    // Проверка существования книги
    const book = await Book.findByPk(bookId);
    
    if (!book) {
      throw new Error('Книга не найдена');
    }
    
    // Проверка, не оставлял ли пользователь уже рецензию на эту книгу
    const existingReview = await Review.findOne({
      where: {
        book_id: bookId,
        user_id: userId
      }
    });
    
    if (existingReview) {
      throw new Error('Вы уже оставили рецензию на эту книгу');
    }
    
    // Проверка, что пользователь брал эту книгу
    const hasBorrowed = await Borrow.findOne({
      where: {
        book_id: bookId,
        user_id: userId
      }
    });
    
    // Настройка автоматического одобрения рецензии
    const isAutoApproved = !reviewData.comment || reviewData.comment.length < 100;
    
    // Создание рецензии
    const review = await Review.create({
      book_id: bookId,
      user_id: userId,
      rating: reviewData.rating,
      comment: reviewData.comment,
      is_approved: isAutoApproved, // Автоматическое одобрение коротких рецензий или тех, где только оценка
      is_moderated: isAutoApproved
    });
    
    return review;
  } catch (error) {
    logger.error(`Ошибка при добавлении рецензии на книгу (ID книги: ${bookId}, ID пользователя: ${userId}):`, error);
    throw error;
  }
};

/**
 * Получение рецензий на книгу
 * 
 * @param {number} bookId - ID книги
 * @param {Object} options - Опции запроса
 * @returns {Promise<Object>} Рецензии с пагинацией
 */
exports.getBookReviews = async (bookId, options = {}) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      approved_only = true
    } = options;
    
    // Проверка существования книги
    const book = await Book.findByPk(bookId);
    
    if (!book) {
      throw new Error('Книга не найдена');
    }
    
    // Формирование условия для фильтрации
    const whereClause = { book_id: bookId };
    
    if (approved_only) {
      whereClause.is_approved = true;
    }
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Получение рецензий
    const { count, rows: reviews } = await Review.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: User,
          attributes: ['id', 'name', 'avatar', 'role'] 
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Средний рейтинг
    const ratingStats = await Review.findAll({
      where: { 
        book_id: bookId,
        is_approved: true
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
      ]
    });
    
    const stats = ratingStats[0] || { average_rating: 0, total_reviews: 0 };
    
    return {
      book: {
        id: book.id,
        title: book.title,
        author: book.author
      },
      stats: {
        average_rating: parseFloat(stats.average_rating) || 0,
        total_reviews: parseInt(stats.total_reviews) || 0
      },
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: reviews
    };
  } catch (error) {
    logger.error(`Ошибка при получении рецензий на книгу (ID книги: ${bookId}):`, error);
    throw error;
  }
};

/**
 * Обновление рецензии
 * 
 * @param {number} reviewId - ID рецензии
 * @param {number} userId - ID пользователя
 * @param {Object} reviewData - Новые данные рецензии
 * @returns {Promise<Object>} Обновленная рецензия
 */
exports.updateReview = async (reviewId, userId, reviewData) => {
  try {
    // Получение рецензии
    const review = await Review.findOne({
      where: {
        id: reviewId,
        user_id: userId
      }
    });
    
    if (!review) {
      throw new Error('Рецензия не найдена или вы не являетесь ее автором');
    }
    
    // Если рецензия уже была одобрена, новая рецензия должна пройти модерацию
    const needsModeration = review.is_approved && 
                           (reviewData.comment !== undefined && reviewData.comment.length >= 100);
    
    // Обновление рецензии
    await review.update({
      rating: reviewData.rating !== undefined ? reviewData.rating : review.rating,
      comment: reviewData.comment !== undefined ? reviewData.comment : review.comment,
      is_approved: needsModeration ? false : review.is_approved,
      is_moderated: needsModeration ? false : review.is_moderated
    });
    
    // Получение обновленной рецензии с данными пользователя
    const updatedReview = await Review.findByPk(reviewId, {
      include: [
        { 
          model: User,
          attributes: ['id', 'name', 'avatar', 'role'] 
        }
      ]
    });
    
    return updatedReview;
  } catch (error) {
    logger.error(`Ошибка при обновлении рецензии (ID: ${reviewId}):`, error);
    throw error;
  }
};

/**
 * Удаление рецензии
 * 
 * @param {number} reviewId - ID рецензии
 * @param {number} userId - ID пользователя
 * @param {boolean} isAdmin - Флаг администратора (для принудительного удаления)
 * @returns {Promise<boolean>} Результат операции
 */
exports.deleteReview = async (reviewId, userId, isAdmin = false) => {
  try {
    // Формирование условия для поиска рецензии
    const whereClause = { id: reviewId };
    
    // Если не администратор, проверяем авторство
    if (!isAdmin) {
      whereClause.user_id = userId;
    }
    
    // Поиск и удаление рецензии
    const deleted = await Review.destroy({ where: whereClause });
    
    if (deleted === 0) {
      throw new Error('Рецензия не найдена или у вас нет прав для ее удаления');
    }
    
    return true;
  } catch (error) {
    logger.error(`Ошибка при удалении рецензии (ID: ${reviewId}):`, error);
    throw error;
  }
};

/**
 * Модерация рецензии (для администраторов и библиотекарей)
 * 
 * @param {number} reviewId - ID рецензии
 * @param {Object} moderationData - Данные модерации
 * @returns {Promise<Object>} Обновленная рецензия
 */
exports.moderateReview = async (reviewId, moderationData) => {
  try {
    // Получение рецензии
    const review = await Review.findByPk(reviewId, {
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: Book, attributes: ['id', 'title', 'author'] }
      ]
    });
    
    if (!review) {
      throw new Error('Рецензия не найдена');
    }
    
    // Обновление статуса модерации
    await review.update({
      is_approved: moderationData.approved,
      is_moderated: true,
      moderation_comment: moderationData.comment
    });
    
    // Получение обновленной рецензии
    const updatedReview = await Review.findByPk(reviewId, {
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: Book, attributes: ['id', 'title', 'author'] }
      ]
    });
    
    return updatedReview;
  } catch (error) {
    logger.error(`Ошибка при модерации рецензии (ID: ${reviewId}):`, error);
    throw error;
  }
};

/**
 * Получение рецензий, ожидающих модерации
 * 
 * @param {Object} options - Опции запроса
 * @returns {Promise<Object>} Рецензии, ожидающие модерации
 */
exports.getPendingReviews = async (options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Получение рецензий, ожидающих модерации
    const { count, rows: reviews } = await Review.findAndCountAll({
      where: {
        is_moderated: false
      },
      include: [
        { 
          model: User,
          attributes: ['id', 'name', 'email', 'role'] 
        },
        { 
          model: Book,
          attributes: ['id', 'title', 'author'] 
        }
      ],
      order: [['created_at', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: reviews
    };
  } catch (error) {
    logger.error('Ошибка при получении рецензий, ожидающих модерации:', error);
    throw error;
  }
};

/**
 * Получение рецензий пользователя
 * 
 * @param {number} userId - ID пользователя
 * @param {Object} options - Опции запроса
 * @returns {Promise<Object>} Рецензии пользователя
 */
exports.getUserReviews = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Получение рецензий пользователя
    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { user_id: userId },
      include: [
        { 
          model: Book,
          attributes: ['id', 'title', 'author', 'cover'] 
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: reviews
    };
  } catch (error) {
    logger.error(`Ошибка при получении рецензий пользователя (ID: ${userId}):`, error);
    throw error;
  }
};

module.exports = exports;