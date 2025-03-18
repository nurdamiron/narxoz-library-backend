#!/usr/bin/env node

/**
 * Скрипт для проверки и настройки проекта
 * 
 * Выполняет следующие действия:
 * 1. Проверяет наличие необходимых директорий и файлов
 * 2. Проверяет версию Node.js
 * 3. Проверяет наличие файла .env
 * 4. Проверяет соединение с базой данных MySQL
 * 5. Создаёт необходимые директории для загрузки файлов
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Функция для логирования сообщений
const log = {
  info: (message) => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  warning: (message) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`),
  error: (message) => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
  title: (message) => console.log(`\n${colors.bright}${colors.cyan}${message}${colors.reset}\n`)
};

// Проверка версии Node.js
function checkNodeVersion() {
  log.title('Проверка версии Node.js');
  
  const nodeVersion = process.version;
  const versionRequirement = '>=16.0.0';
  
  log.info(`Текущая версия Node.js: ${nodeVersion}`);
  log.info(`Требуемая версия: ${versionRequirement}`);
  
  // Извлечение числовой версии
  const currentVersion = nodeVersion.slice(1); // Удаляем начальный 'v'
  const requiredVersion = versionRequirement.slice(2); // Удаляем начальный '>='
  
  if (parseFloat(currentVersion) < parseFloat(requiredVersion)) {
    log.error(`Текущая версия Node.js (${nodeVersion}) не соответствует требованиям (${versionRequirement}).`);
    log.error('Пожалуйста, обновите Node.js до требуемой версии.');
    process.exit(1);
  }
  
  log.success('Версия Node.js соответствует требованиям!');
}

// Проверка наличия файла .env
function checkEnvFile() {
  log.title('Проверка файла .env');
  
  const envFilePath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  if (!fs.existsSync(envFilePath)) {
    log.warning('Файл .env не найден.');
    
    if (fs.existsSync(envExamplePath)) {
      log.info('Найден файл .env.example. Создаем .env из примера...');
      
      fs.copyFileSync(envExamplePath, envFilePath);
      log.success('Файл .env создан из примера!');
      log.warning('Пожалуйста, отредактируйте файл .env и установите правильные значения.');
    } else {
      log.error('Файл .env.example не найден. Невозможно создать .env автоматически.');
      log.error('Пожалуйста, создайте файл .env вручную в корневой директории проекта.');
      process.exit(1);
    }
  } else {
    log.success('Файл .env найден!');
  }
}

// Проверка директорий
function checkDirectories() {
  log.title('Проверка необходимых директорий');
  
  const directories = [
    'config',
    'controllers',
    'middleware',
    'models',
    'routes',
    'services',
    'utils',
    'uploads',
    'logs'
  ];
  
  let allDirectoriesExist = true;
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    
    if (!fs.existsSync(dirPath)) {
      log.warning(`Директория ${dir}/ не найдена. Создание...`);
      fs.mkdirSync(dirPath, { recursive: true });
      log.success(`Директория ${dir}/ создана!`);
      allDirectoriesExist = false;
    }
  });
  
  if (allDirectoriesExist) {
    log.success('Все необходимые директории существуют!');
  }
  
  // Проверка поддиректорий для uploads
  const uploadDirs = ['books', 'avatars'];
  uploadDirs.forEach(dir => {
    const dirPath = path.join(__dirname, 'uploads', dir);
    
    if (!fs.existsSync(dirPath)) {
      log.warning(`Директория uploads/${dir}/ не найдена. Создание...`);
      fs.mkdirSync(dirPath, { recursive: true });
      
      // Создание .gitkeep
      fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');
      
      log.success(`Директория uploads/${dir}/ создана!`);
    }
  });
}

// Проверка соединения с базой данных
async function checkDatabaseConnection() {
  log.title('Проверка соединения с базой данных');
  
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    log.error('Не указаны настройки базы данных в файле .env');
    log.error('Пожалуйста, проверьте файл .env и укажите DB_HOST, DB_USER, DB_PASSWORD и DB_NAME.');
    return;
  }
  
  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false
    }
  );
  
  try {
    await sequelize.authenticate();
    log.success('Соединение с базой данных установлено успешно!');
  } catch (error) {
    log.error('Ошибка при подключении к базе данных:');
    log.error(error.message);
    
    if (error.message.includes("Unknown database")) {
      log.info('\nВы хотите создать базу данных? (y/n)');
      rl.question('> ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          try {
            // Создание базы данных
            const rootSequelize = new Sequelize(
              '', // Пустое имя БД для подключения к серверу
              process.env.DB_USER,
              process.env.DB_PASSWORD,
              {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 3306,
                dialect: 'mysql',
                logging: false
              }
            );
            
            await rootSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
            log.success(`База данных ${process.env.DB_NAME} успешно создана!`);
            
            await rootSequelize.close();
            rl.close();
          } catch (dbError) {
            log.error('Ошибка при создании базы данных:');
            log.error(dbError.message);
            rl.close();
          }
        } else {
          log.info('Пропускаем создание базы данных.');
          rl.close();
        }
      });
    } else {
      rl.close();
    }
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

// Проверка установленных зависимостей
function checkDependencies() {
  log.title('Проверка установленных зависимостей');
  
  try {
    const packageJson = require('./package.json');
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Проверка наличия node_modules
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
      log.warning('Директория node_modules не найдена. Установка зависимостей...');
      
      try {
        execSync('npm install', { stdio: 'inherit' });
        log.success('Зависимости успешно установлены!');
      } catch (error) {
        log.error('Ошибка при установке зависимостей:');
        log.error(error.message);
        log.info('Пожалуйста, установите зависимости вручную с помощью команды `npm install`.');
      }
    } else {
      log.success('Директория node_modules найдена!');
    }
  } catch (error) {
    log.error('Ошибка при чтении package.json:');
    log.error(error.message);
  }
}

// Главная функция
async function main() {
  log.title('Проверка и настройка проекта');
  
  // Выполнение проверок
  checkNodeVersion();
  checkDirectories();
  checkEnvFile();
  checkDependencies();
  await checkDatabaseConnection();
  
  log.title('Проверка проекта завершена!');
}

// Запуск скрипта
main().catch(error => {
  log.error('Непредвиденная ошибка:');
  log.error(error.message);
  process.exit(1);
});