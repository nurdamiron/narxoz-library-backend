/**
 * Қарызға алу маршруттары
 * 
 * @description Бұл файл кітапты қарызға алу операцияларын басқару үшін API маршруттарын анықтайды.
 * Кітапты қарызға алу, қайтару, ұзарту және статистиканы алу маршруттарын қамтиды.
 */
const express = require('express');
const { body } = require('express-validator');
const {
  borrowBook,
  returnBook,
  getUserBorrows,
  getAllBorrows,
  getBorrow,
  updateBorrow,
  checkOverdueBorrows,
  sendDueReminders,
  getBorrowStats,
  extendBorrow
} = require('../controllers/borrowController');
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
 * Жүйенің барлық қарызға алуларын алу (админдер мен кітапханашылар үшін)
 * ВАЖНО: Этот маршрут должен быть определен до маршрутов с :id, чтобы избежать конфликтов
 */
router.get('/', getAllBorrows, getUserBorrows);

/**
 * Пайдаланушы қарызға алу маршруттары
 * 
 * @description Пайдаланушының қарызға алуларын басқаруға арналған маршруттар
 */
router.post(
  '/',
  [body('bookId').isInt().withMessage('Жарамды кітап ID енгізіңіз')],
  borrowBook
);

/**
 * Тек әкімші немесе кітапханашыға арналған маршруттар
 * 
 * @description Жүйенің барлық қарызға алуларын басқаруға арналған маршруттар
 */
router.get('/check-overdue', authorize('admin', 'librarian'), checkOverdueBorrows);
router.get('/send-reminders', authorize('admin', 'librarian'), sendDueReminders);
router.get('/stats', authorize('admin', 'librarian'), getBorrowStats);

/**
 * Жеке қарызға алу операцияларын басқару
 * 
 * @description Жеке қарызға алу жазбасын алу, қайтару және ұзарту маршруттары
 */
router.get('/:id', getBorrow);
router.put('/:id/return', returnBook);
router.put('/:id/extend', extendBorrow);
router.put('/:id', authorize('admin', 'librarian'), updateBorrow);

module.exports = router;