// Продолжение файла controllers/categoryController.js

// Получение категорий с количеством книг
exports.getCategoriesWithBookCount = async (req, res, next) => {
    try {
      const categories = await Category.findAll({
        attributes: {
          include: [
            [sequelize.fn('COUNT', sequelize.col('Books.id')), 'book_count']
          ]
        },
        include: [
          { 
            model: Book,
            attributes: [] // Не включаем атрибуты книг, только считаем их
          }
        ],
        group: ['Category.id'],
        order: [['name', 'ASC']]
      });
      
      res.json({
        success: true,
        count: categories.length,
        data: categories
      });
    } catch (error) {
      logger.error('Ошибка при получении категорий с количеством книг:', error);
      next(error);
    }
  };
  
  module.exports = exports;