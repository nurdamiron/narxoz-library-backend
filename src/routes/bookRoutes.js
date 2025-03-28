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
  bookCoverUpload,
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
    .withMessage('Жалпы даналар саны кем дегенде 1 болуы керек'),
  body('isbn')
    .optional()
    .custom((value) => {
      // ISBN болмаса немесе бос болса
      if (!value || value.trim() === '') {
        return true;
      }
      
      // ISBN форматын тексеру
      const cleanedISBN = value.replace(/[-\s]/g, '');
      
      if (cleanedISBN.length !== 10 && cleanedISBN.length !== 13) {
        throw new Error('ISBN 10 немесе 13 санды болуы керек');
      }
      
      // ISBN-10 тексеру
      if (cleanedISBN.length === 10) {
        if (!/^[0-9]{9}[0-9X]$/.test(cleanedISBN)) {
          throw new Error('ISBN-10 форматы дұрыс емес');
        }
      } 
      // ISBN-13 тексеру
      else if (!/^[0-9]{13}$/.test(cleanedISBN)) {
        throw new Error('ISBN-13 форматы дұрыс емес');
      }
      
      return true;
    })
    .withMessage('Жарамды ISBN нөмірін енгізіңіз')
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
  .post(protect, authorize('admin', 'librarian'), categoryValidation, createCategory);

router
  .route('/categories/:id')
  .put(protect, authorize('admin', 'librarian'), categoryValidation, updateCategory)
  .delete(protect, authorize('admin', 'librarian'), deleteCategory);

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
  .post(protect, authorize('admin', 'librarian'), bookValidation, createBook);

router
  .route('/:id')
  .get(getBook)
  .put(protect, authorize('admin', 'librarian'), updateBook)
  .delete(protect, authorize('admin', 'librarian'), deleteBook);

/**
 * Кітап мұқабасын жүктеу
 * 
 * @description Кітап мұқабасын жүктеу үшін маршрут
 */
router.put(
  '/:id/cover',
  protect,
  authorize('admin', 'librarian'),
  bookCoverUpload
);

/**
 * Кітап қорын жаңарту
 * 
 * @description Кітаптың қолжетімді даналар санын жаңарту үшін маршрут
 */
router.put(
  '/:id/inventory',
  protect,
  authorize('admin', 'librarian'),
  updateInventory
);

module.exports = router;