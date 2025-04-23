// controllers/categoryController.js
const { validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const Category = db.Category;
const Book = db.Book;

/**
 * @desc    Барлық санаттарды алу
 * @route   GET /api/books/categories
 * @access  Public
 * @description Бұл функция барлық санаттарды тізімдейді. Барлық
 * пайдаланушылар санаттарды көре алады. Нәтижелер атау бойынша сұрыпталады.
 */
exports.getCategories = async (req, res, next) => {
  try {
    // Барлық санаттарды алу
    const categories = await Category.findAll({
      order: [['name', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Нақты санатты алу
 * @route   GET /api/books/categories/:id
 * @access  Public
 * @description Бұл функция берілген ID бойынша нақты санатты қайтарады.
 * Санатпен бірге оған қатысты кітаптар да қайтарылуы мүмкін.
 */
exports.getCategory = async (req, res, next) => {
  try {
    // Санатты кітаптармен бірге алу
    const category = await Category.findByPk(req.params.id, {
      include: req.query.includeBooks === 'true' ? [
        {
          model: Book,
          as: 'books',
          attributes: ['id', 'title', 'author', 'cover', 'rating', 'reviewCount']
        }
      ] : []
    });
    
    if (!category) {
      return next(new ErrorResponse('Санат табылмады', 404));
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жаңа санат жасау
 * @route   POST /api/books/categories
 * @access  Private/Admin
 * @description Бұл функция жаңа санат жасауға мүмкіндік береді.
 * Тек әкімшілер санаттарды жасай алады.
 */
exports.createCategory = async (req, res, next) => {
  try {
    // Валидация нәтижелерін тексеру
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          param: err.param,
          message: err.msg
        }))
      });
    }
    
    const { name, description } = req.body;
    
    if (!name) {
      return next(new ErrorResponse('Санат атауын енгізіңіз', 400));
    }
    
    // Санат атауының бірегейлігін тексеру
    const existingCategory = await Category.findOne({
      where: {
        name
      }
    });
    
    if (existingCategory) {
      return next(new ErrorResponse('Бұл атаумен санат бұрыннан бар', 400));
    }
    
    // Жаңа санат жасау
    const category = await Category.create({
      name,
      description
    });
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Санатты жаңарту
 * @route   PUT /api/books/categories/:id
 * @access  Private/Admin
 * @description Бұл функция санат ақпаратын жаңартуға мүмкіндік береді.
 * Тек әкімшілер санаттарды жаңарта алады.
 */
exports.updateCategory = async (req, res, next) => {
  try {
    // Валидация нәтижелерін тексеру
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          param: err.param,
          message: err.msg
        }))
      });
    }
    
    let category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return next(new ErrorResponse('Санат табылмады', 404));
    }
    
    // Жаңартылатын өрістер
    const fieldsToUpdate = {};
    
    if (req.body.name) {
      // Атау өзгертілген жағдайда бірегейлікті тексеру
      if (req.body.name !== category.name) {
        const existingCategory = await Category.findOne({
          where: {
            name: req.body.name
          }
        });
        
        if (existingCategory) {
          return next(new ErrorResponse('Бұл атаумен санат бұрыннан бар', 400));
        }
      }
      
      fieldsToUpdate.name = req.body.name;
    }
    
    if (req.body.description !== undefined) {
      fieldsToUpdate.description = req.body.description;
    }
    
    // Санатты жаңарту
    category = await category.update(fieldsToUpdate);
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Санатты жою
 * @route   DELETE /api/books/categories/:id
 * @access  Private/Admin
 * @description Бұл функция санатты жоюға мүмкіндік береді.
 * Тек әкімшілер санаттарды жоя алады. Санатты жою алдында,
 * оған қатысты кітаптар болмауы керек.
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return next(new ErrorResponse('Санат табылмады', 404));
    }
    
    // Санатта кітаптар бар-жоғын тексеру
    const books = await Book.count({
      where: {
        categoryId: req.params.id
      }
    });
    
    if (books > 0) {
      return next(new ErrorResponse('Бұл санатта кітаптар бар, оны жою мүмкін емес', 400));
    }
    
    // Санатты жою
    await category.destroy();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Санаттар статистикасын алу
 * @route   GET /api/books/categories/stats
 * @access  Private/Admin
 * @description Бұл функция әр санаттағы кітаптар санын көрсететін
 * статистиканы қайтарады. Бұл әкімші панеліндегі диаграммаларда
 * пайдаланылады.
 */
exports.getCategoryStats = async (req, res, next) => {
  try {
    const stats = await db.sequelize.query(`
      SELECT c.id, c.name, COUNT(b.id) as bookCount
      FROM Categories c
      LEFT JOIN Books b ON c.id = b.categoryId
      GROUP BY c.id, c.name
      ORDER BY bookCount DESC
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};