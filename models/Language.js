const { sequelize, Sequelize } = require('../config/database');
const { DataTypes } = Sequelize;

const Language = sequelize.define('Language', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false
  }
}, {
  tableName: 'languages',
  timestamps: true,
  underscored: true
});

module.exports = Language;