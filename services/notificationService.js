const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Создание нового уведомления
 */
exports.createNotification = async (data) => {
  try {
    // Проверка обязательных полей
    if (!data.user_id || !data.type || !data.message) {
      throw new Error('Необходимо указать пользователя, тип и текст уведомления');
    }
    
    // Создание уведомления
    const notification = await Notification.create({
      user_id: data.user_id,
      type: data.type,
      message: data.message,
      is_read: false,
      related_id: data.related_id || null,
      metadata: data.metadata || null
    });
    
    return notification;
  } catch (error) {
    logger.error('Ошибка при создании уведомления:', error);
    throw error;
  }
};

/**
 * Получение уведомлений пользователя
 */
exports.getUserNotifications = async (userId, options = {}) => {
  try {
    const { is_read, page = 1, limit = 10 } = options;
    
    // Формирование условия для фильтрации
    const whereClause = { user_id: userId };
    
    if (is_read !== undefined) {
      whereClause.is_read = is_read;
    }
    
    // Пагинация
    const offset = (page - 1) * limit;
    
    // Получение уведомлений
    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: notifications
    };
  } catch (error) {
    logger.error(`Ошибка при получении уведомлений пользователя (ID: ${userId}):`, error);
    throw error;
  }
};

/**
 * Отметка уведомления как прочитанного
 */
exports.markAsRead = async (notificationId, userId) => {
  try {
    // Получение уведомления
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId
      }
    });
    
    if (!notification) {
      throw new Error('Уведомление не найдено или не принадлежит пользователю');
    }
    
    // Обновление уведомления
    await notification.update({
      is_read: true
    });
    
    return notification;
  } catch (error) {
    logger.error(`Ошибка при отметке уведомления как прочитанного (ID: ${notificationId}):`, error);
    throw error;
  }
};

/**
 * Отметка всех уведомлений пользователя как прочитанных
 */
exports.markAllAsRead = async (userId) => {
  try {
    // Обновление всех непрочитанных уведомлений пользователя
    const [updatedCount] = await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: userId,
          is_read: false
        }
      }
    );
    
    return updatedCount;
  } catch (error) {
    logger.error(`Ошибка при отметке всех уведомлений пользователя как прочитанных (ID: ${userId}):`, error);
    throw error;
  }
};

/**
 * Удаление уведомления
 */
exports.deleteNotification = async (notificationId, userId) => {
  try {
    // Удаление уведомления
    const deletedCount = await Notification.destroy({
      where: {
        id: notificationId,
        user_id: userId
      }
    });
    
    if (deletedCount === 0) {
      throw new Error('Уведомление не найдено или не принадлежит пользователю');
    }
    
    return true;
  } catch (error) {
    logger.error(`Ошибка при удалении уведомления (ID: ${notificationId}):`, error);
    throw error;
  }
};

/**
 * Создание системных уведомлений о просроченных книгах
 */
exports.createOverdueNotifications = async () => {
  try {
    // Импортируем модель Borrow
    const Borrow = require('../models/Borrow');
    const Book = require('../models/Book');
    
    // Текущая дата
    const currentDate = new Date();
    
    // Получение просроченных выдач без уведомлений
    const overdueBooks = await Borrow.findAll({
      where: {
        status: 'active',
        due_date: { [Op.lt]: currentDate }
      },
      include: [
        { model: Book, attributes: ['id', 'title', 'author'] },
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });
    
    // Счетчик созданных уведомлений
    let createdCount = 0;
    
    // Создание уведомлений для каждой просроченной книги
    for (const borrow of overdueBooks) {
      // Проверяем, было ли уже отправлено уведомление сегодня
      const existingNotification = await Notification.findOne({
        where: {
          user_id: borrow.user_id,
          type: 'overdue',
          related_id: borrow.id,
          created_at: {
            [Op.gte]: new Date(currentDate.setHours(0, 0, 0, 0))
          }
        }
      });
      
      // Если уведомление уже было отправлено сегодня, пропускаем
      if (existingNotification) {
        continue;
      }
      
      // Расчет количества дней просрочки
      const dueDate = new Date(borrow.due_date);
      const diffTime = Math.abs(currentDate - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Создание уведомления
      await this.createNotification({
        user_id: borrow.user_id,
        type: 'overdue',
        message: `У вас просрочена книга "${borrow.Book.title}" на ${diffDays} дней. Пожалуйста, верните её как можно скорее.`,
        related_id: borrow.id
      });
      
      createdCount++;
    }
    
    return createdCount;
  } catch (error) {
    logger.error('Ошибка при создании системных уведомлений о просроченных книгах:', error);
    throw error;
  }
};

module.exports = exports;