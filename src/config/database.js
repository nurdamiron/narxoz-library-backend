/**
 * Деректер қоры конфигурациясы
 * 
 * @description Бұл файл Sequelize деректер қоры байланысын орнатады және тексереді
 */
const { Sequelize } = require('sequelize');
const config = require('./config')[process.env.NODE_ENV || 'development'];

/**
 * Sequelize байланысын инициализациялау
 * 
 * @description Деректер қорына қосылу үшін Sequelize нұсқасын жасайды
 */
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: config.logging,
    dialectOptions: {
      ...config.dialectOptions,
      connectTimeout: 60000,
      ssl: {
        require: false,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
    // Қосымша қауіпсіздік параметрлері
    define: {
      // SQL инъекциясын болдырмау үшін идентификаторларды қауіпсіз ету
      quoteIdentifiers: true,
      // Жаңа нұсқаларда барлық өрістерді белгісіз null емес
      timestamps: true
    }
  }
);

/**
 * Деректер қоры байланысын тексеру
 * 
 * @description Деректер қорына қосылуды тексереді және қате болған 
 * жағдайда қосымшаны тоқтатады
 * @returns {Promise<void>} Тестілеу нәтижесі туралы ақпарат
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Деректер қорымен байланыс сәтті орнатылды.');
  } catch (error) {
    console.error('Деректер қорына қосылу мүмкін болмады:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };