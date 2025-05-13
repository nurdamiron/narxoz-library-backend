/**
 * Кітап және категория маршруттары
 * 
 * @description Бұл файл кітаптар мен категорияларды басқару 
 * үшін API маршруттарын анықтайды
 */
const express = require('express');
const { body } = require('express-validator');
const {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  uploadBookCover,
  getPopularBooks,
  getNewBooks,
  updateInventory,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/auth');

// Маршрутизатор инициализациясы
const router = express.Router();

/**
 * Кітап валидация ережелері
 * 
 * @description Кітапты жасау/жаңарту кезінде енгізілген деректерді тексеру ережелері
 */
const bookValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Атауы 2-100 таңба аралығында болуы керек'),
  body('author')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Автор аты 2-100 таңба аралығында болуы керек'),
  body('categoryId')
    .isInt()
    .withMessage('Жарамды категория ID енгізіңіз'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Сипаттама енгізіңіз'),
  body('publicationYear')
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage('Жарамды жарияланған жыл енгізіңіз'),
  body('language')
    .isIn(['Русский', 'Английский', 'Казахский'])
    .withMessage('Жарамды тіл таңдаңыз'),
  body('totalCopies')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Жалпы даналар саны кем дегенде 1 болуы керек')
];

/**
 * Категория валидация ережелері
 * 
 * @description Категорияны жасау/жаңарту кезінде енгізілген деректерді тексеру ережелері
 */
const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Категория атауы 2-50 таңба аралығында болуы керек'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Сипаттама 500 таңбадан аспауы керек')
];

/**
 * Категориялар үшін маршруттар
 * 
 * @description Категорияларды басқару маршруттары
 */
router
  .route('/categories')
  .get(getCategories)
  .post(protect, authorize('admin', 'librarian', 'moderator'), categoryValidation, createCategory);

router
  .route('/categories/:id')
  .put(protect, authorize('admin', 'librarian', 'moderator'), categoryValidation, updateCategory)
  .delete(protect, authorize('admin', 'librarian', 'moderator'), deleteCategory);


/**
 * Танымал және жаңа кітаптар үшін маршруттар
 * 
 * @description Танымал және жаңа қосылған кітаптарды алу маршруттары
 */
router.get('/popular', getPopularBooks);
router.get('/new', getNewBooks);

/**
 * Кітап CRUD маршруттары
 * 
 * @description Кітаптарды басқару үшін негізгі маршруттар
 */
router
  .route('/')
  .get(getBooks)
  .post(protect, authorize('admin', 'librarian', 'moderator'), bookValidation, createBook);

router
  .route('/:id')
  .get(getBook)
  .put(protect, authorize('admin', 'librarian', 'moderator'), updateBook)
  .delete(protect, authorize('admin', 'librarian', 'moderator'), deleteBook);

/**
 * Кітаптың пікірлерін алу
 * 
 * @description Кітап үшін барлық пікірлерді алу
 */
router.get('/:id/reviews', require('../controllers/reviewController').getBookReviews);

/**
 * Кітап мұқабасын жүктеу
 * 
 * @description Кітап мұқабасын жүктеу үшін маршрут
 */
router.put(
  '/:id/cover',
  protect,
  authorize('admin', 'librarian', 'moderator'),
  uploadBookCover
);

/**
 * Кітап қорын жаңарту
 * 
 * @description Кітаптың қолжетімді даналар санын жаңарту үшін маршрут
 */
router.put(
  '/:id/inventory',
  protect,
  authorize('admin', 'librarian', 'moderator'),
  updateInventory
);

module.exports = router;