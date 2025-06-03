const db = require('./src/models');
const migration = require('./src/migrations/add-extension-count-to-borrows');

async function runMigration() {
  try {
    console.log('🚀 Начинаем миграцию для добавления extensionCount...');
    
    // Подключаемся к базе данных
    await db.sequelize.authenticate();
    console.log('✅ Подключение к базе данных успешно');
    
    // Запускаем миграцию
    await migration.up(db.sequelize.getQueryInterface(), db.Sequelize);
    
    console.log('✅ Миграция успешно завершена!');
    
    // Проверяем, что колонка добавлена
    const tableDescription = await db.sequelize.getQueryInterface().describeTable('Borrows');
    if (tableDescription.extensionCount) {
      console.log('✅ Колонка extensionCount успешно добавлена в таблицу Borrows');
      console.log('📊 Тип колонки:', tableDescription.extensionCount.type);
      console.log('📊 Значение по умолчанию:', tableDescription.extensionCount.defaultValue);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
runMigration();