const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Конфигурация
const BASE_URL = 'http://localhost:5001/api';
const TEST_TIMEOUT = 5000;

// Тестовые данные пользователей
const testUsers = {
  admin: {
    email: 'admin@narxoz.kz',
    password: 'admin123'
  },
  moderator: {
    email: 'moderator@narxoz.kz', 
    password: 'moderator123'
  },
  student: {
    email: 'student@narxoz.kz',
    password: 'student123'
  }
};

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Результаты тестов
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Вспомогательные функции
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getAuthHeader(email, password) {
  const credentials = Buffer.from(`${email}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

async function testEndpoint(description, testFn) {
  try {
    log(`\nТестирование: ${description}`, 'blue');
    const result = await testFn();
    if (result.success) {
      log(`✅ УСПЕШНО: ${result.message}`, 'green');
      testResults.passed.push({ description, message: result.message });
    } else {
      log(`❌ ОШИБКА: ${result.message}`, 'red');
      testResults.failed.push({ description, message: result.message, details: result.details });
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    log(`❌ ИСКЛЮЧЕНИЕ: ${errorMessage}`, 'red');
    testResults.failed.push({ 
      description, 
      message: errorMessage, 
      details: error.response?.data || error.stack 
    });
  }
}

// Основная функция тестирования
async function runAllTests() {
  log('\n===== НАЧАЛО ТЕСТИРОВАНИЯ ВСЕХ ЭНДПОИНТОВ =====\n', 'magenta');

  // 1. Тестирование Auth эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ АУТЕНТИФИКАЦИИ ---', 'yellow');
  
  await testEndpoint('POST /auth/login - Вход с правильными данными', async () => {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUsers.admin.email,
      password: testUsers.admin.password
    });
    return {
      success: response.status === 200 && response.data.success,
      message: 'Успешный вход администратора'
    };
  });

  await testEndpoint('POST /auth/login - Вход с неправильными данными', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'wrong@email.com',
        password: 'wrongpass'
      });
      return { success: false, message: 'Должна была быть ошибка' };
    } catch (error) {
      return {
        success: error.response?.status === 401 || error.response?.status === 400,
        message: 'Правильно отклонен неверный логин'
      };
    }
  });

  await testEndpoint('GET /auth/me - Получение профиля без авторизации', async () => {
    try {
      await axios.get(`${BASE_URL}/auth/me`);
      return { success: false, message: 'Должна была быть ошибка авторизации' };
    } catch (error) {
      return {
        success: error.response?.status === 401,
        message: 'Правильно требует авторизацию'
      };
    }
  });

  await testEndpoint('GET /auth/me - Получение профиля с авторизацией', async () => {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: getAuthHeader(testUsers.admin.email, testUsers.admin.password)
      }
    });
    return {
      success: response.status === 200 && response.data.data?.email === testUsers.admin.email,
      message: 'Профиль успешно получен'
    };
  });

  await testEndpoint('POST /auth/check-email - Проверка существующего email', async () => {
    const response = await axios.post(`${BASE_URL}/auth/check-email`, {
      email: testUsers.admin.email
    });
    return {
      success: response.status === 200 && response.data.exists === true,
      message: 'Email существование проверено'
    };
  });

  // 2. Тестирование Books эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ КНИГ ---', 'yellow');

  await testEndpoint('GET /books - Получение списка книг', async () => {
    const response = await axios.get(`${BASE_URL}/books`);
    return {
      success: response.status === 200 && Array.isArray(response.data.data),
      message: `Получено ${response.data.data?.length || 0} книг`
    };
  });

  await testEndpoint('GET /books/categories - Получение категорий', async () => {
    const response = await axios.get(`${BASE_URL}/books/categories`);
    return {
      success: response.status === 200 && Array.isArray(response.data.data),
      message: `Получено ${response.data.data?.length || 0} категорий`
    };
  });

  await testEndpoint('GET /books/popular - Получение популярных книг', async () => {
    const response = await axios.get(`${BASE_URL}/books/popular`);
    return {
      success: response.status === 200 && Array.isArray(response.data.data),
      message: `Получено ${response.data.data?.length || 0} популярных книг`
    };
  });

  await testEndpoint('GET /books/new - Получение новых книг', async () => {
    const response = await axios.get(`${BASE_URL}/books/new`);
    return {
      success: response.status === 200 && Array.isArray(response.data.data),
      message: `Получено ${response.data.data?.length || 0} новых книг`
    };
  });

  await testEndpoint('POST /books - Создание книги без авторизации', async () => {
    try {
      await axios.post(`${BASE_URL}/books`, {
        title: 'Test Book',
        author: 'Test Author'
      });
      return { success: false, message: 'Должна была быть ошибка авторизации' };
    } catch (error) {
      return {
        success: error.response?.status === 401,
        message: 'Правильно требует авторизацию'
      };
    }
  });

  // 3. Тестирование Events эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ СОБЫТИЙ ---', 'yellow');

  await testEndpoint('GET /events - Получение списка событий', async () => {
    const response = await axios.get(`${BASE_URL}/events`);
    return {
      success: response.status === 200 && Array.isArray(response.data.data),
      message: `Получено ${response.data.data?.length || 0} событий`
    };
  });

  await testEndpoint('GET /events/categories - Получение категорий событий', async () => {
    const response = await axios.get(`${BASE_URL}/events/categories`);
    return {
      success: response.status === 200 && Array.isArray(response.data.data),
      message: `Получено ${response.data.data?.length || 0} категорий событий`
    };
  });

  await testEndpoint('POST /events - Создание события без авторизации', async () => {
    try {
      await axios.post(`${BASE_URL}/events`, {
        title: 'Test Event'
      });
      return { success: false, message: 'Должна была быть ошибка авторизации' };
    } catch (error) {
      return {
        success: error.response?.status === 401,
        message: 'Правильно требует авторизацию для создания события'
      };
    }
  });

  // 4. Тестирование Borrows эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ ЗАЙМОВ ---', 'yellow');

  await testEndpoint('GET /borrows - Получение займов без авторизации', async () => {
    try {
      await axios.get(`${BASE_URL}/borrows`);
      return { success: false, message: 'Должна была быть ошибка авторизации' };
    } catch (error) {
      return {
        success: error.response?.status === 401,
        message: 'Правильно требует авторизацию'
      };
    }
  });

  await testEndpoint('GET /borrows - Получение займов с авторизацией', async () => {
    const response = await axios.get(`${BASE_URL}/borrows`, {
      headers: {
        Authorization: getAuthHeader(testUsers.student.email, testUsers.student.password)
      }
    });
    return {
      success: response.status === 200 && Array.isArray(response.data.data),
      message: `Получено ${response.data.data?.length || 0} займов`
    };
  });

  // 5. Тестирование Reviews эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ ОТЗЫВОВ ---', 'yellow');

  await testEndpoint('GET /reviews/my - Мои отзывы без авторизации', async () => {
    try {
      await axios.get(`${BASE_URL}/reviews/my`);
      return { success: false, message: 'Должна была быть ошибка авторизации' };
    } catch (error) {
      return {
        success: error.response?.status === 401,
        message: 'Правильно требует авторизацию'
      };
    }
  });

  // 6. Тестирование Bookmarks эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ ЗАКЛАДОК ---', 'yellow');

  await testEndpoint('GET /bookmarks - Получение закладок без авторизации', async () => {
    try {
      await axios.get(`${BASE_URL}/bookmarks`);
      return { success: false, message: 'Должна была быть ошибка авторизации' };
    } catch (error) {
      return {
        success: error.response?.status === 401,
        message: 'Правильно требует авторизацию'
      };
    }
  });

  // 7. Тестирование Notifications эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ УВЕДОМЛЕНИЙ ---', 'yellow');

  await testEndpoint('GET /notifications - Получение уведомлений без авторизации', async () => {
    try {
      await axios.get(`${BASE_URL}/notifications`);
      return { success: false, message: 'Должна была быть ошибка авторизации' };
    } catch (error) {
      return {
        success: error.response?.status === 401,
        message: 'Правильно требует авторизацию'
      };
    }
  });

  // 8. Тестирование Users эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ ПОЛЬЗОВАТЕЛЕЙ ---', 'yellow');

  await testEndpoint('GET /users/me - Мой профиль без авторизации', async () => {
    try {
      await axios.get(`${BASE_URL}/users/me`);
      return { success: false, message: 'Должна была быть ошибка авторизации' };
    } catch (error) {
      return {
        success: error.response?.status === 401,
        message: 'Правильно требует авторизацию'
      };
    }
  });

  await testEndpoint('GET /users - Список пользователей как админ', async () => {
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: {
        Authorization: getAuthHeader(testUsers.admin.email, testUsers.admin.password)
      }
    });
    return {
      success: response.status === 200 && Array.isArray(response.data.data),
      message: `Получено ${response.data.data?.length || 0} пользователей`
    };
  });

  // 9. Тестирование Dashboard эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ ДАШБОРДА ---', 'yellow');

  await testEndpoint('GET /dashboard/stats - Статистика без авторизации', async () => {
    try {
      await axios.get(`${BASE_URL}/dashboard/stats`);
      return { success: false, message: 'Должна была быть ошибка авторизации' };
    } catch (error) {
      return {
        success: error.response?.status === 401,
        message: 'Правильно требует авторизацию'
      };
    }
  });

  await testEndpoint('GET /dashboard/stats - Статистика как админ', async () => {
    const response = await axios.get(`${BASE_URL}/dashboard/stats`, {
      headers: {
        Authorization: getAuthHeader(testUsers.admin.email, testUsers.admin.password)
      }
    });
    return {
      success: response.status === 200 && response.data.data,
      message: 'Статистика получена успешно'
    };
  });

  // 10. Тестирование Categories эндпоинтов
  log('\n--- ТЕСТИРОВАНИЕ КАТЕГОРИЙ ---', 'yellow');

  await testEndpoint('GET /categories - Получение категорий', async () => {
    const response = await axios.get(`${BASE_URL}/categories`);
    return {
      success: response.status === 200 && Array.isArray(response.data.data),
      message: `Получено ${response.data.data?.length || 0} категорий`
    };
  });

  // Итоговый отчет
  log('\n\n===== ИТОГОВЫЙ ОТЧЕТ =====', 'magenta');
  log(`\nВсего тестов: ${testResults.passed.length + testResults.failed.length}`, 'blue');
  log(`Успешных: ${testResults.passed.length}`, 'green');
  log(`Неудачных: ${testResults.failed.length}`, 'red');
  
  if (testResults.failed.length > 0) {
    log('\n--- ДЕТАЛИ НЕУДАЧНЫХ ТЕСТОВ ---', 'red');
    testResults.failed.forEach((test, index) => {
      log(`\n${index + 1}. ${test.description}`, 'red');
      log(`   Ошибка: ${test.message}`, 'red');
      if (test.details) {
        log(`   Детали: ${JSON.stringify(test.details, null, 2)}`, 'yellow');
      }
    });
  }

  // Сохранение отчета
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.passed.length + testResults.failed.length,
      passed: testResults.passed.length,
      failed: testResults.failed.length
    },
    passed: testResults.passed,
    failed: testResults.failed,
    warnings: testResults.warnings
  };

  fs.writeFileSync(
    path.join(__dirname, 'test-report.json'),
    JSON.stringify(report, null, 2)
  );
  log('\n✅ Отчет сохранен в test-report.json', 'green');
}

// Проверка доступности сервера
async function checkServerAvailability() {
  try {
    await axios.get(`${BASE_URL}/books`, { timeout: 3000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Запуск тестов
(async () => {
  log('Проверка доступности сервера...', 'yellow');
  const serverAvailable = await checkServerAvailability();
  
  if (!serverAvailable) {
    log('❌ Сервер недоступен! Убедитесь, что сервер запущен на порту 5001', 'red');
    process.exit(1);
  }
  
  log('✅ Сервер доступен', 'green');
  await runAllTests();
})();