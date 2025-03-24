/**
 * Модельдерді жүктеу және экспорттау
 * 
 * @description Бұл файл барлық модель файлдарын жүктеп, оларды бір объектте жинақтайды
 * және Sequelize байланысын экспорттайды.
 */
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];
const db = {};

/**
 * Sequelize байланысын инициализациялау
 * 
 * @description Конфигурацияға сәйкес Sequelize байланысын орнатады
 */
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

/**
 * Модель файлдарын жүктеу
 * 
 * @description Ағымдағы директориядағы барлық .js модель файлдарын
 * автоматты түрде жүктейді
 */
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    // Модельді импорттау
    const modelModule = require(path.join(__dirname, file));
    
    // Модель функция екенін тексеру
    if (typeof modelModule === 'function') {
      const model = modelModule(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    } else {
      console.warn(`Модель файлы дұрыс форматта емес: ${file}`);
    }
  });

/**
 * Модельдер арасындағы байланыстарды орнату
 * 
 * @description Әрбір модельдің associate әдісін шақыру арқылы
 * модельдер арасындағы байланыстарды конфигурациялайды
 */
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Sequelize нұсқалары мен байланысын экспорттау
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;