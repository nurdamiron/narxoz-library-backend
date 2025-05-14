'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if column already exists
      const columns = await queryInterface.describeTable('events');
      if (!columns.imageStoredLocally) {
        await queryInterface.addColumn('events', 'imageStoredLocally', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: true,
        });
        console.log('Added imageStoredLocally column to events table');
      } else {
        console.log('imageStoredLocally column already exists in events table');
      }
    } catch (error) {
      console.error('Error adding imageStoredLocally column:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('events', 'imageStoredLocally');
      console.log('Removed imageStoredLocally column from events table');
    } catch (error) {
      console.error('Error removing imageStoredLocally column:', error);
      throw error;
    }
  }
};