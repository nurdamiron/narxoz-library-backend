const express = require('express');
const router = express.Router();
const bookController = require('../../controllers/bookController');
const { protect, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/fileUpload');

// Маршруты для популярных и недавних книг доступны всем
router.get('/popular', bookController.getPopularBooks);
router.get('/recent', bookController.getRecentBooks);

// Маршрут для поиска книг
router.get('/search', bookController.searchBooks);

// Получение списка всех книг с фильтрацией и пагинацией
router.get('/', bookController.getAllBooks);

// Получение книги по ID
router.get('/:id', bookController.getBookById);

// Ниже идут маршруты, требующие авторизации и определенной роли

// Создание новой книги (только для администраторов и библиотекарей)
router.post(
  '/',
  protect,
  authorize('admin', 'librarian'),
  upload.single('cover'),
  bookController.createBook
);

// Обновление книги (только для администраторов и библиотекарей)
router.put(
  '/:id',
  protect,
  authorize('admin', 'librarian'),
  upload.single('cover'),
  bookController.updateBook
);

// Удаление книги (только для администраторов и библиотекарей)
router.delete(
  '/:id',
  protect,
  authorize('admin', 'librarian'),
  bookController.deleteBook
);

module.exports = router;