# 🗄️ Soul FM Hub - SQL Deployment Guide

## 📋 Быстрый старт

### Вариант 1: Одна команда (рекомендуется) ⚡

```bash
# В Supabase Dashboard → SQL Editor
# Скопируй и выполни:
```

```sql
-- Весь setup в одном файле
\i supabase/migrations/quick_setup.sql
```

**ИЛИ через Web UI:**
1. Открой `supabase/migrations/quick_setup.sql`
2. Скопируй весь код
3. Supabase Dashboard → SQL Editor → New Query
4. Вставь код → Run

---

## 📂 Файлы миграций

### `/supabase/migrations/`

```
📁 migrations/
├── 00_initial_schema.sql    ← Полная схема БД (900+ строк)
├── 01_admin_queries.sql      ← Полезные SQL запросы
├── quick_setup.sql           ← Быстрый setup (рекомендуется)
└── README.md                 ← Подробная документация
```

---

## 🚀 Что создаётся

### 1. **Таблица:** `kv_store_06086aa3`

```sql
CREATE TABLE kv_store_06086aa3 (
  key TEXT PRIMARY KEY,           -- Ключ (user:uuid, track:id, etc.)
  value JSONB NOT NULL,           -- Данные в JSON
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. **Индексы (4 шт):**
- ✅ `idx_kv_value_gin` - GIN для быстрого поиска в JSONB
- ✅ `idx_kv_created_at` - Сортировка по дате создания
- ✅ `idx_kv_updated_at` - Сортировка по дате обновления
- ✅ `idx_kv_key_prefix` - Быстрый поиск по префиксу ключа

### 3. **RLS Политики (4 шт):**
- ✅ Service Role → Full access
- ✅ Super Admin → Full access (проверка через функцию)
- ✅ Authenticated → Чтение публичных данных
- ✅ Anonymous → Только stream и публичный контент

### 4. **Функции:**
- ✅ `update_updated_at_column()` - Auto-update timestamp
- ✅ `get_user_role(uuid)` - Получить роль юзера
- ✅ `is_super_admin(uuid)` - Проверка admin прав
- ✅ `search_kv_by_prefix(text)` - Поиск по префиксу
- ✅ `cleanup_old_history()` - Очистка старых данных
- ✅ `get_kv_store_size()` - Мониторинг размера БД

### 5. **Views:**
- ✅ `kv_stats` - Статистика (кол-во треков, плейлистов, etc.)
- ✅ `kv_recent_activity` - Последние 100 изменений

### 6. **Начальные данные:**
```json
stream:status → {"status": "offline", "bitrate": 128, "listeners": 0}
stream:nowplaying → {"title": "Soul FM Hub", "artist": "Starting Soon"}
```

---

## 🔍 Проверка после установки

### 1. Проверь таблицу
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'kv_store_06086aa3';
-- ✅ Должна вернуть: kv_store_06086aa3
```

### 2. Проверь индексы
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'kv_store_06086aa3';
-- ✅ Должно быть 4 индекса
```

### 3. Проверь статистику
```sql
SELECT * FROM kv_stats;
-- ✅ Должна вернуть:
-- total_keys: 2
-- total_tracks: 0
-- total_playlists: 0
-- etc.
```

### 4. Проверь размер БД
```sql
SELECT * FROM get_kv_store_size();
-- ✅ Должна показать размер таблицы и индексов
```

### 5. Проверь RLS
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'kv_store_06086aa3';
-- ✅ Должно быть 4 политики
```

---

## 👥 Создание Admin пользователя

### После signup через API:

```sql
-- Замени YOUR_USER_UUID на реальный UUID из auth.users
UPDATE kv_store_06086aa3
SET value = jsonb_set(value, '{role}', '"super_admin"')
WHERE key = 'user:YOUR_USER_UUID';
```

### ИЛИ напрямую создай:

```sql
INSERT INTO kv_store_06086aa3 (key, value)
VALUES (
    'user:YOUR_USER_UUID',
    jsonb_build_object(
        'id', 'YOUR_USER_UUID',
        'email', 'admin@soulfm.radio',
        'name', 'Admin',
        'role', 'super_admin',
        'avatar', '',
        'createdAt', NOW()
    )
)
ON CONFLICT (key) DO UPDATE
SET value = jsonb_set(kv_store_06086aa3.value, '{role}', '"super_admin"');
```

---

## 📊 Структура ключей

```
user:{uuid}              → Пользователи
stream:nowplaying        → Текущий трек
stream:status            → Статус стрима
history:{timestamp}      → История треков
track:{id}               → Библиотека треков
playlist:{id}            → Плейлисты
show:{id}                → Радио шоу
schedule:{id}            → Расписание
podcast:{slug}           → Подкасты
profile:{slug}           → DJ/Host профили
article:{slug}           → Статьи
jingle:{id}              → Джинглы
automation:{id}          → Правила автоматизации
donation:{id}            → Донаты
analytics:{type}:{date}  → Аналитика
```

---

## 🛠️ Полезные запросы

### Посмотреть все типы данных:
```sql
SELECT
    SPLIT_PART(key, ':', 1) as type,
    COUNT(*) as count
FROM kv_store_06086aa3
GROUP BY type
ORDER BY count DESC;
```

### Найти все треки:
```sql
SELECT
    key,
    value->>'title' as title,
    value->>'artist' as artist
FROM kv_store_06086aa3
WHERE key LIKE 'track:%';
```

### Посмотреть последние 10 изменений:
```sql
SELECT * FROM kv_recent_activity LIMIT 10;
```

### Очистить историю старше 30 дней:
```sql
SELECT cleanup_old_history();
```

---

## 🔒 Безопасность (RLS)

### Кто что может:

**Anonymous (не залогинен):**
- ✅ Читать: stream data, profiles, shows, podcasts, articles
- ❌ Писать: ничего

**Authenticated (залогинен):**
- ✅ Читать: всё что anonymous + schedule, плейлисты
- ❌ Писать: только через API с проверкой роли

**Super Admin:**
- ✅ Читать: всё
- ✅ Писать: всё
- ✅ Удалять: всё

**Service Role (Backend):**
- ✅ Full access ко всему

---

## 🚨 Troubleshooting

### Проблема: "Permission denied for table"
```sql
-- Проверь от какой роли выполняешь:
SELECT current_user, session_user;

-- Должен быть postgres или service_role
```

### Проблема: "Table already exists"
```sql
-- Это нормально! Значит таблица уже создана
-- Если нужно пересоздать:
DROP TABLE IF EXISTS kv_store_06086aa3 CASCADE;
-- Потом запусти миграцию снова
```

### Проблема: Медленные запросы
```sql
-- Пересобери индексы:
REINDEX TABLE kv_store_06086aa3;

-- Vacuum:
VACUUM ANALYZE kv_store_06086aa3;
```

---

## 📈 Мониторинг

### Размер БД:
```sql
SELECT * FROM get_kv_store_size();
```

### Использование индексов:
```sql
SELECT
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE tablename = 'kv_store_06086aa3'
ORDER BY idx_scan DESC;
```

### Топ самых больших ключей:
```sql
SELECT
    key,
    pg_size_pretty(pg_column_size(value)) as size
FROM kv_store_06086aa3
ORDER BY pg_column_size(value) DESC
LIMIT 10;
```

---

## 🔄 Backup & Restore

### Backup:
```sql
-- Export всех данных
COPY (
    SELECT json_agg(row_to_json(t))
    FROM (SELECT * FROM kv_store_06086aa3) t
) TO '/tmp/soul_fm_backup.json';
```

### Restore:
```sql
-- Создай temp таблицу
CREATE TEMP TABLE temp_import (data jsonb);

-- Загрузи данные
COPY temp_import FROM '/tmp/soul_fm_backup.json';

-- Импортируй
INSERT INTO kv_store_06086aa3 (key, value, created_at, updated_at)
SELECT
    d->>'key',
    (d->>'value')::jsonb,
    (d->>'created_at')::timestamp,
    (d->>'updated_at')::timestamp
FROM temp_import, jsonb_array_elements(data) d
ON CONFLICT (key) DO NOTHING;
```

---

## 📞 Поддержка

Если возникли проблемы:

1. **Проверь логи:**
   ```
   Supabase Dashboard → Logs → Database
   ```

2. **Проверь подключение:**
   ```sql
   SELECT version();
   SELECT current_database();
   ```

3. **Проверь здоровье:**
   ```sql
   SELECT * FROM kv_stats;
   ```

---

## ✅ Чеклист деплоя

- [ ] SQL миграция выполнена (`quick_setup.sql`)
- [ ] Таблица `kv_store_06086aa3` создана
- [ ] 4 индекса работают
- [ ] 4 RLS политики активны
- [ ] Views доступны (kv_stats)
- [ ] Начальные данные загружены
- [ ] Super admin создан
- [ ] Backend сервер запущен
- [ ] Auto-seeding выполнен (profiles, podcasts)

---

**🎵 База данных готова! Happy broadcasting! ✨**

**Версия:** 1.0.0  
**Дата:** 2026-02-06  
**Статус:** ✅ Production Ready
