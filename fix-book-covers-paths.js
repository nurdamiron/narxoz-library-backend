/**
 * Скрипт для исправления путей к обложкам книг в базе данных
 * Убирает debug URL и оставляет только относительные пути
 */

const db = require('./src/models');

async function fixBookCoverPaths() {
  try {
    console.log('🔧 Запуск исправления путей к обложкам книг...\n');
    
    // Получаем все книги
    const books = await db.Book.findAll();
    console.log(`📚 Найдено книг: ${books.length}\n`);
    
    let fixedCount = 0;
    
    for (const book of books) {
      if (book.cover) {
        let oldCover = book.cover;
        let newCover = oldCover;
        
        // Проверяем, содержит ли путь /api/book-cover-debug/
        if (oldCover.includes('/api/book-cover-debug/')) {
          // Извлекаем имя файла из URL
          const parts = oldCover.split('/');
          const filename = parts[parts.length - 1];
          
          // Создаем правильный относительный путь
          newCover = `/uploads/covers/${filename}`;
          
          // Обновляем запись в базе данных
          await book.update({ cover: newCover });
          
          console.log(`✅ Книга ID ${book.id} "${book.title}":`);
          console.log(`   Старый путь: ${oldCover}`);
          console.log(`   Новый путь: ${newCover}\n`);
          
          fixedCount++;
        }
        // Также проверяем абсолютные URL на localhost
        else if (oldCover.includes('http://localhost') && oldCover.includes('/uploads/covers/')) {
          // Извлекаем относительный путь
          const match = oldCover.match(/\/uploads\/covers\/[^?#]+/);
          if (match) {
            newCover = match[0];
            
            await book.update({ cover: newCover });
            
            console.log(`✅ Книга ID ${book.id} "${book.title}":`);
            console.log(`   Старый путь: ${oldCover}`);
            console.log(`   Новый путь: ${newCover}\n`);
            
            fixedCount++;
          }
        }
      }
    }
    
    if (fixedCount > 0) {
      console.log(`✨ Исправлено путей: ${fixedCount}`);
    } else {
      console.log('✨ Все пути уже корректны!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
fixBookCoverPaths();