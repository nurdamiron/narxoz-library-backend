/**
 * Скрипт для запуска миграции обновления языков
 * 
 * Использование: node run-language-migration.js
 */
const path = require('path');
const db = require('./src/models');

async function runMigration() {
  try {
    console.log('🚀 Запуск миграции для обновления языков книг...\n');
    
    // Проверяем соединение с базой данных
    await db.sequelize.authenticate();
    console.log('✅ Соединение с базой данных установлено\n');
    
    // Получаем статистику по текущим языкам
    console.log('📊 Текущая статистика по языкам:');
    const languageStats = await db.Book.findAll({
      attributes: [
        'language',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['language'],
      raw: true
    });
    
    languageStats.forEach(stat => {
      console.log(`   - ${stat.language}: ${stat.count} книг`);
    });
    console.log('');
    
    // Обновляем книги с языком "Қазақша" на "Казахский"
    const kazakhBooks = await db.Book.findAll({
      where: { language: 'Қазақша' }
    });
    
    if (kazakhBooks.length > 0) {
      console.log(`🔄 Обновление ${kazakhBooks.length} книг с языком "Қазақша" на "Казахский"...`);
      
      for (const book of kazakhBooks) {
        try {
          await book.update({ language: 'Казахский' });
        } catch (error) {
          console.error(`❌ Ошибка при обновлении книги "${book.title}" (ID: ${book.id}):`, error.message);
        }
      }
      
      console.log('✅ Обновление завершено\n');
    } else {
      console.log('ℹ️  Книги с языком "Қазақша" не найдены\n');
    }
    
    // Обновляем книги с языком "English" на "Английский"
    const englishBooks = await db.Book.findAll({
      where: { language: 'English' }
    });
    
    if (englishBooks.length > 0) {
      console.log(`🔄 Обновление ${englishBooks.length} книг с языком "English" на "Английский"...`);
      
      for (const book of englishBooks) {
        try {
          await book.update({ language: 'Английский' });
        } catch (error) {
          console.error(`❌ Ошибка при обновлении книги "${book.title}" (ID: ${book.id}):`, error.message);
        }
      }
      
      console.log('✅ Обновление завершено\n');
    } else {
      console.log('ℹ️  Книги с языком "English" не найдены\n');
    }
    
    // Показываем обновленную статистику
    console.log('📊 Обновленная статистика по языкам:');
    const updatedStats = await db.Book.findAll({
      attributes: [
        'language',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['language'],
      raw: true
    });
    
    updatedStats.forEach(stat => {
      console.log(`   - ${stat.language}: ${stat.count} книг`);
    });
    
    console.log('\n✅ Миграция успешно завершена!');
    
  } catch (error) {
    console.error('\n❌ Ошибка при выполнении миграции:', error);
    process.exit(1);
  } finally {
    // Закрываем соединение с базой данных
    await db.sequelize.close();
  }
}

// Запускаем миграцию
runMigration();