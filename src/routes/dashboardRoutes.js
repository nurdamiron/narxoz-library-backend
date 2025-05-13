/**
 * Дашборд маршруттары
 * 
 * @description Бұл файл әкімші панеліне арналған статистикалық деректерді алу үшін API маршруттарын анықтайды.
 */
const express = require('express');
const {
  getDashboardStats,
  getYearlyStats,
  getCategoryStats
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

// Маршрутизатор инициализациясы
const router = express.Router();

/**
 * Барлық маршруттарды қорғау
 * 
 * @description Төмендегі барлық маршруттар аутентификацияны және әкімші рөлін талап етеді
 */
router.use(protect, authorize('admin', 'librarian', 'moderator'));

/**
 * Статистика маршруттары
 * 
 * @description Әртүрлі статистикалық деректерді алу маршруттары
 */
router.get('/stats', getDashboardStats);
router.get('/yearly-stats', getYearlyStats);
router.get('/category-stats', getCategoryStats);

module.exports = router;