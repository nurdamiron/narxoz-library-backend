/**
 * Миграция для обновления значений языков в существующих книгах
 * 
 * Эта миграция обновляет все записи с языком "Қазақша" на "Казахский"
 * для обеспечения совместимости с моделью базы данных
 */
const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Обновление значений языков в таблице Books...');
    
    try {
      // Получаем все книги с языком "Қазақша"
      const books = await queryInterface.sequelize.query(
        "SELECT id, language FROM Books WHERE language = 'Қазақша'",
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      console.log(`📚 Найдено ${books.length} книг с языком "Қазақша"`);
      
      if (books.length > 0) {
        // Обновляем язык на "Казахский"
        await queryInterface.sequelize.query(
          "UPDATE Books SET language = 'Казахский' WHERE language = 'Қазақша'",
          { type: Sequelize.QueryTypes.UPDATE }
        );
        
        console.log('✅ Язык успешно обновлен для всех книг');
      }
      
      // Также проверяем и обновляем "English" на "Английский" если есть
      const englishBooks = await queryInterface.sequelize.query(
        "SELECT id, language FROM Books WHERE language = 'English'",
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      console.log(`📚 Найдено ${englishBooks.length} книг с языком "English"`);
      
      if (englishBooks.length > 0) {
        await queryInterface.sequelize.query(
          "UPDATE Books SET language = 'Английский' WHERE language = 'English'",
          { type: Sequelize.QueryTypes.UPDATE }
        );
        
        console.log('✅ Язык "English" обновлен на "Английский"');
      }
      
    } catch (error) {
      console.error('❌ Ошибка при обновлении языков:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Откат изменений языков в таблице Books...');
    
    try {
      // Откатываем изменения
      await queryInterface.sequelize.query(
        "UPDATE Books SET language = 'Қазақша' WHERE language = 'Казахский'",
        { type: Sequelize.QueryTypes.UPDATE }
      );
      
      await queryInterface.sequelize.query(
        "UPDATE Books SET language = 'English' WHERE language = 'Английский'",
        { type: Sequelize.QueryTypes.UPDATE }
      );
      
      console.log('✅ Откат изменений выполнен успешно');
    } catch (error) {
      console.error('❌ Ошибка при откате изменений:', error);
      throw error;
    }
  }
};