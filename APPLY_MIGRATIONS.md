# 🔧 Применение миграций БД

Выполните эти команды в PowerShell:

```powershell
# 1. Добавить колонку data (JSONB) в таблицу notifications
psql -U postgres -d TVShow -f "docs/db/migrations/2025-10-23-add-notifications-data-column.sql"

# 2. Проверить структуру таблицы
psql -U postgres -d TVShow -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' ORDER BY ordinal_position;"
```

Должны быть все колонки:
- id (uuid)
- user_id (uuid)
- type (text)
- title (text)
- message (text)
- read (boolean)
- created_at (timestamp with time zone)
- read_at (timestamp with time zone) ✅ ДОБАВЛЕНО
- data (jsonb) ⚠️ НУЖНО ДОБАВИТЬ

После применения миграции перезапустите серверы:
```powershell
npm run dev
npm run socket-server
```
