# Система договоров - Инструкция по применению

## 1. Применение миграции базы данных

### Шаг 1: Подключиться к PostgreSQL
```powershell
psql -U postgres -d TVShow
```

### Шаг 2: Выполнить миграцию
```sql
\i d:/projectMy/TVCompanyX/docs/db/migrations/2025-10-25-create-contracts-table.sql
```

### Шаг 3: Проверить созданные объекты
```sql
-- Проверить таблицу
\d contracts

-- Проверить функции
\df generate_contract_number
\df set_contract_number
\df update_contracts_updated_at

-- Проверить последовательность
SELECT * FROM contracts_number_seq;

-- Проверить что номера генерируются корректно
SELECT generate_contract_number();
```

## 2. Использование системы договоров

### Для агента

1. **После одобрения заявки коммерческим отделом:**
   - Статус заявки изменится на `approved`
   - В чате с клиентом появится зелёная кнопка "Договор"

2. **Отправка договора:**
   - Нажмите кнопку "Договор"
   - Подтвердите отправку
   - Система автоматически создаст договор с уникальным номером (DOG-2025-001234)
   - Клиент получит уведомление

3. **Что включает договор:**
   - Номер договора (автоматический)
   - Информация о компании
   - Данные клиента (имя, email, телефон)
   - Название шоу
   - Дата и время эфира
   - Продолжительность рекламы
   - Стоимость
   - Описание заявки

### Для заказчика

1. **Просмотр договоров:**
   - Откройте меню "Документы" в боковой панели
   - Увидите список всех договоров

2. **Статусы договоров:**
   - 🔵 **Отправлен** - договор создан, но ещё не просмотрен
   - 🟡 **Просмотрен** - вы открыли детали договора
   - 🟢 **Загружен** - вы скачали договор

3. **Действия с договором:**
   - 👁️ **Просмотреть** - открыть детали договора
   - 📥 **Скачать** - загрузить договор (отметит как загруженный)

## 3. API Endpoints

### GET /api/contracts
Получить список договоров
```typescript
// Параметры
?customerId=uuid  // фильтр по клиенту
?agentId=uuid     // фильтр по агенту

// Ответ
[{
  id: string
  contract_number: string
  show_name: string
  cost: number
  status: 'sent' | 'viewed' | 'downloaded'
  created_at: string
  ...
}]
```

### POST /api/contracts
Создать новый договор
```typescript
// Тело запроса
{
  application_id: string
  customer_id: string
  agent_id: string
  show_name: string
  scheduled_at: string
  duration_seconds: number
  cost: number
  customer_name: string
  customer_email: string
  customer_phone: string
  description?: string
  company_name?: string
}

// Ответ
{
  id: string
  contract_number: string  // Автоматически: DOG-2025-001234
  ...
}
```

### GET /api/contracts/[id]
Получить один договор
```typescript
// Ответ
{
  id: string
  contract_number: string
  show_name: string
  ...
}
```

### PATCH /api/contracts/[id]
Обновить статус договора
```typescript
// Тело запроса
{
  status?: 'sent' | 'viewed' | 'downloaded'
  viewed_at?: string
  downloaded_at?: string
}
```

## 4. Автоматическая генерация номеров

### Формат номера договора
```
DOG-YYYY-XXXXXX
```
- `DOG` - префикс (Договор)
- `YYYY` - текущий год
- `XXXXXX` - порядковый номер (с ведущими нулями)

### Примеры
- DOG-2025-001000
- DOG-2025-001001
- DOG-2025-001234
- DOG-2026-000001 (новый год - счётчик продолжается)

### Работа последовательности
```sql
-- Текущее значение
SELECT last_value FROM contracts_number_seq;

-- Следующий номер
SELECT nextval('contracts_number_seq');

-- Сброс (если нужно)
ALTER SEQUENCE contracts_number_seq RESTART WITH 1000;
```

## 5. Дополнительные возможности

### Socket уведомления
При отправке договора клиенту отправляется уведомление:
```typescript
socketService.emit('send_notification', {
  userId: customer_id,
  type: 'contract_sent',
  message: `Вам отправлен договор ${contract_number}`,
  data: { contractId, applicationId }
})
```

### Проверка дубликатов
Система автоматически проверяет, что для одной заявки не создано несколько договоров.

### Снимок данных
Договор сохраняет данные клиента на момент создания, чтобы изменения в профиле не влияли на старые договоры.

## 6. Следующие шаги (TODO)

1. **PDF генерация:**
   - Установить библиотеку: `npm install jspdf`
   - Создать endpoint `/api/contracts/[id]/download`
   - Сгенерировать PDF с красивым шаблоном
   - Добавить логотип компании

2. **Email уведомления:**
   - Отправлять договор на email клиента
   - Включать PDF во вложение

3. **Цифровая подпись:**
   - Добавить возможность подписи договора клиентом
   - Сохранять статус подписи

4. **Архив:**
   - Возможность архивирования старых договоров
   - Фильтр по датам

5. **Печать:**
   - Версия для печати с правильными отступами
   - QR-код для проверки подлинности

## 7. Проверка работоспособности

### Тест 1: Создание договора
1. Создайте заявку от имени клиента
2. Примите её как агент
3. Отправьте в коммерческий отдел
4. Одобрите как коммерческий отдел
5. Как агент - нажмите "Договор"
6. Проверьте, что договор создан с номером

### Тест 2: Просмотр договора клиентом
1. Зайдите как клиент
2. Откройте "Документы"
3. Увидите договор со статусом "Отправлен"
4. Нажмите "Просмотреть"
5. Статус изменится на "Просмотрен"

### Тест 3: Загрузка договора
1. В деталях договора нажмите "Скачать"
2. Статус изменится на "Загружен"
3. Проверьте timestamps в базе

### SQL запросы для проверки
```sql
-- Все договоры
SELECT 
  contract_number,
  customer_name,
  show_name,
  cost,
  status,
  created_at
FROM contracts
ORDER BY created_at DESC;

-- Статистика по статусам
SELECT 
  status,
  COUNT(*) as count
FROM contracts
GROUP BY status;

-- Договоры с информацией о заявке
SELECT 
  c.contract_number,
  c.customer_name,
  c.show_name,
  c.cost,
  c.status,
  a.status as application_status
FROM contracts c
JOIN applications a ON c.application_id = a.id;
```

## 8. Устранение неполадок

### Проблема: Номер договора не генерируется
```sql
-- Проверить триггер
SELECT * FROM pg_trigger WHERE tgname = 'trigger_set_contract_number';

-- Проверить функцию
SELECT generate_contract_number();
```

### Проблема: Дубликаты договоров
```sql
-- Найти дубликаты
SELECT 
  application_id,
  COUNT(*) as count
FROM contracts
GROUP BY application_id
HAVING COUNT(*) > 1;

-- Удалить дубликаты (оставить только первый)
DELETE FROM contracts
WHERE id NOT IN (
  SELECT MIN(id)
  FROM contracts
  GROUP BY application_id
);
```

### Проблема: Кнопка "Договор" не появляется
1. Проверить статус заявки в базе: `SELECT status FROM applications WHERE id = ?`
2. Должен быть `approved`
3. Проверить код в `agent/chat.tsx` строки 630-650

### Проблема: Ошибка при создании договора
1. Проверить логи в консоли браузера
2. Проверить логи API в терминале
3. Проверить данные заявки: все поля должны быть заполнены
4. Проверить права доступа к таблице contracts

## 9. Безопасность

- ✅ Проверка существующего договора перед созданием
- ✅ Валидация данных на стороне API
- ✅ Использование prepared statements (защита от SQL injection)
- ✅ Проверка прав доступа (только агент может создавать)
- ✅ Снимок данных (защита от изменения истории)

## 10. Производительность

Созданные индексы:
```sql
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX idx_contracts_agent_id ON contracts(agent_id);
CREATE INDEX idx_contracts_application_id ON contracts(application_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);
```

Эти индексы обеспечивают быструю выборку:
- Договоров по клиенту
- Договоров по агенту
- По статусу
- По дате создания
