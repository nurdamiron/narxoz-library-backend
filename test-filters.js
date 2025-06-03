/**
 * Скрипт для тестирования фильтров книг
 */
const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

async function testFilters() {
  try {
    console.log('\n🔍 Тестирование фильтров книг...\n');

    // 1. Получить опции фильтров
    console.log('1. Получение доступных языков и годов...');
    const filterOptions = await axios.get(`${API_URL}/books/filter-options`);
    console.log('✅ Доступные языки:', filterOptions.data.data.languages);
    console.log('✅ Доступные годы:', filterOptions.data.data.years.slice(0, 10), '...');
    
    const languages = filterOptions.data.data.languages;
    const years = filterOptions.data.data.years;

    // 2. Тест фильтрации по языку
    if (languages.length > 0) {
      console.log('\n2. Тестирование фильтрации по языку...');
      for (const lang of languages) {
        const response = await axios.get(`${API_URL}/books`, {
          params: { language: lang, limit: 5 }
        });
        console.log(`✅ Язык "${lang}": найдено ${response.data.total} книг`);
      }
    }

    // 3. Тест фильтрации по году
    if (years.length > 0) {
      console.log('\n3. Тестирование фильтрации по году...');
      const testYear = years[0]; // Берем самый новый год
      const response = await axios.get(`${API_URL}/books`, {
        params: { year: testYear, limit: 5 }
      });
      console.log(`✅ Год ${testYear}: найдено ${response.data.total} книг`);
    }

    // 4. Комбинированный фильтр
    if (languages.length > 0 && years.length > 0) {
      console.log('\n4. Тестирование комбинированного фильтра...');
      const response = await axios.get(`${API_URL}/books`, {
        params: { 
          language: languages[0], 
          year: years[0],
          limit: 5 
        }
      });
      console.log(`✅ Язык "${languages[0]}" + Год ${years[0]}: найдено ${response.data.total} книг`);
    }

    // 5. Проверка всех книг без фильтров
    console.log('\n5. Получение всех книг без фильтров...');
    const allBooks = await axios.get(`${API_URL}/books`, {
      params: { limit: 100 }
    });
    console.log(`✅ Всего книг в базе: ${allBooks.data.total}`);
    
    // Анализ языков в базе
    const languageStats = {};
    allBooks.data.data.forEach(book => {
      languageStats[book.language] = (languageStats[book.language] || 0) + 1;
    });
    console.log('\n📊 Статистика по языкам:');
    Object.entries(languageStats).forEach(([lang, count]) => {
      console.log(`   - ${lang}: ${count} книг`);
    });

    console.log('\n✅ Все тесты успешно пройдены!');

  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
  }
}

// Запуск тестов
testFilters();