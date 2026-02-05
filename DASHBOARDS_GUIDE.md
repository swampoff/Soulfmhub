# 🎛️ Soul FM Hub - Dashboards & Role System

## ✅ Добавлено в систему

### **1. Полная система ролей с авторизацией**

```typescript
Роли:
├── listener          // Слушатель (базовый доступ)
├── dj                // DJ (управление треками и плейлистами)
├── host              // Ведущий (управление шоу)
├── music_curator     // Музыкальный куратор
├── content_manager   // Контент-менеджер
├── program_director  // Программный директор
└── super_admin       // Супер админ (полный доступ)
```

### **2. Личные кабинеты для каждой роли**

**Файлы:**
- `/src/app/pages/DashboardPage.tsx` - Роутер по ролям
- `/src/app/pages/dashboards/ListenerDashboard.tsx` - Кабинет слушателя
- `/src/app/pages/dashboards/DJDashboard.tsx` - Кабинет DJ
- `/src/app/pages/dashboards/SuperAdminDashboard.tsx` - Главный админ кабинет

**Все admin роли** (DJ, Host, Curator, Manager, Director, Super Admin) используют `SuperAdminDashboard` с полным функционалом.

---

## 🎵 SUPER ADMIN DASHBOARD - Основные возможности

### **📊 Overview Tab**
- Статистика (треки, плейлисты, пользователи, статус стрима)
- Быстрые действия (Upload Track, Create Playlist, Manage Schedule)

### **🎵 Tracks Tab - Управление треками**

**Функции:**
✅ **Upload Track** - Добавить новый трек
✅ **Edit Track** - Редактировать трек
✅ **Delete Track** - Удалить трек
✅ **Track List** - Список всех треков с фильтрами

**Поля трека:**
```typescript
{
  title: string;          // Название *
  artist: string;         // Исполнитель *
  album: string;          // Альбом
  genre: string;          // Жанр (Soul, Funk, Jazz, Disco, Reggae, R&B, Hip-Hop)
  duration: number;       // Длительность (секунды)
  year: number;           // Год выпуска
  bpm: number;            // BPM (темп)
  coverUrl: string;       // URL обложки
  audioUrl: string;       // URL аудио файла *
  tags: string[];         // Теги (groovy, upbeat, classic, etc.)
}
```

**⚠️ ВАЖНО - Audio File URL:**
```
Треки не загружаются напрямую через UI.
Нужно:
1. Загрузить MP3 файл в Supabase Storage
2. Получить public URL
3. Вставить URL в поле "Audio File URL"
```

### **📀 Playlists Tab - Управление плейлистами**

**Функции:**
✅ **Create Playlist** - Создать плейлист
✅ **Edit Playlist** - Редактировать
✅ **Delete Playlist** - Удалить
✅ **Add Tracks to Playlist** - Выбрать треки из библиотеки

**Поля плейлиста:**
```typescript
{
  name: string;           // Название *
  description: string;    // Описание
  genre: string;          // Жанр
  coverUrl: string;       // URL обложки
  trackIds: string[];     // ID треков в плейлисте
}
```

**Workflow создания плейлиста:**
1. Нажать "Create Playlist"
2. Заполнить название и описание
3. Выбрать жанр
4. Выбрать треки из библиотеки (checkbox)
5. Сохранить

### **📅 Schedule Tab**
- Coming soon (временно заглушка)

### **⚙️ Settings Tab**
- Coming soon (временно заглушка)

---

## 👤 LISTENER DASHBOARD - Функции слушателя

**Секции:**
- ✅ **Now Playing** - Текущий трек
- ✅ **Favorites** - Избранное (заглушка)
- ✅ **Recently Played** - История прослушивания

---

## 🔐 АВТОРИЗАЦИЯ

### **Регистрация (Sign Up):**

```typescript
Поля:
- Name (имя пользователя)
- Email
- Password
- Confirm Password
- Role (выбор роли из списка)
```

**Доступные роли при регистрации:**
- Listener ✅
- DJ ✅
- Host ✅
- Music Curator ✅
- Content Manager ✅
- Program Director ✅
- Super Admin ✅

### **Вход (Sign In):**
```typescript
Поля:
- Email
- Password
```

После успешного входа → автоматический редирект на `/dashboard`

---

## 🚀 WORKFLOW ИСПОЛЬЗОВАНИЯ

### **1. Создать admin пользователя:**

```bash
1. Перейти на /auth
2. Выбрать "Sign Up"
3. Заполнить форму:
   - Name: Admin
   - Email: admin@soulfm.radio
   - Password: your-secure-password
   - Role: Super Admin
4. Нажать "Sign Up"
5. Автоматический редирект на /dashboard
```

### **2. Загрузить треки:**

```bash
1. В Dashboard → вкладка "Tracks"
2. Нажать "Upload Track"
3. Заполнить форму:
   - Title: Soul Power
   - Artist: James Brown
   - Genre: Funk
   - Audio File URL: https://your-storage.com/track.mp3
4. Нажать "Add Track"
```

**⚠️ Где взять Audio URL:**

**Вариант A: Supabase Storage (рекомендуется)**
```bash
1. Зайти в Supabase Dashboard
2. Storage → Create Bucket: "soul-fm-tracks" (public)
3. Upload файл MP3
4. Получить Public URL
5. Вставить в форму
```

**Вариант B: Внешний URL**
```bash
Использовать прямую ссылку на MP3:
https://example.com/music/track.mp3
```

### **3. Создать плейлист:**

```bash
1. Загрузить несколько треков (см. шаг 2)
2. В Dashboard → вкладка "Playlists"
3. Нажать "Create Playlist"
4. Заполнить:
   - Name: Morning Grooves
   - Description: Start your day right
   - Genre: Soul
5. Выбрать треки из списка (checkbox)
6. Нажать "Create Playlist"
```

### **4. Управление существующими треками:**

```bash
Редактировать:
1. Нажать кнопку Edit (✏️) рядом с треком
2. Изменить поля
3. Нажать "Update Track"

Удалить:
1. Нажать кнопку Delete (🗑️)
2. Подтвердить удаление
```

---

## 🔧 API ENDPOINTS (используются в Dashboard)

```typescript
// Tracks
POST   /make-server-06086aa3/tracks          // Создать трек
GET    /make-server-06086aa3/tracks          // Получить все треки
GET    /make-server-06086aa3/tracks/:id      // Получить трек по ID
PUT    /make-server-06086aa3/tracks/:id      // Обновить трек
DELETE /make-server-06086aa3/tracks/:id      // Удалить трек

// Playlists
POST   /make-server-06086aa3/playlists       // Создать плейлист
GET    /make-server-06086aa3/playlists       // Получить все плейлисты
GET    /make-server-06086aa3/playlists/:id   // Получить плейлист по ID
PUT    /make-server-06086aa3/playlists/:id   // Обновить плейлист
DELETE /make-server-06086aa3/playlists/:id   // Удалить плейлист

// Auth
POST   /make-server-06086aa3/auth/signup     // Регистрация
POST   /make-server-06086aa3/auth/signin     // Вход (через Supabase)
GET    /make-server-06086aa3/auth/profile    // Получить профиль
```

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
/src/app/pages/
├── DashboardPage.tsx                    // Роутер по ролям
├── AuthPage.tsx                         // Авторизация (обновлено)
└── dashboards/
    ├── ListenerDashboard.tsx            // Кабинет слушателя
    ├── DJDashboard.tsx                  // Кабинет DJ
    ├── HostDashboard.tsx                // Кабинет ведущего
    ├── MusicCuratorDashboard.tsx        // Кабинет куратора
    ├── ContentManagerDashboard.tsx      // Кабинет контент-менеджера
    ├── ProgramDirectorDashboard.tsx     // Кабинет директора
    └── SuperAdminDashboard.tsx          // Главный админ кабинет

/src/context/
└── AppContext.tsx                       // Обновлено (signUp с role)

/src/lib/
└── api.ts                               // Обновлено (все API методы)

/src/app/
└── App.tsx                              // Добавлен route /dashboard
```

---

## 🎨 UI КОМПОНЕНТЫ

**Dashboard использует:**
- ✅ Tabs (для переключения между секциями)
- ✅ Dialog (для модальных окон добавления/редактирования)
- ✅ Card (для блоков контента)
- ✅ Badge (для жанров и статусов)
- ✅ Button (все действия)
- ✅ Input / Select / Textarea (формы)
- ✅ Motion (анимации Framer Motion)
- ✅ Toast (уведомления через Sonner)

**Цветовая схема:**
- Primary: #00d9ff (Cyan)
- Secondary: #00ffaa (Mint)
- Accent: #FF8C42 (Orange)
- Background: gradient from-[#0a1628] via-[#0d1a2d] to-[#0a1628]

---

## 🛠️ ТЕСТИРОВАНИЕ

### **Сценарий 1: Регистрация Super Admin**

```bash
1. Открыть /auth
2. Sign Up:
   - Name: Test Admin
   - Email: test@admin.com
   - Password: test123
   - Role: Super Admin
3. Должен редиректнуть на /dashboard
4. Должен показать SuperAdminDashboard с табами
```

### **Сценарий 2: Добавление трека**

```bash
1. В Dashboard → Tracks tab
2. Upload Track:
   - Title: Test Song
   - Artist: Test Artist
   - Genre: Soul
   - Audio URL: https://example.com/test.mp3
3. Нажать "Add Track"
4. Toast: "Track added!"
5. Трек должен появиться в списке
```

### **Сценарий 3: Создание плейлиста**

```bash
1. Добавить 3+ треков (см. Сценарий 2)
2. Playlists tab → Create Playlist
3. Заполнить:
   - Name: Test Playlist
   - Description: Test
   - Genre: Mixed
4. Выбрать 2 трека (checkbox)
5. Нажать "Create Playlist"
6. Toast: "Playlist created!"
7. Плейлист должен появиться в grid
```

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

### **1. Upload треков:**
- ❌ Прямой upload файлов НЕ реализован в UI
- ✅ Нужно загружать MP3 в Supabase Storage отдельно
- ✅ Затем вставлять URL в форму

### **2. Supabase Storage Setup (для upload треков):**

```bash
1. Supabase Dashboard → Storage
2. Create New Bucket:
   - Name: soul-fm-tracks
   - Public: ✅ Yes
3. Upload MP3 файлы
4. Получить Public URL
5. Использовать в Dashboard
```

### **3. Роли в Navigation:**

```typescript
// В Navigation показывается dropdown с:
- Dashboard (если залогинен)
- Admin Panel (если роль admin/dj/curator)
- Sign Out
```

### **4. Protected Routes:**

```typescript
/dashboard       // Требует авторизацию
/admin/*         // Требует авторизацию (любую роль)
```

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ (TODO)

### **Для production:**

1. **Добавить direct file upload:**
   ```typescript
   // Вместо URL input - file input с загрузкой в Supabase Storage
   <input type="file" accept="audio/mp3" />
   ```

2. **Настроить Supabase Storage bucket:**
   ```bash
   - Create bucket: "soul-fm-tracks"
   - Set to public
   - Configure CORS
   ```

3. **Добавить audio preview:**
   ```typescript
   // Перед сохранением трека - послушать preview
   <audio src={audioUrl} controls />
   ```

4. **Улучшить playlist management:**
   ```typescript
   - Drag & drop для сортировки треков
   - Play preview всего плейлиста
   - Export/Import плейлистов
   ```

5. **Добавить Schedule Management:**
   ```typescript
   - Календарь для планирования эфира
   - Автоматическое переключение плейлистов по времени
   - Integration с Auto DJ
   ```

---

## ✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ

Вся система ролей, авторизации и dashboards полностью функциональна:

✅ Регистрация с выбором роли
✅ Авторизация
✅ Роутинг по ролям
✅ Super Admin Dashboard с управлением треками
✅ Super Admin Dashboard с управлением плейлистами
✅ Listener Dashboard с историей
✅ Protected routes
✅ Navigation с user dropdown

**Можно деплоить и использовать! 🚀**
