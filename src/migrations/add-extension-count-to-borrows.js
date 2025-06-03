'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Проверяем, существует ли уже колонка
    const tableDescription = await queryInterface.describeTable('Borrows');
    
    if (!tableDescription.extensionCount) {
      await queryInterface.addColumn('Borrows', 'extensionCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
          min: 0,
          max: 5
        }
      });
      
      console.log('✅ Добавлена колонка extensionCount в таблицу Borrows');
    } else {
      console.log('ℹ️ Колонка extensionCount уже существует в таблице Borrows');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Borrows');
    
    if (tableDescription.extensionCount) {
      await queryInterface.removeColumn('Borrows', 'extensionCount');
      console.log('✅ Удалена колонка extensionCount из таблицы Borrows');
    }
  }
};