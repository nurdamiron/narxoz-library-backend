const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Создание директорий для загрузки файлов, если они не существуют
const createUploadsDirectories = () => {
  const baseDir = 'uploads';
  const directories = ['books', 'avatars'];

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }

  directories.forEach(dir => {
    const dirPath = path.join(baseDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
  });
};

// Вызов функции для создания директорий
createUploadsDirectories();

// Настройка хранилища для Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Определение директории для загрузки в зависимости от типа файла
    if (file.fieldname === 'cover') {
      cb(null, 'uploads/books');
    } else if (file.fieldname === 'avatar') {
      cb(null, 'uploads/avatars');
    } else {
      cb(null, 'uploads');
    }
  },
  filename: (req, file, cb) => {
    // Генерация уникального имени файла
    const uniqueSuffix = crypto.randomBytes(10).toString('hex');
    const fileExt = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${fileExt}`);
  }
});

// Фильтрация файлов
const fileFilter = (req, file, cb) => {
  // Допустимые типы файлов
  const allowedMimeTypes = {
    'cover': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    'avatar': ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  };

  // Проверка типа файла
  if (allowedMimeTypes[file.fieldname] && allowedMimeTypes[file.fieldname].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый тип файла'), false);
  }
};

// Настройка лимитов
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 1
};

// Инициализация Multer
const upload = multer({
  storage,
  fileFilter,
  limits
});

module.exports = upload;