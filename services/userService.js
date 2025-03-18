const User = require('../models/User');
const Borrow = require('../models/Borrow');
const Book = require('../models/Book');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');

/**
 * Получение всех пользователей с фильтрацией и пагинацией
 */
exports.getAllUsers = async (options = {}) => {
  try {
    const {
      role,
      faculty,
      search,
      page = 1,
      limit = 10
    } = options;

    // Формирование условия для фильтрации
    const whereClause = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (faculty) {
      whereClause.faculty = faculty;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { student_id: { [Op.like]: `%${search}%` } }
      ];
    }

    // Пагинация
    const offset = (page - 1) * limit;

    // Получение пользователей
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: users
    };
  } catch (error) {
    logger.error('Ошибка при получении списка пользователей:', error);
    throw error;
  }
};

/**
 * Получение пользователя по ID
 */
exports.getUserById = async (id) => {
  try {
    // Получение пользователя
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Подсчет активных выдач
    const activeBorrows = await Borrow.count({
      where: {
        user_id: id,
        status: 'active'
      }
    });

    // Подсчет просроченных выдач
    const currentDate = new Date();
    const overdueBorrows = await Borrow.count({
      where: {
        user_id: id,
        status: 'active',
        due_date: { [Op.lt]: currentDate }
      }
    });

    return {
      ...user.toJSON(),
      stats: {
        active_borrows: activeBorrows,
        overdue_borrows: overdueBorrows
      }
    };
  } catch (error) {
    logger.error(`Ошибка при получении пользователя по ID (${id}):`, error);
    throw error;
  }
};

/**
 * Создание нового пользователя
 */
exports.createUser = async (userData) => {
  try {
    // Проверка обязательных полей
    if (!userData.name || !userData.email || !userData.password) {
      throw new Error('Имя, email и пароль обязательны');
    }

    // Проверка, существует ли пользователь с таким email
    const existingUserByEmail = await User.findOne({ where: { email: userData.email } });
    if (existingUserByEmail) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Создание пользователя
    const user = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'student',
      faculty: userData.faculty,
      specialization: userData.specialization,
      student_id: userData.student_id,
      phone: userData.phone,
      year: userData.year
    });

    // Исключаем пароль из ответа
    const { password, ...userWithoutPassword } = user.toJSON();

    return userWithoutPassword;
  } catch (error) {
    logger.error('Ошибка при создании пользователя:', error);
    throw error;
  }
};

/**
 * Обновление пользователя
 */
exports.updateUser = async (id, userData, fileData = null) => {
  try {
    // Получение пользователя
    const user = await User.findByPk(id);

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Проверка, существует ли другой пользователь с таким же email
    if (userData.email && userData.email !== user.email) {
      const existingUserByEmail = await User.findOne({ where: { email: userData.email } });
      if (existingUserByEmail) {
        throw new Error('Пользователь с таким email уже существует');
      }
    }

    // Обработка файла аватара, если загружен новый
    let avatarPath = user.avatar;
    if (fileData) {
      // Удаление старого аватара, если он существует
      if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, '..', user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
      
      avatarPath = `/uploads/avatars/${fileData.filename}`;
    }

    // Обновление данных пользователя
    const updateData = {
      name: userData.name || user.name,
      email: userData.email || user.email,
      role: userData.role || user.role,
      faculty: userData.faculty !== undefined ? userData.faculty : user.faculty,
      specialization: userData.specialization !== undefined ? userData.specialization : user.specialization,
      student_id: userData.student_id !== undefined ? userData.student_id : user.student_id,
      phone: userData.phone !== undefined ? userData.phone : user.phone,
      year: userData.year !== undefined ? userData.year : user.year,
      avatar: avatarPath
    };

    // Если задан новый пароль
    if (userData.password) {
      updateData.password = userData.password;
    }

    await user.update(updateData);

    // Исключаем пароль из ответа
    const { password, ...userWithoutPassword } = user.toJSON();

    return userWithoutPassword;
  } catch (error) {
    logger.error(`Ошибка при обновлении пользователя (ID: ${id}):`, error);
    throw error;
  }
};

/**
 * Удаление пользователя
 */
exports.deleteUser = async (id) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Получение пользователя
    const user = await User.findByPk(id, { transaction });

    if (!user) {
      await transaction.rollback();
      throw new Error('Пользователь не найден');
    }

    // Проверка, есть ли у пользователя активные выдачи
    const activeBorrows = await Borrow.count({
      where: {
        user_id: id,
        status: 'active'
      },
      transaction
    });

    if (activeBorrows > 0) {
      await transaction.rollback();
      throw new Error('Невозможно удалить пользователя с активными выдачами книг');
    }

    // Удаление аватара, если он существует
    if (user.avatar) {
      const avatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Удаление пользователя
    await user.destroy({ transaction });

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Ошибка при удалении пользователя (ID: ${id}):`, error);
    throw error;
  }
};

/**
 * Изменение пароля пользователя
 */
exports.changePassword = async (id, currentPassword, newPassword) => {
  try {
    if (!currentPassword || !newPassword) {
      throw new Error('Необходимо указать текущий и новый пароль');
    }

    // Получение пользователя
    const user = await User.findByPk(id);

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Проверка текущего пароля
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Неверный текущий пароль');
    }

    // Обновление пароля
    user.password = newPassword;
    await user.save();

    return true;
  } catch (error) {
    logger.error(`Ошибка при изменении пароля пользователя (ID: ${id}):`, error);
    throw error;
  }
};

/**
 * Получение активных выдач пользователя
 */
exports.getUserBorrows = async (id, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;

    // Проверка существования пользователя
    const user = await User.findByPk(id);

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Пагинация
    const offset = (page - 1) * limit;

    // Получение активных выдач
    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where: {
        user_id: id,
        status: 'active'
      },
      include: [
        { 
          model: Book,
          attributes: ['id', 'title', 'author', 'cover', 'isbn']
        }
      ],
      order: [['due_date', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Проверка на просроченные выдачи
    const currentDate = new Date();
    const borrowsWithStatus = borrows.map(borrow => {
      const isOverdue = new Date(borrow.due_date) < currentDate;
      return {
        ...borrow.toJSON(),
        isOverdue
      };
    });

    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: borrowsWithStatus
    };
  } catch (error) {
    logger.error(`Ошибка при получении активных выдач пользователя (ID: ${id}):`, error);
    throw error;
  }
};

module.exports = exports;