# 🚀 Быстрый запуск

## 1. Установите PostgreSQL

### Windows:
- Скачайте с https://www.postgresql.org/download/windows/
- Установите с паролем `password` для пользователя `postgres`

### Linux/macOS:
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql
```

## 2. Создайте базу данных

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Выполните команды:
CREATE DATABASE tvcompany_db;
\q
```

## 3. Примените схему БД

```bash
# Примените схему
psql -U postgres -d tvcompany_db -f docs/db/schema.sql

# Примените функции
psql -U postgres -d tvcompany_db -f docs/db/functions.sql

# Примените триггеры
psql -U postgres -d tvcompany_db -f docs/db/triggers.sql
```

## 4. Создайте файл `.env.local`

Создайте файл `.env.local` в корне проекта:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/tvcompany_db
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

**Замените `password` на ваш пароль PostgreSQL!**

## 5. Инициализируйте тестовые данные

```bash
npm run init-db
```

## 6. Запустите приложение

```bash
npm run dev
```

## 7. Откройте в браузере

Перейдите на http://localhost:3000

## ✅ Проверка работы

1. **Главная страница** - должна загрузиться без ошибок
2. **Демо-режим** - нажмите любую кнопку роли (Заказчик, Агент, Коммерческий отдел)
3. **Проверка БД** - должно появиться "База данных подключена"
4. **Функционал**:
   - **Заказчик**: Калькулятор → выбор шоу → расчет стоимости
   - **Коммерческий отдел**: Расписание → добавление шоу
   - **Агент**: Заявки клиентов

## 🔧 Если что-то не работает

### Ошибка подключения к БД:
1. Проверьте, запущен ли PostgreSQL
2. Проверьте правильность пароля в `.env.local`
3. Убедитесь, что база `tvcompany_db` существует
4. Проверьте, применена ли схема БД

### Ошибка "Module not found: Can't resolve 'pg'":
```bash
npm install pg @types/pg
```

### Ошибка 500 в API:
1. Проверьте логи в терминале
2. Убедитесь, что БД настроена правильно
3. Перезапустите приложение: `npm run dev`

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте все шаги выше
2. Убедитесь, что PostgreSQL запущен
3. Проверьте файл `.env.local`
4. Перезапустите приложение
