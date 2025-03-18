const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Создание директории для логов, если она не существует
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Определение уровней логирования с цветами
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Выбор уровня логирования в зависимости от окружения
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Цвета для разных уровней логирования
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Добавление цветов к уровням логирования
winston.addColors(colors);

// Формат для консольного вывода
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Формат для файловых логов
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  ),
  winston.format.json()
);

// Транспорты для логирования
const transports = [
  // Консольный транспорт
  new winston.transports.Console({
    format: consoleFormat
  }),
  
  // Файловый транспорт для всех логов
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: fileFormat
  }),
  
  // Файловый транспорт только для ошибок
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: fileFormat
  })
];

// Создание логгера
const logger = winston.createLogger({
  level: level(),
  levels,
  transports
});

// Экспорт логгера
module.exports = logger;