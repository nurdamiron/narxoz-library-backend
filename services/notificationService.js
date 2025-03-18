const Notification = require('../models/Notification');
const User = require('../models/User');
const Book = require('../models/Book');
const Borrow = require('../models/Borrow');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const mailService = require('./mailService');

/**
 * Создание нового уведомления
 * 
 * @param {Object} data - Данные уведомления
 * @returns {Promise<Object>} Созданное уведомление
 */
exports.createNotification = async (data) => {
  try {
    const notification = await Notification.create({
      user_id: data.user_id,
      type: data.type,
      message: data.message,
      is_read: false,
      related_id: data.related_id || null
    });

    // Попытка отправить email уведомление, если настроено
    try {
      const user = await User.findByPk(data.user_id);
      if (user && user.email) {
        await mailService.sendNotificationEmail(user.email, data.message, data.type);
      }
    } catch (error) {
      // Логируем ошибку отправки email, но не прерываем выполнение
      logger.error('Ошибка при отправке email уведомления:', error);
    }

    return notification;
  } catch (error) {
    logger.error('Ошибка при создании уведомления:', error);
    throw error;
  }
};

/**
 * Получение уведомлений пользователя
 * 
 * @param {number} userId - ID пользователя
 * @param {Object} options - Опции запроса (limit, offset, is_read)
 * @returns {Promise<Object>} Объект с уведомлениями и их общим количеством
 */
exports.getUserNotifications = async (userId, options = {}) => {
  try {
    const { limit = 10, offset = 0, is_read } = options;
    
    const whereClause = { user_id: userId };
    
    // Фильтрация по прочитанным/непрочитанным
    if (is_read !== undefined) {
      whereClause.is_read = is_read;
    }
    
    const { count, rows } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return { count, notifications: rows };
  } catch (error) {
    logger.error('Ошибка при получении уведомлений пользователя:', error);
    throw error;
  }
};

/**
 * Отметка уведомления как прочитанного
 * 
 * @param {number} notificationId - ID уведомления
 * @param {number} userId - ID пользователя
 * @returns {Promise<boolean>} Результат операции
 */
exports.markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId
      }
    });
    
    if (!notification) {
      return false;
    }
    
    notification.is_read = true;
    await notification.save();
    
    return true;
  } catch (error) {
    logger.error('Ошибка при отметке уведомления как прочитанного:', error);
    throw error;
  }
};

/**
 * Отметка всех уведомлений пользователя как прочитанных
 * 
 * @param {number} userId - ID пользователя
 * @returns {Promise<number>} Количество обновленных уведомлений
 */
exports.markAllAsRead = async (userId) => {
  try {
    const [updated] = await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: userId,
          is_read: false
        }
      }
    );
    
    return updated;
  } catch (error) {
    logger.error('Ошибка при отметке всех уведомлений как прочитанных:', error);
    throw error;
  }
};

/**
 * Удаление уведомления
 * 
 * @param {number} notificationId - ID уведомления
 * @param {number} userId - ID пользователя
 * @returns {Promise<boolean>} Результат операции
 */
exports.deleteNotification = async (notificationId, userId) => {
  try {
    const deleted = await Notification.destroy({
      where: {
        id: notificationId,
        user_id: userId
      }
    });
    
    return deleted > 0;
  } catch (error) {
    logger.error('Ошибка при удалении уведомления:', error);
    throw error;
  }
};

/**
 * Удаление всех уведомлений пользователя
 * 
 * @param {number} userId - ID пользователя
 * @returns {Promise<number>} Количество удаленных уведомлений
 */
exports.deleteAllNotifications = async (userId) => {
  try {
    const deleted = await Notification.destroy({
      where: { user_id: userId }
    });
    
    return deleted;
  } catch (error) {
    logger.error('Ошибка при удалении всех уведомлений пользователя:', error);
    throw error;
  }
};

/**
 * Создание уведомлений о просроченных книгах
 * Используется по расписанию (cron job)
 * 
 * @returns {Promise<number>} Количество созданных уведомлений
 */
exports.createOverdueNotifications = async () => {
  try {
    // Текущая дата
    const currentDate = new Date();
    
    // Получение просроченных выдач, по которым еще не было уведомлений сегодня
    const overdueBorrows = await Borrow.findAll({
      where: {
        status: 'active',
        due_date: { [Op.lt]: currentDate }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Book,
          attributes: ['id', 'title', 'author']
        }
      ]
    });
    
    // Проверка, было ли уже отправлено уведомление сегодня
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // Счетчик созданных уведомлений
    let notificationsCreated = 0;
    
    // Отправка уведомлений по каждой просроченной выдаче
    for (const borrow of overdueBorrows) {
      // Проверка, было ли уже отправлено уведомление сегодня
      const existingNotification = await Notification.findOne({
        where: {
          user_id: borrow.user_id,
          type: 'overdue',
          related_id: borrow.id,
          created_at: {
            [Op.between]: [todayStart, todayEnd]
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
      const message = `У вас просрочена книга "${borrow.Book.title}" на ${diffDays} дней. Пожалуйста, верните её как можно скорее.`;
      
      await this.createNotification({
        user_id: borrow.user_id,
        type: 'overdue',
        message,
        related_id: borrow.id
      });
      
      notificationsCreated++;
    }
    
    return notificationsCreated;
  } catch (error) {
    logger.error('Ошибка при создании уведомлений о просроченных книгах:', error);
    throw error;
  }
};

/**
 * Отправка напоминаний о возврате книг
 * Используется по расписанию (cron job)
 * 
 * @returns {Promise<number>} Количество отправленных напоминаний
 */
exports.sendReturnReminders = async () => {
  try {
    // Текущая дата
    const currentDate = new Date();
    
    // Дата через 3 дня (для напоминаний о предстоящем возврате)
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 3);
    
    // Начало и конец дня для reminderDate
    const reminderStart = new Date(reminderDate);
    reminderStart.setHours(0, 0, 0, 0);
    
    const reminderEnd = new Date(reminderDate);
    reminderEnd.setHours(23, 59, 59, 999);
    
    // Получение выдач, срок возврата которых наступает через 3 дня
    const upcomingReturns = await Borrow.findAll({
      where: {
        status: 'active',
        due_date: {
          [Op.between]: [reminderStart, reminderEnd]
        }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Book,
          attributes: ['id', 'title', 'author']
        }
      ]
    });
    
    // Начало и конец текущего дня
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // Счетчик отправленных напоминаний
    let remindersCreated = 0;
    
    // Отправка напоминаний по каждой предстоящей выдаче
    for (const borrow of upcomingReturns) {
      // Проверка, было ли уже отправлено напоминание сегодня
      const existingNotification = await Notification.findOne({
        where: {
          user_id: borrow.user_id,
          type: 'reminder',
          related_id: borrow.id,
          created_at: {
            [Op.between]: [todayStart, todayEnd]
          }
        }
      });
      
      // Если напоминание уже было отправлено сегодня, пропускаем
      if (existingNotification) {
        continue;
      }
      
      // Создание напоминания
      const dueDate = new Date(borrow.due_date).toLocaleDateString();
      const message = `Напоминаем, что срок возврата книги "${borrow.Book.title}" истекает ${dueDate}. Пожалуйста, не забудьте вернуть книгу вовремя.`;
      
      await this.createNotification({
        user_id: borrow.user_id,
        type: 'reminder',
        message,
        related_id: borrow.id
      });
      
      remindersCreated++;
    }
    
    return remindersCreated;
  } catch (error) {
    logger.error('Ошибка при отправке напоминаний о возврате книг:', error);
    throw error;
  }
};

module.exports = exports;