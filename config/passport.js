const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');
const logger = require('../utils/logger');

// Настройка опций для JWT стратегии
const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Извлечение токена из заголовка Authorization
  secretOrKey: process.env.JWT_SECRET // Секретный ключ для верификации токена
};

module.exports = (passport) => {
  passport.use(
    new JwtStrategy(options, async (jwt_payload, done) => {
      try {
        // Поиск пользователя по ID из токена
        const user = await User.findByPk(jwt_payload.id, {
          attributes: { exclude: ['password'] }
        });

        if (user) {
          return done(null, user); // Пользователь найден, всё ок
        } else {
          return done(null, false); // Пользователь не найден
        }
      } catch (error) {
        logger.error('Ошибка при аутентификации с помощью JWT:', error);
        return done(error, false);
      }
    })
  );
};