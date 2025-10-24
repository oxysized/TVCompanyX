# Настройка базы данных

## 1. Создайте файл `.env.local` в корне проекта:

```env
# Database configuration
DATABASE_URL=postgresql://username:password@localhost:5432/tvcompany_db

# Alternative individual settings (if DATABASE_URL doesn't work)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tvcompany_db
DB_USER=username
DB_PASSWORD=password
DB_SSL=false

# API settings
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## 2. Установите PostgreSQL

### Windows:
1. Скачайте PostgreSQL с официального сайта: https://www.postgresql.org/download/windows/
2. Установите с настройками по умолчанию
3. Запомните пароль для пользователя `postgres`

### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### macOS:
```bash
brew install postgresql
brew services start postgresql
```

## 3. Создайте базу данных

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE tvcompany_db;

# Создайте пользователя (опционально)
CREATE USER tvcompany_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tvcompany_db TO tvcompany_user;

# Выйдите из psql
\q
```

## 4. Примените схему базы данных

```bash
# Примените схему
psql -U postgres -d tvcompany_db -f docs/db/schema.sql

# Примените функции
psql -U postgres -d tvcompany_db -f docs/db/functions.sql

# Примените триггеры
psql -U postgres -d tvcompany_db -f docs/db/triggers.sql

# Заполните тестовыми данными (опционально)
psql -U postgres -d tvcompany_db -f docs/db/seed.sql
```

## 5. Обновите `.env.local` с правильными данными

Замените `username` и `password` на реальные данные вашей БД:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/tvcompany_db
```

## 6. Перезапустите приложение

```bash
npm run dev
```

## Проверка подключения

После настройки откройте приложение в браузере. При входе в любую роль должна появиться проверка подключения к БД.

Если подключение успешно - вы увидите зеленый индикатор "База данных подключена".
Если есть ошибки - проверьте:
1. Правильность данных в `.env.local`
2. Запущен ли PostgreSQL
3. Существует ли база данных `tvcompany_db`
4. Применена ли схема БД
