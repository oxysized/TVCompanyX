# 🔔 Система уведомлений - Полная реализация

**Дата завершения:** 23 октября 2025  
**Статус:** ✅ ПОЛНОСТЬЮ ГОТОВА И ИНТЕГРИРОВАНА

## 📋 Обзор

Полнофункциональная система уведомлений с:
- ✅ Персистентным хранилищем (PostgreSQL)
- ✅ RESTful API (CRUD операции)
- ✅ Realtime доставкой (Socket.io)
- ✅ UI компонентом с dropdown
- ✅ Браузерными уведомлениями (Web Notifications API)
- ✅ Автоматическими триггерами во всех workflow

---

## 🗄️ База данных

### Таблица `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
```

### Индексы (оптимизированы для быстрых запросов)

```sql
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread_created ON notifications(user_id, read, created_at DESC);
```

**Миграция:** `docs/db/migrations/2025-10-23-create-notifications-table.sql`

---

## 🔌 API Endpoints

### `GET /api/notifications`
Получить список уведомлений пользователя

**Query Parameters:**
- `?unread=true` - только непрочитанные

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "type": "status_changed",
    "title": "Статус заявки изменен",
    "message": "Ваша заявка #abc12345 теперь: Одобрена",
    "data": {
      "applicationId": "uuid",
      "newStatus": "approved",
      "statusText": "Одобрена"
    },
    "read": false,
    "created_at": "2025-10-23T12:00:00Z",
    "read_at": null
  }
]
```

### `POST /api/notifications`
Создать новое уведомление

**Body:**
```json
{
  "user_id": "uuid",
  "type": "status_changed",
  "title": "Заголовок",
  "message": "Текст уведомления",
  "data": {
    "custom": "data"
  }
}
```

### `PUT /api/notifications`
Отметить уведомление как прочитанное

**Body:**
```json
{
  "id": "uuid"
}
```

### `DELETE /api/notifications`
Отметить ВСЕ уведомления пользователя как прочитанные

### `GET /api/notifications/unread-count`
Получить количество непрочитанных уведомлений

**Response:**
```json
{
  "count": 5
}
```

---

## 🔥 Realtime (Socket.io)

### События

#### Client → Server

**`joinNotifications(userId)`**
Подписаться на уведомления конкретного пользователя
```javascript
socketService.joinNotifications(user.id)
```

#### Server → Client

**`notification`**
Получение нового уведомления в realtime
```javascript
socketService.on('notification', (notification) => {
  // Обработка уведомления
  console.log('Новое уведомление:', notification)
})
```

#### Broadcast

**`sendNotification({userId, notification})`**
Отправка уведомления конкретному пользователю
```javascript
// Серверная сторона (API)
sendNotificationToUser(userId, notification)
```

### Комнаты

Формат: `user-${userId}`

Каждый пользователь получает свою комнату для изолированной доставки уведомлений.

---

## 🎨 UI Компонент

### `<NotificationBell />`

**Расположение:** `src/components/NotificationBell.tsx`  
**Интегрирован в:** `src/components/layout/Header.tsx`

#### Функции:

1. **Значок с badge** - показывает количество непрочитанных (максимум 99+)
2. **Dropdown меню** - список последних непрочитанных уведомлений
3. **Клик по уведомлению** - автоматически отмечает как прочитанное и перенаправляет
4. **"Отметить все как прочитанные"** - массовое обновление
5. **Realtime обновления** - через Socket.io
6. **Браузерные уведомления** - popup в Windows/macOS
7. **Polling fallback** - каждые 30 секунд обновляет счетчик
8. **Click-outside** - закрывает dropdown
9. **Относительное время** - "Только что", "5 мин назад", "2 часа назад"
10. **Цветовая кодировка** - по типу уведомления

#### Пример использования:

```tsx
import NotificationBell from '@/components/NotificationBell'

// В Header или любом компоненте
<NotificationBell />
```

---

## ⚙️ Автоматические триггеры

### 1. Изменение статуса заявки

**Файл:** `src/pages/api/applications/[id].ts`  
**Триггер:** `PUT /api/applications/:id` с `body.status`

**Типы уведомлений:**
- `status_changed` - для клиента при любом изменении статуса

**Пример:**
```typescript
// Когда заявка одобрена/отклонена/изменен статус
await db.createNotification({
  user_id: application.customer_id,
  type: 'status_changed',
  title: 'Статус заявки изменен',
  message: 'Ваша заявка #abc12345 теперь: Одобрена',
  data: { applicationId, newStatus, statusText }
})

sendNotificationToUser(application.customer_id, notification)
```

### 2. Новое сообщение в чате

**Файл:** `src/pages/api/chat/rooms/[roomId]/messages.ts`  
**Триггер:** `POST /api/chat/rooms/:roomId/messages`

**Типы уведомлений:**
- `new_message` - для второй стороны чата

**Логика:**
- Парсит `roomId` для определения участников
- Отправляет уведомление другой стороне (не отправителю)
- Поддерживает форматы:
  - `customer-agent-{customerId}-{agentId}`
  - `commercial-agent-{agentId}-app-{appId}`

**Пример:**
```typescript
await db.createNotification({
  user_id: recipientId,
  type: 'new_message',
  title: 'Новое сообщение',
  message: 'Иван Петров: Здравствуйте, когда будет результат?',
  data: { roomId, messageId, senderId, senderName }
})

sendNotificationToUser(recipientId, notification)
```

### 3. Выплата комиссии

**Файл:** `src/pages/api/commissions/[id].ts`  
**Триггер:** `PUT /api/commissions/:id` со `status: 'paid'`

**Типы уведомлений:**
- `commission_paid` - для агента при выплате

**Пример:**
```typescript
await db.createNotification({
  user_id: commission.agent_id,
  type: 'commission_paid',
  title: 'Комиссия выплачена',
  message: 'Вам выплачена комиссия в размере 5000 руб. за заявку',
  data: { commissionId, applicationId, amount, paymentDate }
})

sendNotificationToUser(commission.agent_id, notification)
```

---

## 📦 Серверный helper

**Файл:** `src/lib/socketServer.ts`

### Функции:

#### `getSocket(): Socket`
Получить/создать Socket.io client connection к серверу

#### `sendNotificationToUser(userId: string, notification: any): boolean`
Отправить уведомление конкретному пользователю через Socket.io

**Использование в API:**
```typescript
import { sendNotificationToUser } from '@/lib/socketServer'

// После создания уведомления в БД
const notification = await db.createNotification(...)
sendNotificationToUser(userId, notification)
```

#### `disconnectSocket(): void`
Отключить Socket.io client (при остановке сервера)

### Переменные окружения:

```env
SOCKET_URL=http://localhost:4000
```

---

## 🧪 Тестирование

### Проверка статус заявки:

1. Залогиниться как клиент
2. Подать заявку
3. Залогиниться как агент/коммерческий
4. Изменить статус заявки
5. Вернуться к клиенту → должно появиться уведомление (красная точка)
6. Кликнуть на колокольчик → увидеть уведомление
7. Проверить браузерное уведомление (popup)

### Проверка новых сообщений:

1. Открыть чат между клиентом и агентом
2. Отправить сообщение от одной стороны
3. У второй стороны должно появиться уведомление
4. Кликнуть → перейти в чат

### Проверка выплаты комиссии:

1. Залогиниться как бухгалтер/директор
2. Найти комиссию со статусом "pending"
3. Обновить статус на "paid" через `PUT /api/commissions/:id`
4. У агента должно появиться уведомление

---

## 📊 Типы уведомлений

| Тип | Когда создается | Кто получает | Навигация |
|-----|----------------|--------------|-----------|
| `status_changed` | Изменение статуса заявки | Клиент (owner заявки) | `/customer/applications` |
| `new_message` | Новое сообщение в чате | Второй участник чата | `/agent/chat` или `/customer/chat` |
| `commission_paid` | Выплата комиссии | Агент | `/agent/commissions` |

### Расширение системы:

Чтобы добавить новый тип уведомления:

1. Выбрать название типа (например, `application_reminder`)
2. Добавить создание в нужном API endpoint:
   ```typescript
   await db.createNotification({
     user_id: targetUserId,
     type: 'application_reminder',
     title: 'Напоминание',
     message: 'Ваша заявка ожидает ответа',
     data: { ... }
   })
   sendNotificationToUser(targetUserId, notification)
   ```
3. Добавить цвет в `getNotificationColor()` в `NotificationBell.tsx`
4. Добавить обработку клика в `handleNotificationClick()` (если нужна навигация)

---

## 🔒 Безопасность

- ✅ JWT аутентификация на всех endpoints
- ✅ Проверка `user_id` из токена (нельзя читать чужие уведомления)
- ✅ Socket.io rooms изолированы по `user-${userId}`
- ✅ Валидация всех входных данных
- ✅ SQL injection защита (prepared statements)

---

## 🚀 Производительность

### Индексы БД:
- Composite индекс `(user_id, created_at DESC)` - быстрый список
- Partial индекс `WHERE read = FALSE` - только непрочитанные
- Индекс на `type` - фильтрация по типу
- Composite `(user_id, read, created_at DESC)` - оптимальные запросы

### Frontend:
- Polling каждые 30 секунд (не перегружает сервер)
- Socket.io для instant updates
- Local state management (не Redux)
- Dropdown lazy loading

### Backend:
- Connection pooling (PostgreSQL)
- Socket.io persistent connection
- Async/await non-blocking I/O
- Error handling без падения процесса

---

## 📚 Зависимости

### Backend:
- `pg` - PostgreSQL client
- `socket.io` - Realtime server
- `socket.io-client` - Server-to-server communication
- `jsonwebtoken` - JWT auth

### Frontend:
- `socket.io-client` - Realtime client
- React hooks (useState, useEffect, useRef)
- Tailwind CSS - стилизация
- Heroicons - иконки

---

## 🐛 Troubleshooting

### Уведомления не приходят в realtime:

1. Проверить запущен ли Socket.io сервер: `npm run socket-server`
2. Проверить URL в `.env`: `SOCKET_URL=http://localhost:4000`
3. Открыть консоль браузера - должно быть `[Socket] Connected`
4. Проверить серверные логи - должно быть `[Server] Connected to socket server`

### Браузерные уведомления не работают:

1. Проверить разрешение в браузере (Settings → Notifications)
2. Проверить в консоли: `Notification.permission` → должно быть `"granted"`
3. Кликнуть "Разрешить" при первом запросе

### Уведомления не сохраняются в БД:

1. Проверить применена ли миграция: `psql -d TVShow -f docs/db/migrations/2025-10-23-create-notifications-table.sql`
2. Проверить таблицу: `SELECT * FROM notifications LIMIT 5;`
3. Проверить права пользователя БД

### Счетчик не обновляется:

1. Проверить `GET /api/notifications/unread-count` в Network tab
2. Убедиться что JWT токен валидный
3. Проверить `user_id` в токене совпадает с БД

---

## ✅ Чеклист завершения

- [x] База данных: таблица + индексы
- [x] Функции в database.ts (CRUD)
- [x] API endpoints (GET, POST, PUT, DELETE)
- [x] Socket.io server events
- [x] Socket.io client service
- [x] UI компонент NotificationBell
- [x] Интеграция в Header
- [x] Браузерные уведомления
- [x] Realtime подписка
- [x] Триггер: изменение статуса заявки
- [x] Триггер: новое сообщение в чате
- [x] Триггер: выплата комиссии
- [x] Серверный helper для Socket.io
- [x] Документация
- [x] Тестирование всех сценариев

---

## 🎯 Следующие шаги

Система уведомлений полностью готова к использованию! 

**Возможные улучшения в будущем:**
- [ ] Email уведомления (для важных событий)
- [ ] Push notifications (PWA)
- [ ] Настройки уведомлений (какие типы получать)
- [ ] История прочитанных уведомлений
- [ ] Группировка уведомлений по типу
- [ ] Звуковые оповещения
- [ ] Уведомления в Telegram bot

---

**Автор:** GitHub Copilot  
**Версия:** 1.0  
**Последнее обновление:** 23 октября 2025
