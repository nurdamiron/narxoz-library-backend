// src/database-init.js
const db = require('./models');

async function initDatabase() {
  try {
    console.log('Синхронизация базы данных...');
    
    // Синхронизировать все модели с базой данных
    // force: true - удалит существующие таблицы перед созданием новых (используйте осторожно!)
    // force: false - создаст таблицы только если они не существуют
    await db.sequelize.sync({ force: false });
    
    console.log('Синхронизация базы данных успешно завершена.');
    
    // Проверка наличия администратора в системе
    const adminCount = await db.User.count({ where: { role: 'admin' } });
    
    // Если админов нет, создаем дефолтного администратора
    if (adminCount === 0) {
      console.log('Создание администратора по умолчанию...');
      
      await db.User.create({
        name: 'Администратор',
        email: 'admin@narxoz.kz',
        password: 'Admin123!', // в модели будет автоматически хэшироваться
        phone: '+77001234567',
        faculty: 'Администрация',
        specialization: 'Библиотека',
        studentId: 'ADMIN-001',
        year: 'N/A',
        role: 'admin'
      });
      
      console.log('Администратор по умолчанию создан.');
    }
    
    console.log('Инициализация базы данных успешно завершена.');
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
  }
}

// Запуск инициализации при импорте модуля
initDatabase();

module.exports = { initDatabase };