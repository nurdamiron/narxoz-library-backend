/**
 * Нархоз Кітапхана API серверін іске қосу
 * 
 * @description Бұл файл Express серверін инициализациялайды, миддлвэрлерді және 
 * маршрутизаторларды конфигурациялайды және серверді іске қосады
 */
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { testConnection } = require('./config/database');
const errorHandler = require('./middleware/error');
const db = require('./models');
const fs = require('fs');

// Конфигурациялық айнымалыларды жүктеу
dotenv.config();

// Деректер қоры байланысын тексеру
testConnection();

// Маршрутизатор файлдары
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const eventRoutes = require('./routes/eventRoutes');

// Express қосымшасын инициализациялау
const app = express();

// JSON парсер
app.use(express.json());

// CORS конфигурациясы - барлық домендерден сұраныстарға рұқсат беру

const corsOptions = {
  // В режиме разработки разрешаем запросы со всех источников
  origin: process.env.NODE_ENV === 'development' ? '*' : function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL, 
      'http://localhost:3003', 
      'http://localhost:3002',
      'http://localhost:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', '*'],
  exposedHeaders: ['Content-Type', 'Content-Length', 'Content-Disposition'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Қауіпсіздік тақырыптарын орнату с настройками для поддержки изображений из разных источников
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// Әзірлеуші режимінде логтау миддлвэрі
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Статикалық файлдар үшін каталог орнату
// Отключаем кэширование статических файлов в режиме разработки
const staticOptions = process.env.NODE_ENV === 'development' 
  ? { etag: false, lastModified: false, cacheControl: false }
  : { maxAge: '1h' };

// Настройка доступа к статическим файлам из директории public
app.use(express.static(path.join(__dirname, '../public'), staticOptions));

// Глобальная обработка всех запросов изображений с обеспечением CORS
app.use('/*.jpg|*.jpeg|*.png|*.gif', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Специально для обслуживания изображений обложек книг
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Устанавливаем правильные заголовки для изображений
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      // Разрешаем CORS для всех источников
      res.setHeader('Access-Control-Allow-Origin', '*');
      // Добавляем дополнительные заголовки для исправления CORS
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      // Отключаем строгие политики безопасности для изображений
      res.removeHeader('Cross-Origin-Opener-Policy');
      res.removeHeader('Cross-Origin-Embedder-Policy');
    }
  }
}));

// Альтернативный маршрут для доступа к обложкам книг (для совместимости)
app.use('/api/books/covers', express.static(path.join(__dirname, '../public/uploads/covers'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Устанавливаем правильные заголовки для изображений
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      // Разрешаем CORS для всех источников
      res.setHeader('Access-Control-Allow-Origin', '*');
      // Добавляем дополнительные заголовки для исправления CORS
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      // Отключаем строгие политики безопасности для изображений
      res.removeHeader('Cross-Origin-Opener-Policy');
      res.removeHeader('Cross-Origin-Embedder-Policy');
    }
  }
}));

// Обработка изображений событий
app.use('/api/events/media', express.static(path.join(__dirname, '../public/uploads/events'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Устанавливаем правильные заголовки для изображений
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      // Разрешаем CORS для всех источников
      res.setHeader('Access-Control-Allow-Origin', '*');
      // Добавляем дополнительные заголовки для исправления CORS
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      // Отключаем строгие политики безопасности для изображений
      res.removeHeader('Cross-Origin-Opener-Policy');
      res.removeHeader('Cross-Origin-Embedder-Policy');
    }
  }
}));

// Special endpoint for NarXoz book
app.get('/api/narxoz-cover', (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Redirect to placeholder or physical image
  const coverFilePath = path.join(__dirname, '../public/uploads/covers/book-3-1747138728480-272668072.png');
  
  if (fs.existsSync(coverFilePath)) {
    // If file exists, send the file
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const fileStream = fs.createReadStream(coverFilePath);
    fileStream.pipe(res);
  } else {
    // If not, redirect to placeholder
    res.redirect('https://via.placeholder.com/200x300?text=NarXoz');
  }
});

// Маршрут для проверки доступности файлов
app.get('/check-file/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../public/uploads/covers', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.json({ 
      exists: true, 
      path: filePath,
      size: fs.statSync(filePath).size,
      url: `/uploads/covers/${req.params.filename}`,
      absoluteUrl: `${req.protocol}://${req.get('host')}/uploads/covers/${req.params.filename}`
    });
  } else {
    res.json({ exists: false, path: filePath });
  }
});

// Тестовый маршрут для проверки изображений событий
app.get('/test-events', (req, res) => {
  const eventsDir = path.join(__dirname, '../public/uploads/events');
  
  try {
    // Проверяем существование директории
    if (!fs.existsSync(eventsDir)) {
      return res.json({
        success: false,
        message: 'Директория с изображениями событий не существует',
        path: eventsDir
      });
    }
    
    // Читаем список файлов
    const files = fs.readdirSync(eventsDir);
    
    // Формируем URL для каждого файла
    const eventImages = files.map(file => {
      const filePath = path.join(eventsDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        url: `/uploads/events/${file}`,
        absoluteUrl: `${req.protocol}://${req.get('host')}/uploads/events/${file}`
      };
    });
    
    res.json({
      success: true,
      path: eventsDir,
      count: eventImages.length,
      server: {
        hostname: req.hostname,
        protocol: req.protocol,
        host: req.get('host'),
        origin: req.get('origin') || 'unknown',
        ip: req.ip
      },
      eventImages: eventImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Ошибка при проверке изображений событий: ${error.message}`,
      path: eventsDir
    });
  }
});

// Тестовый маршрут для проверки обложек
app.get('/test-covers', (req, res) => {
  const coversDir = path.join(__dirname, '../public/uploads/covers');
  
  try {
    // Проверяем существование директории
    if (!fs.existsSync(coversDir)) {
      return res.json({
        success: false,
        message: 'Директория с обложками не существует',
        path: coversDir
      });
    }
    
    // Читаем список файлов
    const files = fs.readdirSync(coversDir);
    
    // Формируем URL для каждого файла
    const covers = files.map(file => {
      const filePath = path.join(coversDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        url: `/uploads/covers/${file}`,
        absoluteUrl: `${req.protocol}://${req.get('host')}/uploads/covers/${file}`
      };
    });
    
    res.json({
      success: true,
      path: coversDir,
      count: covers.length,
      server: {
        hostname: req.hostname,
        protocol: req.protocol,
        host: req.get('host'),
        origin: req.get('origin') || 'unknown',
        ip: req.ip
      },
      covers: covers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Ошибка при проверке обложек: ${error.message}`,
      path: coversDir
    });
  }
});

// Новый маршрут для проверки и исправления доступа к обложкам
app.get('/api/book-cover-debug/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../public/uploads/covers', filename);
  
  // Общие заголовки CORS, которые всегда должны быть установлены
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  try {
    // Если файл не существует, перенаправляем на изображение по умолчанию
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Файл обложки не найден: ${filename}. Список доступных файлов:`);
      
      // Логируем список доступных файлов для диагностики
      const coversDir = path.join(__dirname, '../public/uploads/covers');
      if (fs.existsSync(coversDir)) {
        const files = fs.readdirSync(coversDir);
        console.log(`📚 Доступные файлы обложек (${files.length}): ${files.join(', ')}`);
      } else {
        console.log('❌ Директория с обложками не существует');
      }
      
      // Отправляем перенаправление на локальную заглушку
      return res.redirect('/uploads/covers/no-image.png');
    }
    
    // Получаем информацию о файле
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const lastModified = stats.mtime;
    
    // Определяем MIME-тип на основе расширения
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (filename.endsWith('.png')) {
      contentType = 'image/png';
    } else if (filename.endsWith('.gif')) {
      contentType = 'image/gif';
    }
    
    // Устанавливаем дополнительные заголовки для отдачи файла
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Last-Modified', lastModified.toUTCString());
    
    // Отправляем файл
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    console.log(`📸 Отдаем обложку через специальный маршрут: ${filename}`);
  } catch (error) {
    console.error(`❌ Ошибка при отдаче обложки: ${error.message}`);
    
    // В случае ошибки перенаправляем на локальную заглушку
    res.redirect('/uploads/covers/no-image.png');
  }
});

// Новый маршрут для восстановления и проверки всех изображений книг
app.get('/api/validate-book-covers', async (req, res) => {
  try {
    const coversDir = path.join(__dirname, '../public/uploads/covers');
    
    // Проверяем существование директории и создаем, если нет
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
      console.log(`📂 Создана директория для обложек: ${coversDir}`);
    }
    
    // Получаем список книг из базы данных
    const books = await db.Book.findAll();
    console.log(`📚 Найдено ${books.length} книг в базе данных`);
    
    // Получаем список существующих файлов
    const existingFiles = fs.existsSync(coversDir) ? fs.readdirSync(coversDir) : [];
    console.log(`📚 Найдено ${existingFiles.length} файлов обложек на диске`);
    
    // Проверяем для каждой книги наличие обложки
    const booksWithMissingCovers = [];
    const booksWithExistingCovers = [];
    
    for (const book of books) {
      // Если путь к обложке задан
      if (book.cover) {
        // Извлекаем имя файла из относительного или абсолютного пути
        let coverFilename = book.cover;
        
        // Если это полный URL, извлекаем только имя файла
        if (coverFilename.startsWith('http')) {
          // Убираем строку запроса и якоря из URL
          const urlWithoutQuery = coverFilename.split('?')[0].split('#')[0];
          // Извлекаем последнюю часть пути как имя файла
          coverFilename = urlWithoutQuery.split('/').pop();
        } 
        // Если это относительный путь, извлекаем только имя файла
        else if (coverFilename.includes('/')) {
          coverFilename = coverFilename.split('/').pop();
        }
        
        // Логируем для диагностики
        console.log(`📘 Обработка обложки для книги ${book.id} (${book.title}): путь=${book.cover}, имя файла=${coverFilename}`);
        
        // Проверяем существование файла
        const filePath = path.join(coversDir, coverFilename);
        const fileExists = fs.existsSync(filePath);
        
        if (fileExists) {
          booksWithExistingCovers.push({
            id: book.id,
            title: book.title,
            cover: book.cover,
            coverFilename,
            fileSize: fs.statSync(filePath).size
          });
        } else {
          booksWithMissingCovers.push({
            id: book.id,
            title: book.title,
            cover: book.cover,
            coverFilename
          });
          
          // Создаем новый файл обложки путем копирования существующего
          // или создания нового через API placeholder
          if (existingFiles.length > 0) {
            // Копируем первый существующий файл с новым именем
            const sourcePath = path.join(coversDir, existingFiles[0]);
            fs.copyFileSync(sourcePath, filePath);
            console.log(`📸 Создана копия обложки для книги ${book.id} (${book.title}): ${coverFilename}`);
          } else {
            // В будущем здесь можно реализовать загрузку с placeholder API
            console.log(`⚠️ Не удалось создать обложку для книги ${book.id} (${book.title}): нет файлов для копирования`);
          }
        }
      }
    }
    
    res.json({
      success: true,
      booksCount: books.length,
      existingFilesCount: existingFiles.length,
      booksWithExistingCovers: booksWithExistingCovers.length,
      booksWithMissingCovers: booksWithMissingCovers.length,
      missingCovers: booksWithMissingCovers,
      existingCovers: booksWithExistingCovers
    });
  } catch (error) {
    console.error(`❌ Ошибка при проверке обложек: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Ошибка при проверке обложек: ${error.message}`
    });
  }
});

// API маршруттарын тіркеу
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/books/categories', categoryRoutes);
app.use('/api/events', eventRoutes);

// Басты маршрут
app.get('/', (req, res) => {
  res.json({
    message: 'Нархоз Кітапхана API-ге қош келдіңіз',
    version: '1.0.0',
    status: 'Онлайн',
    docs: '/api/docs' // API құжаттамасына сілтеме (болашақта қосылады)
  });
});

// API құжаттамасы маршруты (болашақта Swagger қосылады)
app.get('/api/docs', (req, res) => {
  res.send('API құжаттамасы жасалу үстінде');
});

// Қате өңдеу миддлвэрі
app.use(errorHandler);

// Серверді іске қосу
const PORT = process.env.PORT || 5002;

const server = app.listen(PORT, () => {
  console.log(`Сервер ${process.env.NODE_ENV} режимінде ${PORT} портта іске қосылды`);
});

// Деректер қорын инициализациялау
const { initDatabase } = require('./database-init');
initDatabase();

// Өңделмеген промис қателерін өңдеу
process.on('unhandledRejection', (err) => {
  console.log(`Қате: ${err.message}`);
  // Серверді жабу және процесті аяқтау
  server.close(() => process.exit(1));
});