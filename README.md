# TV Company Ad System — Frontend

Фронтенд веб-приложения для учёта и управления рекламными заявками телекомпании. Построен на Next.js + React + TypeScript, использует Tailwind CSS, Redux Toolkit и Socket.io. Проект оптимизирован под PWA и рассчитан на работу в связке с бэкендом (API + БД).

## Ключевые возможности

- Полнофункциональная админ-панель и роли: заказчик, агент, коммерция, бухгалтер, ИТ-админ, директор.
- Калькулятор стоимости рекламы, обработка заявок, отчёты (PDF/Excel), управление расписанием шоу.
- Чат в реальном времени (Socket.io) и уведомления.
- PWA (service worker + manifest), офлайн-кеширование и отдельный манифест.
- Доступность (WCAG 2.1) и адаптивный дизайн на Tailwind CSS.
- JWT-аутентификация и базовые меры безопасности (CSP, httpOnly cookies, CSRF-защита на бэкенде).

## Быстрый старт

1. Склонируйте репозиторий и перейдите в папку проекта:

## Дополнительно

В репозитории сохранены SQL-скрипты и вспомогательные документы в папке `docs/` (схема БД, функции, триггеры и seed). Для продакшен-развертывания рекомендуем использовать `docker-compose.yml` и настраивать обратный прокси (Nginx) с TLS.

Если нужно, могу дополнительно:

- привести список всех API-эндпоинтов в формате OpenAPI/Swagger
- добавить раздел с примером env-конфигурации для production
- подготовить GitHub Actions workflow для CI/CD

---

Версия: 1.0.0
Последнее обновление: 21 октября 2025
Автор: TV Company Development Team
---

Версия: 1.0.0
Последнее обновление: 21 октября 2025
Автор: TV Company Development Team
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
