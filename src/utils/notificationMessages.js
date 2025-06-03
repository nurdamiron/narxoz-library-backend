/**
 * Хабарландыру хабарламаларын локализациялау
 * 
 * @description Бұл модуль хабарландыру хабарламаларын пайдаланушының тілі бойынша қайтарады
 */

const messages = {
  kz: {
    // Кітап қарызға алу хабарламалары
    bookBorrowed: {
      title: 'Кітап сәтті тапсырыс берілді',
      message: (bookTitle, dueDate) => `Сіз "${bookTitle}" кітабын сәтті тапсырыс бердіңіз. Қайтару мерзімі - ${dueDate}`,
    },
    bookReturned: {
      title: 'Кітап сәтті қайтарылды',
      message: (bookTitle) => `Сіз "${bookTitle}" кітабын сәтті қайтардыңыз. Рахмет!`,
    },
    bookOverdue: {
      title: 'Кітап қайтару мерзімі өтті',
      message: (bookTitle, daysOverdue) => `"${bookTitle}" кітабының қайтару мерзімі ${daysOverdue} күнге кешіктірілді. Кітапты тезірек қайтаруыңызды сұраймыз.`,
    },
    bookDueSoon: {
      title: 'Кітап қайтару мерзімі жақындады',
      message: (bookTitle, daysLeft) => `"${bookTitle}" кітабын қайтаруға ${daysLeft} күн қалды.`,
    },
    bookExtended: {
      title: 'Кітап қарызының мерзімі ұзартылды',
      message: (bookTitle, newDueDate) => `"${bookTitle}" кітабының қайтару мерзімі ${newDueDate} күніне дейін ұзартылды.`,
    },
    // Іс-шара хабарламалары
    eventRegistered: {
      title: 'Іс-шараға сәтті тіркелдіңіз',
      message: (eventTitle, eventDate) => `Сіз "${eventTitle}" іс-шарасына сәтті тіркелдіңіз. Іс-шара күні: ${eventDate}`,
    },
    eventCancelled: {
      title: 'Іс-шараға тіркелу болдырылмады',
      message: (eventTitle) => `"${eventTitle}" іс-шарасына тіркелуіңіз болдырылмады.`,
    },
    eventReminder: {
      title: 'Іс-шара еске салуы',
      message: (eventTitle, eventDate) => `"${eventTitle}" іс-шарасы ${eventDate} күні өтеді. Ұмытпаңыз!`,
    },
    eventUpdated: {
      title: 'Іс-шара мәліметтері жаңартылды',
      message: (eventTitle) => `"${eventTitle}" іс-шарасының мәліметтері өзгертілді. Толық ақпаратты тексеріңіз.`,
    },
    // Жалпы хабарламалар
    welcomeMessage: {
      title: 'Қош келдіңіз!',
      message: (userName) => `Қош келдіңіз, ${userName}! Нархоз университеті кітапханасының жүйесіне сәтті тіркелдіңіз.`,
    },
    profileUpdated: {
      title: 'Профиль жаңартылды',
      message: () => 'Сіздің профиліңіз сәтті жаңартылды.',
    },
    passwordChanged: {
      title: 'Құпия сөз өзгертілді',
      message: () => 'Сіздің құпия сөзіңіз сәтті өзгертілді.',
    },
  },
  ru: {
    // Сообщения о заимствовании книг
    bookBorrowed: {
      title: 'Книга успешно забронирована',
      message: (bookTitle, dueDate) => `Вы успешно забронировали книгу "${bookTitle}". Дата возврата - ${dueDate}`,
    },
    bookReturned: {
      title: 'Книга успешно возвращена',
      message: (bookTitle) => `Вы успешно вернули книгу "${bookTitle}". Спасибо!`,
    },
    bookOverdue: {
      title: 'Срок возврата книги истек',
      message: (bookTitle, daysOverdue) => `Срок возврата книги "${bookTitle}" просрочен на ${daysOverdue} дней. Пожалуйста, верните книгу как можно скорее.`,
    },
    bookDueSoon: {
      title: 'Приближается срок возврата книги',
      message: (bookTitle, daysLeft) => `До возврата книги "${bookTitle}" осталось ${daysLeft} дней.`,
    },
    bookExtended: {
      title: 'Срок заимствования продлен',
      message: (bookTitle, newDueDate) => `Срок возврата книги "${bookTitle}" продлен до ${newDueDate}.`,
    },
    // Сообщения о мероприятиях
    eventRegistered: {
      title: 'Вы успешно зарегистрированы на мероприятие',
      message: (eventTitle, eventDate) => `Вы успешно зарегистрировались на мероприятие "${eventTitle}". Дата проведения: ${eventDate}`,
    },
    eventCancelled: {
      title: 'Регистрация на мероприятие отменена',
      message: (eventTitle) => `Ваша регистрация на мероприятие "${eventTitle}" отменена.`,
    },
    eventReminder: {
      title: 'Напоминание о мероприятии',
      message: (eventTitle, eventDate) => `Мероприятие "${eventTitle}" состоится ${eventDate}. Не забудьте!`,
    },
    eventUpdated: {
      title: 'Информация о мероприятии обновлена',
      message: (eventTitle) => `Информация о мероприятии "${eventTitle}" изменена. Проверьте подробности.`,
    },
    // Общие сообщения
    welcomeMessage: {
      title: 'Добро пожаловать!',
      message: (userName) => `Добро пожаловать, ${userName}! Вы успешно зарегистрировались в системе библиотеки Университета Нархоз.`,
    },
    profileUpdated: {
      title: 'Профиль обновлен',
      message: () => 'Ваш профиль успешно обновлен.',
    },
    passwordChanged: {
      title: 'Пароль изменен',
      message: () => 'Ваш пароль успешно изменен.',
    },
  },
  en: {
    // Book borrowing messages
    bookBorrowed: {
      title: 'Book successfully reserved',
      message: (bookTitle, dueDate) => `You have successfully reserved the book "${bookTitle}". Due date - ${dueDate}`,
    },
    bookReturned: {
      title: 'Book successfully returned',
      message: (bookTitle) => `You have successfully returned the book "${bookTitle}". Thank you!`,
    },
    bookOverdue: {
      title: 'Book return overdue',
      message: (bookTitle, daysOverdue) => `The book "${bookTitle}" is overdue by ${daysOverdue} days. Please return it as soon as possible.`,
    },
    bookDueSoon: {
      title: 'Book due soon',
      message: (bookTitle, daysLeft) => `You have ${daysLeft} days left to return the book "${bookTitle}".`,
    },
    bookExtended: {
      title: 'Loan period extended',
      message: (bookTitle, newDueDate) => `The due date for the book "${bookTitle}" has been extended to ${newDueDate}.`,
    },
    // Event messages
    eventRegistered: {
      title: 'Successfully registered for event',
      message: (eventTitle, eventDate) => `You have successfully registered for the event "${eventTitle}". Event date: ${eventDate}`,
    },
    eventCancelled: {
      title: 'Event registration cancelled',
      message: (eventTitle) => `Your registration for the event "${eventTitle}" has been cancelled.`,
    },
    eventReminder: {
      title: 'Event reminder',
      message: (eventTitle, eventDate) => `The event "${eventTitle}" will take place on ${eventDate}. Don't forget!`,
    },
    eventUpdated: {
      title: 'Event information updated',
      message: (eventTitle) => `Information about the event "${eventTitle}" has been updated. Please check the details.`,
    },
    // General messages
    welcomeMessage: {
      title: 'Welcome!',
      message: (userName) => `Welcome, ${userName}! You have successfully registered in the Narxoz University library system.`,
    },
    profileUpdated: {
      title: 'Profile updated',
      message: () => 'Your profile has been successfully updated.',
    },
    passwordChanged: {
      title: 'Password changed',
      message: () => 'Your password has been successfully changed.',
    },
  }
};

/**
 * Пайдаланушының тілін анықтау
 * @param {Object} user - Пайдаланушы объектісі
 * @returns {string} - Тіл коды ('kz', 'ru', 'en')
 */
const getUserLanguage = (user) => {
  // Егер пайдаланушының тілі сақталса, оны қолдану
  if (user.language) {
    return user.language;
  }
  // Әдепкі тіл - қазақ тілі
  return 'kz';
};

/**
 * Локализацияланған хабарлама алу
 * @param {Object} user - Пайдаланушы объектісі
 * @param {string} messageKey - Хабарлама кілті
 * @param {...any} params - Хабарлама параметрлері
 * @returns {Object} - Локализацияланған тақырып және хабарлама
 */
const getMessage = (user, messageKey, ...params) => {
  const language = getUserLanguage(user);
  const languageMessages = messages[language] || messages.kz;
  const messageTemplate = languageMessages[messageKey];
  
  if (!messageTemplate) {
    console.error(`Message key "${messageKey}" not found for language "${language}"`);
    return {
      title: 'Notification',
      message: 'You have a new notification'
    };
  }
  
  return {
    title: messageTemplate.title,
    message: typeof messageTemplate.message === 'function' 
      ? messageTemplate.message(...params) 
      : messageTemplate.message
  };
};

/**
 * Күнді локализациялап форматтау
 * @param {Date} date - Күн объектісі
 * @param {string} language - Тіл коды
 * @returns {string} - Форматталған күн
 */
const formatDate = (date, language = 'kz') => {
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  const locales = {
    kz: 'kk-KZ',
    ru: 'ru-RU',
    en: 'en-US'
  };
  
  return new Date(date).toLocaleDateString(locales[language] || locales.kz, options);
};

module.exports = {
  getMessage,
  getUserLanguage,
  formatDate
};