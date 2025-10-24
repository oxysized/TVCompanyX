# Настройка аутентификации

## Добавьте JWT_SECRET в .env.local

Добавьте следующую строку в ваш файл `.env.local`:

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Полный .env.local файл должен содержать:

```
DATABASE_URL=postgresql://postgres:0112@localhost:5432/TVShow

# Alternative individual settings (if DATABASE_URL doesn't work)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=TVShow
DB_USER=postgres
DB_PASSWORD=0112
DB_SSL=false

# API settings
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## После добавления JWT_SECRET:

1. Перезапустите сервер разработки:
   ```bash
   npm run dev
   ```

2. Теперь регистрация и вход должны работать корректно!

## Что было исправлено:

- ✅ Созданы API endpoints для регистрации и входа
- ✅ Добавлена хеширование паролей с bcryptjs
- ✅ Настроена JWT аутентификация
- ✅ Обновлены Redux actions для работы с новыми API
- ✅ Добавлена валидация данных

## Тестирование:

1. Перейдите на http://localhost:3001
2. Нажмите "Войти в систему"
3. Выберите "Регистрация"
4. Заполните форму и нажмите "Создать аккаунт"
5. После успешной регистрации вы будете автоматически перенаправлены в дашборд



