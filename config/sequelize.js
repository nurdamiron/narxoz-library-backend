const { Sequelize } = require('sequelize');
require('dotenv').config();

// Настройка Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: false,
      charset: 'utf8mb4',
      dialectOptions: {
        collate: 'utf8mb4_unicode_ci'
      }
    },
    timezone: '+06:00' // Астана (UTC+6)
  }
);

// Инициализация соединения с базой данных
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Соединение с базой данных установлено успешно.');
    
    // Синхронизация моделей с базой данных (в разработке)
    if (process.env.NODE_ENV === 'development' && process.env.SYNC_DB === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Модели синхронизированы с базой данных.');
    }
  } catch (error) {
    console.error('Ошибка при подключении к базе данных:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  Sequelize,
  initializeDatabase
};