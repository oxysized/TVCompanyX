# TV Company Ad System - Frontend

Фронтенд-часть веб-приложения для системы учета стоимости рекламы телекомпании, построенная на React с Next.js, Tailwind CSS, Redux и Chart.js. Приложение обеспечивает современный, адаптивный интерфейс с поддержкой PWA и доступностью по WCAG 2.1.

## 🚀 Особенности

- **Современный стек**: React 18, Next.js 14, TypeScript
- **Стилизация**: Tailwind CSS с кастомными компонентами
- **Управление состоянием**: Redux Toolkit
- **Графики**: Chart.js с react-chartjs-2
- **Реальное время**: Socket.io для чатов и уведомлений
- **PWA**: Прогрессивное веб-приложение с офлайн поддержкой
- **Доступность**: Соответствие WCAG 2.1
- **Адаптивность**: Полная поддержка мобильных устройств
- **Безопасность**: JWT аутентификация, защита от XSS/CSRF

## 📁 Структура проекта

```
src/
├── components/           # Переиспользуемые компоненты
│   ├── auth/            # Компоненты аутентификации
│   ├── chat/            # Компоненты чата
│   ├── dashboard/       # Компоненты дашбордов
│   └── layout/          # Компоненты макета
├── pages/               # Страницы приложения
│   ├── customer/        # Страницы заказчика
│   ├── agent/           # Страницы агента
│   ├── commercial/      # Страницы коммерческого отдела
│   ├── accountant/      # Страницы бухгалтера
│   ├── admin/           # Страницы ИТ-администратора
│   ├── director/        # Страницы директора
│   └── services/        # Публичная страница услуг
├── redux/               # Управление состоянием
│   ├── slices/          # Redux slices
│   └── store.ts         # Конфигурация store
├── styles/              # Глобальные стили
├── utils/               # Утилиты
│   ├── api.ts          # API клиент
│   └── socket.ts       # Socket.io клиент
└── pages/              # Next.js страницы
    ├── _app.tsx        # Главный компонент приложения
    ├── _document.tsx   # HTML документ
    └── index.tsx       # Главная страница
```

## 🎯 Функционал по ролям

### Заказчик рекламы
- **Калькулятор стоимости**: Расчет стоимости рекламы по секундам и шоу
- **Подача заявки**: Создание заявок на размещение рекламы
- **История заявок**: Просмотр всех заявок с фильтрацией
- **Профиль**: Редактирование личных данных и банковских реквизитов
- **Чат с агентом**: Реальное время общения

### Рекламный агент
- **Управление заявками**: Просмотр и обработка заявок клиентов
- **Комиссии**: Статистика доходов и комиссий
- **Отчеты**: Генерация отчетов для клиентов (PDF/Excel)
- **Чат**: Общение с клиентами и коммерческим отделом

### Коммерческий отдел
- **Расписание шоу**: Создание и управление расписанием
- **Одобрение заявок**: Рассмотрение заявок от агентов
- **Чат с агентами**: Координация работы

### Бухгалтер
- **Финансовый учет**: Управление оплатами и счетами
- **Отчеты**: Финансовая отчетность с экспортом
- **Уведомления**: Контроль просроченных платежей
- **Графики доходов**: Визуализация финансовых показателей

### ИТ-администратор
- **Управление пользователями**: Создание и редактирование учетных записей
- **Системная статистика**: Мониторинг работы системы
- **Логи**: Просмотр системных логов и ошибок
- **Настройки**: Конфигурация системы

### Директор
- **Статистика сотрудников**: KPI и производительность команды
- **Настройка комиссий**: Управление процентными ставками
- **Отчеты по клиентам**: Анализ клиентской базы
- **Статистика компании**: Общие показатели бизнеса

### Публичная страница
- **Список услуг**: Публичный каталог размещений рекламы
- **Реальное время**: Автоматическое обновление информации
- **Статистика**: Общие показатели компании

## 🛠 Установка и запуск

### Предварительные требования
- Node.js 18.0.0 или выше
- npm или yarn
- Запущенный бэкенд сервер

### Установка

1. **Клонируйте репозиторий**:
```bash
git clone <repository-url>
cd tv-company-ad-system-frontend
```

2. **Установите зависимости**:
```bash
npm install
# или
yarn install
```

3. **Настройте переменные окружения**:
Создайте файл `.env.local` в корне проекта:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=TV Company Ad System
NEXT_PUBLIC_APP_VERSION=1.0.0
```

4. **Запустите приложение**:
```bash
npm run dev
# или
yarn dev
```

Приложение будет доступно по адресу: http://localhost:3000

## 📦 Основные зависимости

```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@reduxjs/toolkit": "^1.9.7",
  "react-redux": "^8.1.3",
  "socket.io-client": "^4.7.4",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0",
  "axios": "^1.6.2",
  "tailwindcss": "^3.3.6",
  "react-hook-form": "^7.48.2",
  "react-hot-toast": "^2.4.1",
  "next-pwa": "^5.6.0"
}
```

## 🔧 Скрипты

```bash
# Разработка
npm run dev

# Сборка для продакшена
npm run build

# Запуск продакшен версии
npm run start

# Линтинг
npm run lint

# Тестирование
npm run test
npm run test:watch
npm run test:coverage
```

## 🌐 API интеграция

### Основные эндпоинты

```typescript
// Аутентификация
POST /auth/login
POST /auth/register
GET /auth/me
PUT /auth/profile

// Заявки
GET /ads/applications
POST /ads/applications
PUT /ads/applications/:id
DELETE /ads/applications/:id
POST /ads/calculate-cost

// Шоу
GET /shows
POST /shows
PUT /shows/:id
DELETE /shows/:id
GET /shows/schedule
POST /shows/schedule

// Пользователи
GET /users
POST /users
PUT /users/:id
DELETE /users/:id

// Отчеты
POST /reports/generate/:type
GET /reports/download/:id

// Чат
GET /chat/rooms
POST /chat/rooms
GET /chat/rooms/:id/messages
POST /chat/rooms/:id/messages

// Статистика
GET /dashboard/:role
GET /stats
```

### Socket.io события

```typescript
// Подключение
socket.emit('joinRoom', roomId)
socket.emit('leaveRoom', roomId)

// Сообщения
socket.emit('sendMessage', { roomId, content, type })
socket.emit('typing', { roomId })
socket.emit('stopTyping', { roomId })

// Дашборд
socket.emit('subscribeDashboard', { role })
socket.emit('unsubscribeDashboard', { role })

// Слушатели
socket.on('message', (data) => {})
socket.on('typing', (data) => {})
socket.on('notification', (data) => {})
socket.on('dashboardUpdate', (data) => {})
socket.on('serviceUpdate', (data) => {})
```

## 🎨 Стилизация

### Tailwind CSS конфигурация

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { /* ... */ },
        secondary: { /* ... */ },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### Кастомные компоненты

```css
.btn-primary {
  @apply px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200;
}

.card {
  @apply bg-white rounded-lg shadow-sm border border-secondary-200;
}

.badge-success {
  @apply bg-green-100 text-green-800;
}
```

## 📱 PWA функциональность

### Манифест
```json
{
  "name": "TV Company Ad System",
  "short_name": "TV Ad System",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff"
}
```

### Service Worker
- Кэширование статических ресурсов
- Офлайн поддержка
- Автоматические обновления

## ♿ Доступность (WCAG 2.1)

- **Контрастность**: Минимальный коэффициент 4.5:1
- **ARIA атрибуты**: Семантическая разметка
- **Клавиатурная навигация**: Полная поддержка Tab/Enter
- **Screen readers**: Совместимость с программами чтения
- **Увеличение**: Поддержка масштабирования до 200%

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Тесты с покрытием
npm run test:coverage

# Тесты в режиме наблюдения
npm run test:watch
```

### Структура тестов
```
__tests__/
├── components/
├── pages/
├── utils/
└── __mocks__/
```

## 🚀 Развертывание

### Локальное развертывание
```bash
npm run build
npm start
```

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```bash
docker build -t ad-system-frontend .
docker run -p 3000:3000 ad-system-frontend
```

### Vercel (рекомендуется)
```bash
npm install -g vercel
vercel
```

### Деплой на VPS (Ubuntu 22.04)

1. Обновление и установка зависимостей:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose nginx ufw
sudo systemctl enable docker --now
```

2. Подготовка домена/ип:
- Узнайте публичный IP сервера: `curl ifconfig.me`
- Направьте DNS A-запись домена на этот IP (если используете домен)

3. Подготовка окружения:
```bash
sudo mkdir -p /opt/tv-frontend
sudo chown -R $USER:$USER /opt/tv-frontend
cd /opt/tv-frontend
# Скопируйте файлы проекта сюда (scp/rsync/git clone)
```

4. Настройка переменных окружения фронтенда:
Создайте `.env` (или используйте переменные docker-compose):
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_SOCKET_URL=https://api.your-domain.com
```

5. Сборка и запуск:
```bash
docker build -t tv-frontend .
docker run -d --name tv-frontend --restart always \
  -e NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  -e NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
  -p 3000:3000 tv-frontend
```

6. Nginx reverse proxy (SSL/HTTP2):
Файл `/etc/nginx/sites-available/tv-frontend.conf`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Включение сайта и перезапуск:
```bash
sudo ln -s /etc/nginx/sites-available/tv-frontend.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Рекомендуется подключить бесплатный TLS через certbot:
```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d your-domain.com
```

7. Доступ к сайту:
- По IP: `http://<ПУБЛИЧНЫЙ_IP>` (если пробросили порт 3000 напрямую)
- Через домен: `https://your-domain.com` (через Nginx)

8. Подключение к PostgreSQL (бэкенд):
- В вашем бэкенде установите переменную `DATABASE_URL` вида:
```
postgresql://<USER>:<PASSWORD>@<DB_HOST>:5432/<DB_NAME>
```
- Для облачной БД или собственной PostgreSQL на VPS откройте порт 5432 только для бэкенда (UFW/SG)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

9. Применение схемы БД:
```bash
psql "$DATABASE_URL" -f docs/db/schema.sql
psql "$DATABASE_URL" -f docs/db/functions.sql
psql "$DATABASE_URL" -f docs/db/triggers.sql
psql "$DATABASE_URL" -f docs/db/seed.sql
```

10. Обновления:
```bash
docker pull tv-frontend:latest # если используете регистр
docker stop tv-frontend && docker rm tv-frontend
docker build -t tv-frontend . && docker run -d --name tv-frontend --restart always -p 3000:3000 tv-frontend
```

Примечание: фронтенд подключается к API по `NEXT_PUBLIC_API_URL`. Убедитесь, что CORS на бэкенде разрешает домен фронтенда.

## 🗄️ Схема БД и триггеры (PostgreSQL)

SQL-файлы:
- `docs/db/schema.sql` — таблицы, типы, индексы
- `docs/db/functions.sql` — функции (расчет стоимости, комиссий, уведомления, фид услуг)
- `docs/db/triggers.sql` — триггеры (updated_at, расчет стоимости, проверка слотов, уведомления)
- `docs/db/seed.sql` — демо-данные

Ключевая логика:
- Расчет стоимости: `calc_ad_cost(duration_seconds, base_price_per_min)`
- Комиссии: `upsert_commission(application_id, agent_id, amount)` с дефолтным `5%`
- Сервисы (публичный фид): `upsert_services_feed(application_id)`
- Проверка слотов при `approved`: `verify_slots_and_update_feed` (уменьшает `available_slots`)
- Уведомления статусов: `application_status_notify`

### Nginx конфигурация
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 Безопасность

### JWT аутентификация
- Токены хранятся в httpOnly cookies
- Автоматическое обновление токенов
- Защита от CSRF атак

### XSS защита
- Санитизация пользовательского ввода
- CSP заголовки
- Экранирование HTML

### HTTPS
- Принудительное использование HTTPS в продакшене
- HSTS заголовки
- Безопасные cookies

## 📊 Мониторинг и аналитика

### Производительность
- Core Web Vitals метрики
- Bundle анализ
- Lazy loading компонентов

### Ошибки
- Sentry интеграция (опционально)
- Логирование ошибок
- Пользовательская обратная связь

## 🤝 Разработка

### Git workflow
```bash
# Создание feature ветки
git checkout -b feature/new-feature

# Коммит изменений
git add .
git commit -m "feat: add new feature"

# Push и создание PR
git push origin feature/new-feature
```

### Code style
- ESLint + Prettier
- TypeScript strict mode
- Conventional commits
- Husky pre-commit hooks

## 📞 Поддержка

Для вопросов и поддержки:
- 📧 Email: support@tvcompany.com
- 📱 Telegram: @tvcompany_support
- 🌐 Website: https://tvcompany.com

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🙏 Благодарности

- [Next.js](https://nextjs.org/) - React фреймворк
- [Tailwind CSS](https://tailwindcss.com/) - CSS фреймворк
- [Redux Toolkit](https://redux-toolkit.js.org/) - Управление состоянием
- [Chart.js](https://www.chartjs.org/) - Библиотека графиков
- [Socket.io](https://socket.io/) - Реальное время
- [Heroicons](https://heroicons.com/) - Иконки

---

**Версия**: 1.0.0  
**Последнее обновление**: Декабрь 2024  
**Автор**: TV Company Development Team
