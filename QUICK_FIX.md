# 🚀 БЫСТРОЕ ИСПРАВЛЕНИЕ ПРОБЛЕМ - Soul FM

## Проблемы

✗ Старая версия сайта
✗ Логин админа не работает (niqbello@gmail.com / SoulFM2024!)
✗ Треки не отображаются после загрузки
✗ Shows не работает

---

## ⚡ БЫСТРОЕ РЕШЕНИЕ (5 минут)

### Шаг 1: Очистить кэш браузера

**Windows/Linux:** `Ctrl + Shift + R`
**Mac:** `Cmd + Shift + R`

Или откройте в режиме инкогнито.

---

### Шаг 2: Создать админа в Supabase

1. **Откройте Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/grwrjwosnfxnzjhuqjdw
   ```

2. **Authentication → Users → Add User:**
   - Email: `niqbello@gmail.com`
   - Password: `SoulFM2024!`
   - ✓ Auto Confirm User
   - Нажмите "Create User"

3. **Скопируйте User ID** (UUID, например: `123e4567-e89b-12d3-a456-426614174000`)

---

### Шаг 3: Настроить базу данных

1. **Откройте SQL Editor в Supabase**

2. **Выполните этот SQL** (замените `YOUR_USER_ID`):

```sql
-- 1. Создать таблицу профилей
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view profiles" ON profiles FOR SELECT TO public USING (true);

-- 2. Назначить роль админа (ЗАМЕНИТЕ YOUR_USER_ID!)
INSERT INTO profiles (id, email, role)
VALUES ('YOUR_USER_ID', 'niqbello@gmail.com', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 3. Создать таблицу треков
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  genre TEXT,
  duration INTEGER,
  file_url TEXT,
  cover_url TEXT,
  short_id TEXT UNIQUE,
  stream_url TEXT,
  year INTEGER,
  bpm INTEGER,
  tags TEXT[],
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view tracks" ON tracks FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can insert tracks" ON tracks FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Создать таблицу shows
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host TEXT,
  description TEXT,
  genre TEXT,
  type TEXT,
  cover TEXT,
  schedule TEXT,
  episodes JSONB,
  average_listeners INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view shows" ON shows FOR SELECT TO public USING (true);
```

3. **Нажмите "Run"**

---

### Шаг 4: Проверить

1. **Логин:**
   - Перейдите на: `https://ваш-сайт.vercel.app/admin/login`
   - Email: `niqbello@gmail.com`
   - Password: `SoulFM2024!`
   - Должно пустить в админ-панель ✓

2. **Загрузка треков:**
   - Перейдите: `/admin/upload`
   - Загрузите MP3 файл
   - Трек должен появиться в списке ✓

3. **Shows:**
   - Перейдите: `/shows`
   - Должна открыться страница без ошибок ✓

---

## ❌ Если НЕ работает

### Проблема: "User ID не найден"

**Решение:**
1. Supabase → Authentication → Users
2. Найдите пользователя `niqbello@gmail.com`
3. Кликните на него
4. Скопируйте `ID` (это UUID)
5. Вставьте в SQL вместо `YOUR_USER_ID`

### Проблема: "Table already exists"

**Решение:**
Это нормально, пропустите этот шаг. Таблица уже создана.

### Проблема: "Function not found"

**Решение:**
Проблема с Edge Function. Нужно деплоить backend код.
Временно: API endpoints не работают, нужен backend developer.

---

## 📝 Проверочный список

После выполнения всех шагов:

- [ ] Браузер обновлён (Ctrl+Shift+R)
- [ ] Админ создан в Supabase
- [ ] User ID скопирован
- [ ] SQL выполнен с правильным User ID
- [ ] Таблицы созданы (profiles, tracks, shows)
- [ ] Логин работает (niqbello@gmail.com / SoulFM2024!)
- [ ] Можно загружать треки
- [ ] Shows страница открывается

---

## 🆘 Всё ещё не работает?

### Проверьте консоль браузера:

1. **F12** → Console
2. Ищите красные ошибки
3. Типичные проблемы:
   - "Failed to fetch" = Edge Function не деплоен
   - "Unauthorized" = Неправильный User ID
   - "Table doesn't exist" = SQL не выполнен

### Проверьте Network:

1. **F12** → Network → XHR
2. Перезагрузите страницу
3. Ищите запросы с статусом 404 или 500
4. Кликните на запрос → Preview → смотрите ошибку

---

## 📚 Полная документация

Для подробностей смотрите:
- `TROUBLESHOOTING.md` - Полное руководство
- `DATABASE_SETUP.sql` - Полная настройка БД
- `QUICK_SETUP.sql` - Быстрая настройка

---

## ✅ Результат

После выполнения:
- ✓ Логин работает
- ✓ Треки загружаются и отображаются
- ✓ Shows страница работает
- ✓ Нет ошибок в консоли

---

**Дата:** 2026-02-17
**Ветка:** copilot/add-playlist-selection-feature
**Статус:** Код исправлен, требуется настройка Supabase
