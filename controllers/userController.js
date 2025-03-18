const User = require('../models/User');
const Borrow = require('../models/Borrow');
const Book = require('../models/Book');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const paginate = require('../utils/pagination');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');

// Получение информации о текущем пользователе
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Ошибка при получении информации о пользователе:', error);
    next(error);
  }
};

// Обновление профиля пользователя
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    const { name, phone, faculty, specialization, year } = req.body;

    // Обновление полей пользователя
    const updateData = {
      name: name || user.name,
      phone: phone !== undefined ? phone : user.phone,
      faculty: faculty !== undefined ? faculty : user.faculty,
      specialization: specialization !== undefined ? specialization : user.specialization,
      year: year !== undefined ? year : user.year
    };

    // Если загружен новый аватар
    if (req.file) {
      // Удаление старого аватара, если он существует
      if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, '..', user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    await user.update(updateData);

    // Исключаем пароль из ответа
    const { password, ...userData } = user.toJSON();

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    logger.error('Ошибка при обновлении профиля пользователя:', error);
    next(error);
  }
};

// Изменение пароля пользователя
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать текущий и новый пароль'
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверка текущего пароля
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Неверный текущий пароль'
      });
    }

    // Обновление пароля
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });
  } catch (error) {
    logger.error('Ошибка при изменении пароля пользователя:', error);
    next(error);
  }
};

// Получение активных выдач пользователя
exports.getUserBorrows = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Пагинация
    const { offset, limit: limitValue } = paginate(page, limit);

    // Получение активных выдач
    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where: {
        user_id: userId,
        status: 'active'
      },
      include: [
        { 
          model: Book,
          attributes: ['id', 'title', 'author', 'cover', 'isbn']
        }
      ],
      order: [['due_date', 'ASC']],
      limit: parseInt(limitValue),
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

    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limitValue),
      currentPage: parseInt(page),
      data: borrowsWithStatus
    });
  } catch (error) {
    logger.error('Ошибка при получении активных выдач пользователя:', error);
    next(error);
  }
};

// Получение истории выдач пользователя
exports.getUserBorrowHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Пагинация
    const { offset, limit: limitValue } = paginate(page, limit);

    // Получение истории выдач
    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where: {
        user_id: userId,
        status: 'returned'
      },
      include: [
        { 
          model: Book,
          attributes: ['id', 'title', 'author', 'cover', 'isbn']
        }
      ],
      order: [['return_date', 'DESC']],
      limit: parseInt(limitValue),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limitValue),
      currentPage: parseInt(page),
      data: borrows
    });
  } catch (error) {
    logger.error('Ошибка при получении истории выдач пользователя:', error);
    next(error);
  }
};

// ADMIN: Получение всех пользователей (только для администратора)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, faculty, search, page = 1, limit = 10 } = req.query;

    // Условия поиска
    const whereClause = {};
    if (role) whereClause.role = role;
    if (faculty) whereClause.faculty = faculty;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { student_id: { [Op.like]: `%${search}%` } }
      ];
    }

    // Пагинация
    const { offset, limit: limitValue } = paginate(page, limit);

    // Получение пользователей
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limitValue),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limitValue),
      currentPage: parseInt(page),
      data: users
    });
  } catch (error) {
    logger.error('Ошибка при получении всех пользователей:', error);
    next(error);
  }
};

// ADMIN: Получение пользователя по ID (только для администратора)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Подсчет активных выдач пользователя
    const activeBorrows = await Borrow.count({
      where: {
        user_id: user.id,
        status: 'active'
      }
    });

    // Подсчет просроченных выдач пользователя
    const currentDate = new Date();
    const overdueBorrows = await Borrow.count({
      where: {
        user_id: user.id,
        status: 'active',
        due_date: { [Op.lt]: currentDate }
      }
    });

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        activeBorrows,
        overdueBorrows
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении пользователя по ID:', error);
    next(error);
  }
};

// ADMIN: Создание нового пользователя (только для администратора)
exports.createUser = async (req, res, next) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      faculty, 
      specialization, 
      student_id, 
      phone, 
      year 
    } = req.body;

    // Проверка обязательных полей
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Имя, email и пароль обязательны'
      });
    }

    // Проверка, существует ли пользователь с таким email
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует'
      });
    }

    // Проверка, существует ли пользователь с таким student_id (если указан)
    if (student_id) {
      const existingUserByStudentId = await User.findOne({ where: { student_id } });
      if (existingUserByStudentId) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким ID студента уже существует'
        });
      }
    }

    // Создание пользователя
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      faculty,
      specialization,
      student_id,
      phone,
      year
    });

    // Исключаем пароль из ответа
    const { password: _, ...userData } = user.toJSON();

    res.status(201).json({
      success: true,
      data: userData
    });
  } catch (error) {
    logger.error('Ошибка при создании пользователя:', error);
    next(error);
  }
};

// ADMIN: Обновление пользователя (только для администратора)
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    const { 
      name, 
      email, 
      role, 
      faculty, 
      specialization, 
      student_id, 
      phone, 
      year,
      password
    } = req.body;

    // Проверка, существует ли другой пользователь с таким же email
    if (email && email !== user.email) {
      const existingUserByEmail = await User.findOne({ where: { email } });
      if (existingUserByEmail) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким email уже существует'
        });
      }
    }

    // Проверка, существует ли другой пользователь с таким же student_id
    if (student_id && student_id !== user.student_id) {
      const existingUserByStudentId = await User.findOne({ where: { student_id } });
      if (existingUserByStudentId) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким ID студента уже существует'
        });
      }
    }

    // Обновление пользователя
    const updateData = {
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
      faculty: faculty !== undefined ? faculty : user.faculty,
      specialization: specialization !== undefined ? specialization : user.specialization,
      student_id: student_id !== undefined ? student_id : user.student_id,
      phone: phone !== undefined ? phone : user.phone,
      year: year !== undefined ? year : user.year
    };

    // Если задан новый пароль
    if (password) {
      updateData.password = password;
    }

    await user.update(updateData);

    // Исключаем пароль из ответа
    const { password: _, ...userData } = user.toJSON();

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    logger.error('Ошибка при обновлении пользователя:', error);
    next(error);
  }
};

// ADMIN: Удаление пользователя (только для администратора)
exports.deleteUser = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const user = await User.findByPk(req.params.id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверка, есть ли у пользователя активные выдачи
    const activeBorrows = await Borrow.count({
      where: {
        user_id: user.id,
        status: 'active'
      },
      transaction
    });

    if (activeBorrows > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Невозможно удалить пользователя с активными выдачами книг'
      });
    }

    // Удаление аватара, если он существует
    if (user.avatar) {
      const avatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await user.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Пользователь успешно удален'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Ошибка при удалении пользователя:', error);
    next(error);
  }
};

module.exports = exports;