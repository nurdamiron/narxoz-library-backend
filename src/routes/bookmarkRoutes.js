/**
 * Бетбелгі маршруттары
 * 
 * @description Бұл файл пайдаланушылардың бетбелгілерін басқару үшін API маршруттарын анықтайды.
 * Бетбелгілерді қосу, жою, тексеру және т.б. маршруттарды қамтиды.
 */
const express = require('express');
const { body } = require('express-validator');
const {
  getBookmarks,
  addBookmark,
  deleteBookmark,
  toggleBookmark,
  checkBookmark,
  getAllBookmarks,
  deleteBookmarkByBookId,
  getTrendingBooks
} = require('../controllers/bookmarkController');
const { protect, authorize } = require('../middleware/auth');

// Маршрутизатор инициализациясы
const router = express.Router();

/**
 * Барлық маршруттарды қорғау
 * 
 * @description Төмендегі барлық маршруттар аутентификацияны талап етеді
 */
router.use(protect);

/**
 * Пайдаланушы бетбелгі маршруттары
 * 
 * @description Бетбелгілерді басқаруға арналған негізгі маршруттар
 */
router
  .route('/')
  .get(getBookmarks)
  .post(
    [body('bookId').isInt().withMessage('Жарамды кітап ID енгізіңіз')],
    addBookmark
  );

/**
 * Бетбелгіні жою
 * 
 * @description Бетбелгіні ID бойынша жою
 */
router.delete('/:id', deleteBookmark);

/**
 * Кітап ID бойынша бетбелгіні жою
 * 
 * @description Бетбелгіні кітап ID бойынша жою
 */
router.delete('/book/:bookId', deleteBookmarkByBookId);

/**
 * Бетбелгіні ауыстыру
 * 
 * @description Кітапты бетбелгіге қосу немесе жою (жоқ болса қосу, бар болса жою)
 */
router.post('/toggle/:bookId', toggleBookmark);

/**
 * Бетбелгіні тексеру
 * 
 * @description Кітаптың пайдаланушы үшін бетбелгіде бар-жоғын тексеру
 */
router.get('/check/:bookId', checkBookmark);

/**
 * Тек әкімші немесе кітапханашыға арналған маршруттар
 * 
 * @description Жүйенің барлық бетбелгілерін басқаруға арналған маршруттар
 */
router.get('/all', authorize('admin', 'librarian'), getAllBookmarks);

/**
 * Ең танымал кітаптарды алу
 * 
 * @description Ең көп бетбелгіге қосылған кітаптарды алу
 */
router.get('/trending', authorize('admin', 'librarian'), getTrendingBooks);

module.exports = router;