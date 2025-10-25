# Исправление Foreign Key для таблицы contracts

## Проблема
При создании договора возникала ошибка:
```
INSERT или UPDATE в таблице "contracts" нарушает ограничение внешнего ключа "contracts_application_id_fkey"
Ключ (application_id)=(xxx) отсутствует в таблице "applications".
```

## Причина
Заявки в системе хранятся в **4 разных таблицах**:
- `applications` - основная таблица
- `pending_applications` - ожидающие заявки
- `approved_applications` - одобренные заявки  
- `rejected_applications` - отклоненные заявки

Foreign key constraint на `contracts.application_id` ссылался только на таблицу `applications`, но когда заявка переходит в статус `approved`, она перемещается в `approved_applications`.

## Решение

### 1. Удален Foreign Key Constraint
```sql
ALTER TABLE contracts 
DROP CONSTRAINT contracts_application_id_fkey;
```

### 2. Добавлена проверка на уровне приложения
В API `/api/contracts` добавлена проверка существования заявки во всех таблицах:
```typescript
const applicationCheck = await pool.query(
  `SELECT id FROM applications WHERE id = $1
   UNION ALL
   SELECT id FROM pending_applications WHERE id = $1
   UNION ALL
   SELECT id FROM approved_applications WHERE id = $1
   UNION ALL
   SELECT id FROM rejected_applications WHERE id = $1
   LIMIT 1`,
  [application_id]
)
```

### 3. Обновлены JOIN запросы
GET запросы теперь ищут заявку во всех таблицах через UNION:
```sql
LEFT JOIN (
  SELECT id, status, show_id FROM applications
  UNION ALL
  SELECT id, status, show_id FROM pending_applications
  UNION ALL
  SELECT id, status, show_id FROM approved_applications
  UNION ALL
  SELECT id, status, show_id FROM rejected_applications
) app ON c.application_id = app.id
```

## Применение миграции

```powershell
Get-Content "d:\projectMy\TVCompanyX\docs\db\migrations\2025-10-25-fix-contracts-fkey.sql" | psql -U postgres -d TVShow
```

## Результат

✅ Договоры теперь можно создавать для заявок в любом статусе  
✅ Проверка целостности данных сохранена на уровне приложения  
✅ Foreign key constraints на `customer_id` и `agent_id` остались (они корректны)

## Проверка

```sql
-- Проверить оставшиеся FK constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'contracts'::regclass
  AND contype = 'f';

-- Должно показать только:
-- contracts_customer_id_fkey
-- contracts_agent_id_fkey
```

## Тестирование

1. Одобрите заявку в коммерческом отделе (статус → `approved`)
2. Заявка переместится в таблицу `approved_applications`
3. Нажмите кнопку "Договор" в чате агента
4. Договор должен успешно создаться ✅
