/**
 * Script to create missing event-related tables in the database
 */
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Database configuration
const config = require('./src/config/config')[process.env.NODE_ENV || 'development'];
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: console.log
  }
);

async function fixTables() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Define models
    const Event = sequelize.define('Event', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('workshop', 'lecture', 'exhibition', 'meetup', 'other'),
        allowNull: false,
        defaultValue: 'workshop',
      },
      location: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20,
      },
      registrationDeadline: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      }
    }, {
      tableName: 'events',
      timestamps: true,
    });

    const EventCategory = sequelize.define('EventCategory', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      }
    }, {
      tableName: 'event_categories',
      timestamps: true,
    });

    const EventCategoryRelation = sequelize.define('EventCategoryRelation', {
      eventId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      categoryId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      }
    }, {
      tableName: 'event_category_relations',
      timestamps: true,
    });

    const EventRegistration = sequelize.define('EventRegistration', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('registered', 'attended', 'cancelled'),
        allowNull: false,
        defaultValue: 'registered',
      },
      registrationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    }, {
      tableName: 'event_registrations',
      timestamps: true,
    });

    // Create tables if they don't exist
    await Event.sync({ alter: true });
    await EventCategory.sync({ alter: true });
    await EventCategoryRelation.sync({ alter: true });
    await EventRegistration.sync({ alter: true });

    console.log('Tables successfully created or modified.');

    // Add sample event categories if none exist
    const categoryCount = await EventCategory.count();
    if (categoryCount === 0) {
      const categories = [
        { name: 'Academic', description: 'Academic events like lectures, seminars, and workshops' },
        { name: 'Social', description: 'Social events and gatherings' },
        { name: 'Cultural', description: 'Cultural events including performances and exhibitions' },
        { name: 'Career', description: 'Career development events like job fairs and networking' },
        { name: 'Technology', description: 'Technology-related events and hackathons' }
      ];
      
      await EventCategory.bulkCreate(categories);
      console.log('Sample event categories created.');
    } else {
      console.log(`${categoryCount} event categories already exist.`);
    }

    console.log('Database fixes complete.');
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixTables();