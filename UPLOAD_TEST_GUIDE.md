# 🧪 Upload Components Test Guide

**Статус:** ✅ Ready to test!  
**URL:** `/admin/upload-test`

---

## 🎯 Быстрый старт

### 1️⃣ Открой Admin Panel
```
http://localhost:5173/admin
```

### 2️⃣ Войди в Upload Test Lab
- Нажми кнопку **"🧪 Upload Test Lab"** в Quick Actions
- Или открой прямо: `http://localhost:5173/admin/upload-test`

---

## 📸 Тест Image Upload

### Что тестируем:
- ✅ Click to upload
- ✅ Drag & drop
- ✅ Preview изображения
- ✅ Change/Remove функции
- ✅ File validation (5MB max)
- ✅ Public URL generation
- ✅ Aspect ratio support (1:1, 16:9)

### Как тестировать:

#### Тест 1: Basic Upload (1:1)
1. **Click** на "Upload Test Image" область
2. Выбери JPG/PNG изображение (до 5MB)
3. ✅ Preview должен появиться
4. ✅ URL должен отобразиться внизу
5. Нажми **Copy** - URL скопируется
6. Нажми **Open** - изображение откроется в новой вкладке

#### Тест 2: Drag & Drop
1. Открой папку с изображениями
2. **Перетащи** картинку на upload область
3. ✅ Preview должен обновиться

#### Тест 3: Change Image
1. Hover над preview
2. Нажми **"Change"**
3. Выбери другое изображение
4. ✅ Preview обновится

#### Тест 4: Remove Image
1. Hover над preview
2. Нажми **"Remove"**
3. ✅ Preview очистится

#### Тест 5: File Validation
1. Попробуй загрузить файл > 5MB
2. ✅ Должна появиться ошибка: "File size must be less than 5MB"
3. Попробуй загрузить не-изображение (PDF, DOCX)
4. ✅ Должна появиться ошибка: "Please select an image file"

#### Тест 6: Different Aspect Ratio (16:9)
1. Scroll вниз к "Test 2: Cover Upload"
2. Загрузи широкое изображение
3. ✅ Preview будет 16:9 формата

---

## 🎵 Тест Audio Upload

### Что тестируем:
- ✅ Click to upload
- ✅ Drag & drop audio files
- ✅ Audio player preview
- ✅ Upload progress bar
- ✅ Metadata extraction
- ✅ File validation (50MB max)
- ✅ Signed URL generation

### Как тестировать:

#### Тест 1: Basic Audio Upload
1. **Click** на "Upload Test Audio" область
2. Выбери MP3/WAV файл (до 50MB)
3. ✅ Progress bar появится
4. ✅ После загрузки - audio player
5. ✅ Metadata отобразится (title, artist, duration)

#### Тест 2: Audio Playback
1. После загрузки найди audio player
2. Нажми **Play**
3. ✅ Аудио должно воспроизводиться

#### Тест 3: Metadata Extraction
1. Загрузи MP3 с ID3 тегами (title, artist, album)
2. ✅ В "Extracted Metadata" должны появиться:
   - Title
   - Artist
   - Duration
   - Bitrate

#### Тест 4: Drag & Drop Audio
1. Открой папку с MP3
2. **Перетащи** файл на upload область
3. ✅ Progress bar и upload должны запуститься

#### Тест 5: File Validation
1. Попробуй загрузить аудио > 50MB
2. ✅ Ошибка: "File size must be less than 50MB"
3. Попробуй загрузить не-аудио файл
4. ✅ Ошибка: "File must be an audio file"

#### Тест 6: Podcast Episode Upload
1. Scroll к "Test 2: Podcast Episode Upload"
2. Загрузи подкаст эпизод
3. ✅ Duration извлечется автоматически

---

## ✅ Чеклист успешного теста

### Image Upload:
- [ ] Click upload работает
- [ ] Drag & drop работает
- [ ] Preview отображается корректно
- [ ] Change button работает
- [ ] Remove button работает
- [ ] File size validation работает (5MB)
- [ ] URL генерируется и копируется
- [ ] Изображение открывается по URL

### Audio Upload:
- [ ] Click upload работает
- [ ] Drag & drop работает
- [ ] Progress bar отображается
- [ ] Audio player появляется
- [ ] Playback работает
- [ ] Metadata извлекается
- [ ] File size validation работает (50MB)
- [ ] Signed URL генерируется
- [ ] Remove/Re-upload работает

---

## 🔧 Troubleshooting

### Проблема: "No file provided"
**Решение:** Убедись что выбрал файл правильного типа (image или audio)

### Проблема: "Upload failed"
**Решение:** 
1. Проверь консоль браузера (F12)
2. Проверь что backend запущен
3. Проверь Supabase Storage buckets созданы

### Проблема: "Storage upload error"
**Решение:**
1. Проверь что buckets существуют:
   - `make-06086aa3-covers` (public)
   - `make-06086aa3-tracks` (private)
2. Если нет - они создадутся автоматически при старте сервера

### Проблема: Preview не отображается
**Решение:**
1. Проверь размер файла (не больше лимита)
2. Проверь формат файла (только image или audio)
3. Очисти кэш браузера

### Проблема: Metadata не извлекается
**Решение:**
1. Убедись что MP3 имеет ID3 теги
2. Используй файл с правильными метаданными
3. Проверь консоль - metadata extraction может быть optional

---

## 📊 Backend Endpoints

### Image Upload
```bash
POST /make-server-06086aa3/upload/image
Content-Type: multipart/form-data

FormData:
  - file: File (required)
  - bucket: string (optional, default: 'make-06086aa3-covers')

Response:
{
  "success": true,
  "url": "https://...supabase.co/storage/v1/object/public/...",
  "path": "uploads/xxx.jpg",
  "size": 123456,
  "type": "image/jpeg"
}
```

### Audio Upload
```bash
POST /make-server-06086aa3/upload/audio
Content-Type: multipart/form-data

FormData:
  - file: File (required)
  - extractMetadata: boolean (optional)

Response:
{
  "success": true,
  "url": "https://...supabase.co/storage/v1/object/sign/...",
  "path": "episodes/xxx.mp3",
  "size": 12345678,
  "type": "audio/mpeg",
  "metadata": {
    "title": "...",
    "artist": "...",
    "duration": 180.5,
    "bitrate": 128
  },
  "duration": 180.5
}
```

---

## 🎨 Где использовать компоненты

После успешного теста, интегрируй компоненты в:

### ImageUpload:
```tsx
import { ImageUpload } from './components/ImageUpload';

<ImageUpload
  label="Track Cover"
  currentImage={track.coverUrl}
  onUpload={(url) => setTrack({ ...track, coverUrl: url })}
  aspectRatio="1:1"
  maxSizeMB={5}
/>
```

**Используй в:**
- Tracks Management (covers)
- Playlists Management (covers)
- Shows Management (covers)
- Podcasts Management (covers)
- News Management (featured images)
- Profiles (avatars)

### AudioUpload:
```tsx
import { AudioUpload } from './components/AudioUpload';

<AudioUpload
  label="Episode Audio"
  onUpload={(url, metadata) => {
    setEpisode({
      audioUrl: url,
      duration: metadata?.duration,
      title: metadata?.title || episode.title
    });
  }}
  extractMetadata={true}
/>
```

**Используй в:**
- Podcasts Management (episodes)
- Shows Management (recordings)
- Tracks Upload (alternative to current)

---

## ✅ Готово!

После успешного прохождения всех тестов:
1. ✅ Image upload работает
2. ✅ Audio upload работает
3. ✅ Backend endpoints функционируют
4. ✅ Storage integration работает
5. ✅ Можно интегрировать в остальные админ страницы

**Next Steps:**
1. Интегрировать ImageUpload в TracksManagement
2. Интегрировать AudioUpload в ShowsPodcastsManagement
3. Тестировать на production

---

**🎉 Happy testing!**
