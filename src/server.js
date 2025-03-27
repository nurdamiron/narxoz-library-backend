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

// Express қосымшасын инициализациялау
const app = express();

// JSON парсер
app.use(express.json());

// CORS конфигурациясы - барлық домендерден сұраныстарға рұқсат беру

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'];
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Қауіпсіздік тақырыптарын орнату
app.use(helmet());

// Әзірлеуші режимінде логтау миддлвэрі
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Статикалық файлдар үшін каталог орнату
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API маршруттарын тіркеу
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/notifications', notificationRoutes);

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
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Сервер ${process.env.NODE_ENV} режимінде ${PORT} портта іске қосылды`);
});

// Деректер қорын инициализациялау
require('./database-init');

// Өңделмеген промис қателерін өңдеу
process.on('unhandledRejection', (err) => {
  console.log(`Қате: ${err.message}`);
  // Серверді жабу және процесті аяқтау
  server.close(() => process.exit(1));
});