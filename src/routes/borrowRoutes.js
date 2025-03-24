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
 * Пайдаланушы қарызға алу маршруттары
 * 
 * @description Пайдаланушының қарызға алуларын басқаруға арналған маршруттар
 */
router
  .route('/')
  .get(getUserBorrows)
  .post(
    [body('bookId').isInt().withMessage('Жарамды кітап ID енгізіңіз')],
    borrowBook
  );

/**
 * Жеке қарызға алу операцияларын басқару
 * 
 * @description Жеке қарызға алу жазбасын алу, қайтару және ұзарту маршруттары
 */
router.get('/:id', getBorrow);
router.put('/:id/return', returnBook);
router.put('/:id/extend', extendBorrow);

/**
 * Тек әкімші немесе кітапханашыға арналған маршруттар
 * 
 * @description Жүйенің барлық қарызға алуларын басқаруға арналған маршруттар
 */
router.get('/all', authorize('admin', 'librarian'), getAllBorrows);
router.put('/:id', authorize('admin', 'librarian'), updateBorrow);
router.get('/check-overdue', authorize('admin', 'librarian'), checkOverdueBorrows);
router.get('/send-reminders', authorize('admin', 'librarian'), sendDueReminders);
router.get('/stats', authorize('admin', 'librarian'), getBorrowStats);

module.exports = router;