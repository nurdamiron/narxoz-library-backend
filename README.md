# Электронная библиотечная система Нархоз Университета

Бэкенд-часть электронной библиотечной системы для Нархоз Университета. Система обеспечивает управление книжным фондом библиотеки, выдачей/возвратом книг, пользователями и другими аспектами работы университетской библиотеки.

## Основные возможности

- Авторизация и управление пользователями (студенты, преподаватели, библиотекари, администраторы)
- Управление книжным фондом (добавление, редактирование, удаление книг)
- Поиск и фильтрация книг по различным параметрам
- Выдача и возврат книг
- Управление сроками выдачи и уведомления о просрочке
- Административная панель с аналитикой и отчетами
- Интеграция с системой уведомлений (email)

## Технологии

- **Node.js** и **Express.js** - серверная часть
- **MySQL** и **Sequelize ORM** - база данных и взаимодействие с ней
- **JWT** - аутентификация и авторизация
- **Multer** - загрузка файлов
- **Nodemailer** - отправка email-уведомлений
- **Winston** - логирование
- **Jest** - тестирование

## Требования

- Node.js >= 16.0.0
- MySQL >= 8.0.0

## Установка и запуск

### Установка зависимостей

```bash
npm install
```

### Настройка переменных окружения

Создайте файл `.env` в корневой директории проекта на основе файла `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте файл `.env` и заполните необходимые переменные окружения.

### Создание базы данных MySQL

```sql
CREATE DATABASE narxoz_library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Запуск миграций

```bash
npx sequelize-cli db:migrate
```

### Заполнение базы данных тестовыми данными (опционально)

```bash
npm run seed
```

### Запуск сервера для разработки

```bash
npm run dev
```

### Запуск сервера для production

```bash
npm start
```

## Тестирование

```bash
npm test
```

## API Endpoints

Подробная документация по API доступна по адресу `/api-docs` при запущенном сервере.

### Аутентификация

- `POST /api/auth/register` - Регистрация нового пользователя
- `POST /api/auth/login` - Вход пользователя
- `POST /api/auth/refresh-token` - Обновление токена
- `GET /api/auth/me` - Получение информации о текущем пользователе
- `POST /api/auth/logout` - Выход пользователя

### Книги

- `GET /api/books` - Получение всех книг с фильтрацией и пагинацией
- `GET /api/books/:id` - Получение книги по ID
- `POST /api/books` - Создание новой книги (admin, librarian)
- `PUT /api/books/:id` - Обновление книги (admin, librarian)
- `DELETE /api/books/:id` - Удаление книги (admin, librarian)
- `GET /api/books/search` - Поиск книг
- `GET /api/books/popular` - Получение популярных книг
- `GET /api/books/recent` - Получение недавно добавленных книг

### Выдача/возврат книг

- `POST /api/borrow/books/:id` - Выдача книги пользователю
- `POST /api/borrow/:id/return` - Возврат книги
- `POST /api/borrow/:id/extend` - Продление срока выдачи
- `GET /api/borrow/my` - Получение активных выдач пользователя
- `GET /api/borrow/history` - Получение истории выдач пользователя
- `GET /api/borrow` - Получение всех выдач (admin, librarian)
- `GET /api/borrow/overdue` - Получение просроченных выдач (admin, librarian)

### Пользователи

- `GET /api/users/profile` - Получение профиля пользователя
- `PUT /api/users/profile` - Обновление профиля пользователя
- `PUT /api/users/password` - Изменение пароля
- `GET /api/users/borrows` - Получение активных выдач пользователя
- `GET /api/users/history` - Получение истории выдач пользователя

### Категории

- `GET /api/categories` - Получение всех категорий
- `GET /api/categories/:id` - Получение категории по ID
- `POST /api/categories` - Создание категории (admin, librarian)
- `PUT /api/categories/:id` - Обновление категории (admin, librarian)
- `DELETE /api/categories/:id` - Удаление категории (admin, librarian)
- `GET /api/categories/:id/books` - Получение книг по категории

### Административная панель

- `GET /api/admin/dashboard` - Получение статистики для дашборда
- `GET /api/admin/books/popular` - Получение популярных книг
- `GET /api/admin/categories/stats` - Получение статистики по категориям
- `GET /api/admin/users/stats` - Получение статистики по пользователям
- `GET /api/admin/reports/overdue` - Получение отчета о просроченных выдачах
- `GET /api/admin/reports/inventory` - Получение отчета о состоянии библиотечного фонда

## Структура проекта

```
backend/
├── config/             # Конфигурационные файлы
├── controllers/        # Контроллеры
├── middleware/         # Middleware
├── models/             # Модели данных
├── routes/             # Маршруты
├── services/           # Сервисы
├── utils/              # Утилиты
├── tests/              # Тесты
├── seeders/            # Сидеры для заполнения БД тестовыми данными
├── migrations/         # Миграции БД
├── uploads/            # Загруженные файлы
├── logs/               # Логи
├── .env.example        # Пример переменных окружения
├── .eslintrc.js        # Конфигурация ESLint
├── .gitignore          # Git-игнорирование
├── package.json        # Зависимости и скрипты
├── server.js           # Входная точка приложения
└── README.md           # Документация проекта
```

## Лицензия

MIT