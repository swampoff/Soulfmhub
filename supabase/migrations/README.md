# 🗄️ Soul FM Hub - Database Migrations

## 📋 Файлы миграций

### `00_initial_schema.sql` - Основная схема БД
**Что создаёт:**
- ✅ Таблица `kv_store_06086aa3` (KV Store)
- ✅ Индексы для производительности (GIN, prefix search)
- ✅ RLS (Row Level Security) политики
- ✅ Триггеры для `updated_at`
- ✅ Helper функции (get_user_role, is_super_admin, search)
- ✅ Views для статистики (kv_stats, kv_recent_activity)
- ✅ Функции обслуживания (cleanup, size monitoring)
- ✅ Начальные данные (stream status)

### `01_admin_queries.sql` - Админские запросы
**Содержит:**
- 📊 Диагностические запросы
- 🔍 Поиск данных
- 👥 Управление пользователями
- 🎵 Управление контентом
- 📈 Аналитика
- 🛠️ Обслуживание БД

---

## 🚀 Как применить миграции

### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. **Открой Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   ```

2. **Перейди в SQL Editor:**
   ```
   Database → SQL Editor → New Query
   ```

3. **Скопируй содержимое `00_initial_schema.sql`**

4. **Выполни запрос (RUN)**

5. **Проверь результат:**
   ```sql
   SELECT * FROM kv_stats;
   ```

### Вариант 2: Через Supabase CLI

```bash
# Установи Supabase CLI (если ещё нет)
npm install -g supabase

# Залогинься
supabase login

# Линкуй проект
supabase link --project-ref YOUR_PROJECT_ID

# Примени миграции
supabase db push

# Или выполни конкретный файл
supabase db execute --file ./supabase/migrations/00_initial_schema.sql
```

### Вариант 3: Автоматически (уже настроено)

Миграция применяется автоматически при деплое через Figma Make! 🎉

---

## 🔍 Проверка после применения

### 1. Проверь таблицу

```sql
-- Должна существовать таблица
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'kv_store_06086aa3';
```

### 2. Проверь индексы

```sql
-- Должно быть 4+ индексов
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'kv_store_06086aa3';
```

### 3. Проверь RLS политики

```sql
-- Должно быть 4 политики
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'kv_store_06086aa3';
```

### 4. Проверь Views

```sql
-- Статистика должна работать
SELECT * FROM kv_stats;

-- Недавняя активность
SELECT * FROM kv_recent_activity LIMIT 5;
```

### 5. Проверь функции

```sql
-- Размер БД
SELECT * FROM get_kv_store_size();

-- Поиск по префиксу
SELECT * FROM search_kv_by_prefix('stream:');
```

---

## 📊 Структура данных (Key Patterns)

```
user:{uuid}              → Пользователи (email, name, role)
stream:nowplaying        → Текущий трек
stream:status            → Статус стрима (online/offline, listeners)
history:{timestamp}      → История воспроизведения
track:{id}               → Треки библиотеки
playlist:{id}            → Плейлисты
show:{id}                → Радио-шоу
schedule:{id}            → Расписание эфира
podcast:{slug}           → Подкасты
profile:{slug}           → DJ/Host профили
article:{slug}           → Статьи/новости
donation:{id}            → Донаты
analytics:{type}:{date}  → Аналитика
jingle:{id}              → Джинглы
automation:{id}          → Правила автоматизации
```

---

## 👥 Роли пользователей

```sql
-- Создать super_admin (замени YOUR_USER_UUID)
INSERT INTO kv_store_06086aa3 (key, value)
VALUES (
    'user:YOUR_USER_UUID',
    '{"id":"YOUR_USER_UUID","email":"admin@soulfm.radio","name":"Admin","role":"super_admin"}'::jsonb
);
```

**Доступные роли:**
- `listener` - Обычный слушатель (по умолчанию)
- `super_admin` - Полный доступ ко всему

---

## 🛠️ Полезные команды

### Посмотреть все ключи по типу

```sql
SELECT
    SPLIT_PART(key, ':', 1) as type,
    COUNT(*) as count
FROM kv_store_06086aa3
GROUP BY type
ORDER BY count DESC;
```

### Экспорт данных

```sql
-- Экспорт в JSON
COPY (
    SELECT json_agg(row_to_json(t))
    FROM (SELECT * FROM kv_store_06086aa3) t
) TO '/tmp/backup.json';
```

### Очистка старых данных

```sql
-- Удалить историю старше 30 дней
SELECT cleanup_old_history();
```

### Оптимизация

```sql
-- Vacuum и analyze
VACUUM ANALYZE kv_store_06086aa3;

-- Пересборка индексов
REINDEX TABLE kv_store_06086aa3;
```

---

## 🔒 Row Level Security (RLS)

### Политики доступа:

1. **Service Role** → Full access ко всему
2. **Super Admin** → Full access (через функцию проверки)
3. **Authenticated** → Чтение публичных данных
4. **Anonymous** → Только stream данные и публичный контент

### Проверить RLS

```sql
-- Посмотреть все политики
SELECT * FROM pg_policies WHERE tablename = 'kv_store_06086aa3';
```

---

## 📈 Мониторинг производительности

### Размер таблицы

```sql
SELECT * FROM get_kv_store_size();
```

### Статистика использования индексов

```sql
SELECT
    indexname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename = 'kv_store_06086aa3';
```

### Медленные запросы

```sql
-- Требует pg_stat_statements extension
SELECT * FROM pg_stat_statements
WHERE query LIKE '%kv_store%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Проблема: Таблица не создаётся

**Решение:**
```sql
-- Проверь права
SELECT current_user;

-- Должен быть postgres или service_role
```

### Проблема: RLS блокирует запросы

**Решение:**
```sql
-- Временно отключи RLS (только для тестов!)
ALTER TABLE kv_store_06086aa3 DISABLE ROW LEVEL SECURITY;

-- Не забудь включить обратно
ALTER TABLE kv_store_06086aa3 ENABLE ROW LEVEL SECURITY;
```

### Проблема: Медленный поиск

**Решение:**
```sql
-- Убедись что GIN индекс создан
SELECT * FROM pg_indexes 
WHERE tablename = 'kv_store_06086aa3' 
AND indexname = 'idx_kv_value_gin';

-- Пересобери индекс
REINDEX INDEX idx_kv_value_gin;
```

---

## 📝 Changelog

### v1.0.0 (2026-02-06)
- ✅ Начальная схема
- ✅ RLS политики
- ✅ Индексы для производительности
- ✅ Helper функции
- ✅ Views для статистики
- ✅ Seed данные

---

## 🎯 Next Steps

После применения миграции:

1. **Проверь здоровье БД:**
   ```sql
   SELECT * FROM kv_stats;
   SELECT * FROM get_kv_store_size();
   ```

2. **Создай первого admin:**
   ```sql
   -- Через /auth/signup с role: super_admin
   ```

3. **Seed тестовые данные:**
   ```bash
   # Автоматически при старте сервера
   # Или вручную через API
   POST /profiles/seed
   POST /podcasts/seed
   ```

4. **Настрой мониторинг:**
   - CloudWatch / Grafana для метрик
   - Supabase Dashboard для логов

---

**✨ База данных готова к production! Happy broadcasting! 🎵**
