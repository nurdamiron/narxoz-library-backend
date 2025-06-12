// fix-password.js - Исправление пароля пользователя bagzhan@narxoz.kz
const { Sequelize } = require('sequelize');
const config = require('./src/config/config.js');

async function fixPassword() {
  console.log('🔧 Исправление пароля пользователя...');
  
  // Создание подключения к базе данных
  const sequelize = new Sequelize(
    config.development.database,
    config.development.username,
    config.development.password,
    {
      host: config.development.host,
      port: config.development.port,
      dialect: config.development.dialect,
      logging: console.log
    }
  );

  try {
    // Проверка подключения
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    // Обновление пароля для bagzhan@narxoz.kz
    const [results, metadata] = await sequelize.query(
      "UPDATE Users SET password = 'nur2003' WHERE email = 'bagzhan@narxoz.kz'"
    );

    console.log(`✅ Пароль обновлен. Затронуто строк: ${metadata.affectedRows || results.affectedRows || 'неизвестно'}`);

    // Проверка обновления
    const [user] = await sequelize.query(
      "SELECT email, password FROM Users WHERE email = 'bagzhan@narxoz.kz'"
    );

    if (user && user.length > 0) {
      console.log('✅ Проверка: пользователь найден');
      console.log('📧 Email:', user[0].email);
      console.log('🔐 Новый пароль:', user[0].password);
    } else {
      console.log('❌ Пользователь с email bagzhan@narxoz.kz не найден');
    }

  } catch (error) {
    console.error('❌ Ошибка при исправлении пароля:', error.message);
  } finally {
    await sequelize.close();
    console.log('🔚 Подключение к базе данных закрыто');
  }
}

// Запуск скрипта
fixPassword();