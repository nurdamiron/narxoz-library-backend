// controllers/reviewController.js
const { validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const { Sequelize, Op } = require('sequelize');
const Review = db.Review;
const Book = db.Book;
const User = db.User;

/**
 * @desc    Пікірлер тізімін алу
 * @route   GET /api/reviews
 * @access  Private/Admin
 * @description Бұл функция барлық пікірлерді тізімдейді. Тек әкімшілер қол
 * жеткізе алады. Нәтижелер бетке бөлінеді, сүзгілеу және сұрыптау опциялары
 * қолжетімді. Әдепкіше, пікірлер жасалған күні бойынша жаңасынан ескісіне
 * қарай сұрыпталады.
 */
exports.getReviews = async (req, res, next) => {
  try {
    // Сұраныс параметрлерін алу
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'DESC';
    
    // Сүзгілеу параметрлері
    const filter = {};
    
    if (req.query.bookId) {
      filter.bookId = req.query.bookId;
    }
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    if (req.query.isApproved !== undefined) {
      filter.isApproved = req.query.isApproved === 'true';
    }
    if (req.query.isReported !== undefined) {
      filter.isReported = req.query.isReported === 'true';
    }
    
    // Сұраныс опциялары
    const options = {
      limit,
      offset: startIndex,
      where: filter,
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    };
    
    // Барлық пікірлерді алу
    const reviews = await Review.findAndCountAll(options);
    
    // Пагинация үшін мета деректер
    const pagination = {};
    if (startIndex + limit < reviews.count) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      pagination,
      count: reviews.count,
      data: reviews.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Нақты пікірді алу
 * @route   GET /api/reviews/:id
 * @access  Private
 * @description Бұл функция берілген ID бойынша нақты пікірді қайтарады. 
 * Әкімшілер кез-келген пікірді көре алады, ал қарапайым пайдаланушылар 
 * тек өздері қалдырған немесе бекітілген пікірлерді көре алады.
 */
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!review) {
      return next(new ErrorResponse('Пікір табылмады', 404));
    }
    
    // Әкімші емес пайдаланушылар үшін рұқсат тексеру
    if (req.user.role !== 'admin') {
      // Пайдаланушы тек өз пікірлерін немесе бекітілген пікірлерді көре алады
      if (review.userId !== req.user.id && !review.isApproved) {
        return next(new ErrorResponse('Бұл пікірді көруге рұқсатыңыз жоқ', 403));
      }
    }
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Кітапқа қатысты барлық пікірлерді алу
 * @route   GET /api/books/:id/reviews
 * @access  Public
 * @description Бұл функция берілген кітап ID бойынша барлық бекітілген пікірлерді
 * қайтарады. Нәтижелер бетке бөлінеді және жасалған күні бойынша сұрыпталады.
 * Авторизацияланған пайдаланушы кез келген рөлде болса да, өзінің бекітілмеген
 * пікірлерін де көре алады.
 */
exports.getBookReviews = async (req, res, next) => {
  try {
    // Кітаптың бар-жоғын тексеру
    const book = await Book.findByPk(req.params.id);
    
    if (!book) {
      return next(new ErrorResponse('Кітап табылмады', 404));
    }
    
    // Сұраныс параметрлерін алу
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Сүзгілеу шарттары
    const filter = {
      bookId: req.params.id
    };
    
    // Аутентификацияланбаған пайдаланушылар тек бекітілген пікірлерді көре алады
    if (!req.user || req.user.role !== 'admin') {
      // Аутентификацияланған пайдаланушы өз пікірлерін де көре алады
      if (req.user) {
        filter[Op.or] = [
          { isApproved: true },
          { userId: req.user.id }
        ];
      } else {
        filter.isApproved = true;
      }
    }
    
    // Сұраныс опциялары
    const options = {
      limit,
      offset: startIndex,
      where: filter,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    };
    
    // Пікірлерді алу
    const reviews = await Review.findAndCountAll(options);
    
    // Пагинация үшін мета деректер
    const pagination = {};
    if (startIndex + limit < reviews.count) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      pagination,
      count: reviews.count,
      data: reviews.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Жаңа пікір қосу
 * @route   POST /api/reviews
 * @access  Private
 * @description Бұл функция авторизацияланған пайдаланушыға кітап туралы пікір
 * қалдыруға мүмкіндік береді. Пайдаланушы рейтингті (1-5) және пікір мәтінін
 * енгізуі қажет. Пікір әдепкіше бекітілмеген қалыпта жасалады және әкімші
 * бекіткеннен кейін ғана басқа пайдаланушыларға көрінеді.
 */
exports.createReview = async (req, res, next) => {
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
    
    const { bookId, rating, text } = req.body;
    
    if (!bookId || !rating || !text) {
      return next(new ErrorResponse('Барлық міндетті өрістерді толтырыңыз', 400));
    }
    
    // Кітаптың бар-жоғын тексеру
    const book = await Book.findByPk(bookId);
    if (!book) {
      return next(new ErrorResponse('Кітап табылмады', 404));
    }
    
    // Пайдаланушының бұрыннан бұл кітапқа пікір қалдырған-қалдырмағанын тексеру
    const existingReview = await Review.findOne({
      where: {
        bookId,
        userId: req.user.id
      }
    });
    
    if (existingReview) {
      return next(new ErrorResponse('Бұл кітапқа сіз бұрын пікір қалдырғансыз', 400));
    }
    
    // Жаңа пікір жасау
    const review = await Review.create({
      bookId,
      userId: req.user.id,
      rating: parseInt(rating, 10),
      text,
      isApproved: req.user.role === 'admin' // Әкімші пікірлері автоматты түрде бекітіледі
    });
    
    res.status(201).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Пікірді өңдеу
 * @route   PUT /api/reviews/:id
 * @access  Private
 * @description Бұл функция пайдаланушыға өзінің пікірін өңдеуге мүмкіндік береді.
 * Әкімшілер кез-келген пікірді өңдей алады. Пікір өңделген кезде, оның бекіту
 * мәртебесі қайта қарастырылуы керек, сондықтан әдепкіше бекітілмеген күйге өтеді,
 * тек әкімші өзгерткен жағдайда бекітілген күйін сақтайды.
 */
exports.updateReview = async (req, res, next) => {
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
    
    let review = await Review.findByPk(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse('Пікір табылмады', 404));
    }
    
    // Пайдаланушының осы пікірді өңдеуге рұқсаты бар-жоғын тексеру
    if (req.user.role !== 'admin' && review.userId !== req.user.id) {
      return next(new ErrorResponse('Бұл пікірді өңдеуге рұқсатыңыз жоқ', 403));
    }
    
    // Өңделетін өрістер
    const fieldsToUpdate = {};
    
    if (req.body.rating) {
      fieldsToUpdate.rating = parseInt(req.body.rating, 10);
    }
    if (req.body.text) {
      fieldsToUpdate.text = req.body.text;
    }
    
    // Әкімші үшін қосымша өрістер
    if (req.user.role === 'admin') {
      if (req.body.isApproved !== undefined) {
        fieldsToUpdate.isApproved = req.body.isApproved;
      }
      if (req.body.isReported !== undefined) {
        fieldsToUpdate.isReported = req.body.isReported;
      }
    } else {
      // Егер қарапайым пайдаланушы өңдесе, бекіту мәртебесін өзгерту (қайта модерациялау үшін)
      fieldsToUpdate.isApproved = false;
    }
    
    // Пікірді жаңарту
    review = await review.update(fieldsToUpdate);
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Пікірді жою
 * @route   DELETE /api/reviews/:id
 * @access  Private
 * @description Бұл функция пікірді жоюға мүмкіндік береді. Әкімшілер кез-келген 
 * пікірді жоя алады, ал қарапайым пайдаланушылар тек өздері қалдырған пікірлерді
 * жоя алады. Пікірді жою кезінде, кітаптың орташа рейтингі және пікірлер саны
 * автоматты түрде жаңартылады.
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse('Пікір табылмады', 404));
    }
    
    // Пайдаланушының осы пікірді жоюға рұқсаты бар-жоғын тексеру
    if (req.user.role !== 'admin' && review.userId !== req.user.id) {
      return next(new ErrorResponse('Бұл пікірді жоюға рұқсатыңыз жоқ', 403));
    }
    
    // Пікірді жою
    await review.destroy();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Пікірді бекіту немесе қабылдамау
 * @route   PUT /api/reviews/:id/approve
 * @access  Private/Admin
 * @description Бұл функция әкімшілерге пікірлерді бекітуге немесе қабылдамауға
 * мүмкіндік береді. Бекітілген пікірлер барлық пайдаланушыларға көрінеді және
 * кітаптың орташа рейтингіне әсер етеді. Тек әкімшілер бұл функцияға қол
 * жеткізе алады.
 */
exports.approveReview = async (req, res, next) => {
  try {
    // Тек әкімшілерге рұқсат беру
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Пікірді бекітуге рұқсатыңыз жоқ', 403));
    }
    
    const review = await Review.findByPk(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse('Пікір табылмады', 404));
    }
    
    // Пікірді бекіту/қабылдамау
    await review.update({
      isApproved: req.body.isApproved === true,
      isReported: false, // Бекіту кезінде шағым мәртебесін алып тастау
      reportReason: null
    });
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Пікірге шағым білдіру
 * @route   POST /api/reviews/:id/report
 * @access  Private
 * @description Бұл функция пайдаланушыларға пікірге шағым білдіруге мүмкіндік береді.
 * Пайдаланушы шағым себебін көрсетуі керек. Шағым білдірілген пікірлер әкімшілер
 * тарапынан қайта қаралады.
 */
exports.reportReview = async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return next(new ErrorResponse('Шағым себебін көрсетіңіз', 400));
    }
    
    const review = await Review.findByPk(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse('Пікір табылмады', 404));
    }
    
    // Пайдаланушы өз пікіріне шағым білдіре алмайды
    if (review.userId === req.user.id) {
      return next(new ErrorResponse('Өз пікіріңізге шағым білдіре алмайсыз', 400));
    }
    
    // Пікірге шағым белгісін қою
    await review.update({
      isReported: true,
      reportReason: reason
    });
    
    res.status(200).json({
      success: true,
      message: 'Шағымыңыз сәтті тіркелді'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Пайдаланушының өз пікірлерін алу
 * @route   GET /api/reviews/my
 * @access  Private
 * @description Бұл функция ағымдағы пайдаланушының барлық пікірлерін қайтарады.
 * Пайдаланушы өзінің барлық пікірлерін көре алады, соның ішінде бекітілмеген
 * және шағымдалған пікірлерді де.
 */
exports.getMyReviews = async (req, res, next) => {
  try {
    // Пайдаланушының барлық пікірлерін алу
    const reviews = await Review.findAll({
      where: {
        userId: req.user.id
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover']
        }
      ]
    });
    
    res.status(200).json(reviews);
  } catch (err) {
    next(err);
  }
};