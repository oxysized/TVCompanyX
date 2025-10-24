# Оптимизация производительности TVCompanyX

## Проблемы найденные:

### 1. **База данных - отсутствие индексов**
Многие запросы делаются без индексов:
- `applications` таблица (pending/approved/rejected) - нужны индексы на `status`, `agent_id`, `customer_id`, `created_at`
- `chat_messages` - индекс на `room_id`, `created_at`
- `users` - индекс на `email`, `role`

### 2. **N+1 проблемы**
Множество страниц загружают данные по отдельности:
- `agent/chat.tsx` - загружает applications, потом для каждого room идёт отдельный запрос
- `commercial/applications.tsx` - загружает заявки без join с users/shows
- `customer/applications.tsx` - аналогично

### 3. **Отсутствие кэширования**
- Каждый useEffect делает fetch заново
- Нет React.memo для компонентов
- Нет useMemo/useCallback где нужно

### 4. **Избыточный рендеринг**
- Множество компонентов перерисовываются без причины
- `getStatusText`, `getStatusColor` создаются заново при каждом рендере

## Решения:

### SQL миграция - добавление индексов
```sql
-- Индексы для таблиц workflow
CREATE INDEX IF NOT EXISTS idx_pending_applications_status ON pending_applications(status);
CREATE INDEX IF NOT EXISTS idx_pending_applications_agent_id ON pending_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_pending_applications_customer_id ON pending_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_pending_applications_created_at ON pending_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approved_applications_status ON approved_applications(status);
CREATE INDEX IF NOT EXISTS idx_approved_applications_agent_id ON approved_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_approved_applications_customer_id ON approved_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_approved_applications_created_at ON approved_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rejected_applications_status ON rejected_applications(status);
CREATE INDEX IF NOT EXISTS idx_rejected_applications_agent_id ON rejected_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_rejected_applications_customer_id ON rejected_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_rejected_applications_created_at ON rejected_applications(created_at DESC);

-- Индексы для чата
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);

-- Индексы для пользователей
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Индексы для shows
CREATE INDEX IF NOT EXISTS idx_show_schedule_show_id ON show_schedule(show_id);
CREATE INDEX IF NOT EXISTS idx_show_schedule_date ON show_schedule(scheduled_date);

-- Composite индексы для частых запросов
CREATE INDEX IF NOT EXISTS idx_pending_app_status_agent ON pending_applications(status, agent_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_chat_room_sender ON chat_messages(room_id, sender_id, created_at DESC);
```

### Оптимизация API запросов
Вместо отдельных запросов, нужно использовать JOIN:

```typescript
// database.ts - новая функция
async getApplicationsWithDetails(filters?: any) {
  const query = `
    SELECT 
      a.*,
      u_customer.name as customer_name,
      u_customer.email as customer_email,
      u_agent.name as agent_name,
      s.name as show_name,
      s.base_cost_per_second
    FROM (
      SELECT *, 'pending' as status FROM pending_applications
      UNION ALL
      SELECT *, 'approved' as status FROM approved_applications
      UNION ALL
      SELECT *, 'rejected' as status FROM rejected_applications
    ) a
    LEFT JOIN users u_customer ON a.customer_id = u_customer.id
    LEFT JOIN users u_agent ON a.agent_id = u_agent.id
    LEFT JOIN shows s ON a.show_id = s.id
    WHERE 1=1
    ${filters?.status ? 'AND a.status = $1' : ''}
    ${filters?.agent_id ? 'AND a.agent_id = $2' : ''}
    ORDER BY a.created_at DESC
    LIMIT 100
  `
  // Execute with proper parameters
}
```

### React оптимизации

1. **Мемоизация хелперов:**
```typescript
// Вынести в отдельный файл utils/statusHelpers.ts
export const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'На рассмотрении',
    approved: 'Одобрена',
    rejected: 'Отклонена',
    sent_to_commercial: 'Отправлена'
  }
  return statusMap[status] || 'Неизвестно'
}

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    sent_to_commercial: 'bg-blue-100 text-blue-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}
```

2. **Мемоизация компонентов:**
```typescript
// Обернуть тяжелые компоненты в React.memo
const ApplicationRow = React.memo(({ application, onAction }) => {
  // ...
})

// Использовать useMemo для вычисляемых значений
const filteredApplications = useMemo(() => {
  return applications.filter(app => 
    statusFilter === 'all' || app.status === statusFilter
  )
}, [applications, statusFilter])
```

3. **Lazy loading:**
```typescript
// Использовать dynamic import для больших компонентов
const Chat = dynamic(() => import('../../components/chat/Chat'), {
  loading: () => <div>Загрузка чата...</div>,
  ssr: false
})
```

## Приоритеты внедрения:

1. ✅ **Высокий приоритет**: Добавить индексы в БД (файл миграции)
2. ✅ **Высокий**: Оптимизировать getApplications с JOIN
3. ✅ **Средний**: Вынести хелперы в utils, использовать React.memo
4. ✅ **Средний**: Добавить SWR или React Query для кэширования
5. ⏳ **Низкий**: Lazy loading для больших страниц

## Дополнительные рекомендации:

- Использовать pagination для списков (limit/offset)
- Добавить debounce для поиска
- Использовать virtualized lists для больших списков (react-window)
- Сжатие ответов API (gzip)
- CDN для статических ресурсов
