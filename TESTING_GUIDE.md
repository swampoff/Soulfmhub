# 🧪 SOUL FM - COMPLETE TESTING GUIDE

**Дата:** 2026-02-07  
**Системы:** News Injection + Weather/Traffic/Time Announcements

---

## 🚀 ЧТО СОЗДАНО

### **1. NEWS INJECTION SYSTEM** 📰
- Автоматическая озвучка новостей через ElevenLabs TTS
- Smart scheduling (hourly, every 2h, every 3h, custom times)
- Queue management для воспроизведения
- Интеграция с Auto-DJ

### **2. CONTENT ANNOUNCEMENTS SYSTEM** 🌤️⏰📻
- **Weather Updates** - Real-time погода через OpenWeatherMap API
- **Time Announcements** - "It's 3 PM on Soul FM"
- **Station IDs** - Брендированные объявления
- **Traffic Reports** - Дорожная обстановка (mock data)
- **Promotional Spots** - Реклама событий

---

## 📋 ПОШАГОВОЕ ТЕСТИРОВАНИЕ

### **ШАГ 1: SQL МИГРАЦИИ** (2 минуты)

Выполни в Supabase SQL Editor:

```sql
-- 1. News Injection Tables
-- File: /supabase/migrations/02_news_injection.sql
-- Создаст: news_voice_overs_06086aa3, news_injection_rules_06086aa3, news_queue_06086aa3
```

```sql
-- 2. Content Announcements Table
-- File: /supabase/migrations/03_content_announcements.sql
-- Создаст: content_announcements_06086aa3
```

**Как выполнить:**
1. Открой Supabase Dashboard → SQL Editor
2. Скопируй содержимое `02_news_injection.sql`
3. Execute
4. Повтори для `03_content_announcements.sql`

✅ **Проверка:**
```sql
SELECT * FROM news_voice_overs_06086aa3 LIMIT 1;
SELECT * FROM content_announcements_06086aa3 LIMIT 1;
```

---

### **ШАГ 2: ENVIRONMENT VARIABLES** (опционально)

Для полного функционала добавь API keys:

```bash
# Required для TTS генерации
ELEVENLABS_API_KEY=your_key_here

# Optional для real weather data
OPENWEATHER_API_KEY=your_key_here
```

⚠️ **Без API keys:**
- Система будет работать
- TTS не будет генерироваться (только text scripts)
- Weather будет использовать mock data

---

### **ШАГ 3: AUTOMATED TESTING** (5 минут)

Открой тестовую страницу:

```
http://localhost:5173/admin/system-test
```

Нажми **"Run All Tests"**

**Что протестируется:**

1️⃣ **Seed Test Data**
   - Создаст 5 sample news articles
   - Создаст 3 ElevenLabs voices
   - Создаст 2 sample injection rules
   - ✅ Ожидается: "Created 5 news articles and 3 voices"

2️⃣ **Generate Weather Announcement**
   - Получит погоду для Miami
   - Сгенерирует TTS script
   - Сохранит в базу
   - ✅ Ожидается: "Weather announcement generated with TTS"

3️⃣ **Generate Time Announcement**
   - Создаст time script с текущим временем
   - Сгенерирует TTS
   - ✅ Ожидается: "Time announcement generated with TTS"

4️⃣ **Generate Station ID**
   - Случайный Station ID script
   - TTS генерация
   - ✅ Ожидается: "Station ID generated with TTS"

5️⃣ **Schedule News Injections**
   - Запустит scheduler для активных rules
   - Поставит новости в queue на 24h
   - ✅ Ожидается: "Scheduled X news injections"

**Успех = 5/5 tests passed! 🎉**

---

### **ШАГ 4: NEWS INJECTION UI** (10 минут)

Открой:
```
http://localhost:5173/admin/news-injection
```

#### **4.1 Voice-Overs Tab**

**Проверь:**
- ✅ Список news voice-overs (должно быть 0 изначально)
- ✅ Stats: Total / Active / Total Plays

**Тест генерации:**
1. Нажми **"Generate Voice-Over"**
2. Выбери:
   - News Article: любая из 5 sample news
   - Voice: "Professional News Anchor"
3. Нажми **"Generate"**
4. ⏳ Подожди 5-10 секунд (ElevenLabs генерация)
5. ✅ Voice-over появится в списке
6. 🎵 Нажми **Play** чтобы прослушать

**Проверь preview:**
- Текст новости
- Голос
- Duration
- Play count = 0

**Активация:**
- Нажми toggle чтобы активировать/деактивировать
- Только активные будут использоваться в эфире

---

#### **4.2 Injection Rules Tab**

**Проверь:**
- ✅ Список rules (должно быть 2 sample rules, disabled)

**Создай новое правило:**
1. Нажми **"Create Rule"**
2. Заполни:
   ```
   Name: Hourly News Test
   Frequency: Hourly
   Days: [Mon] [Tue] [Wed] [Thu] [Fri]
   Max News Per Slot: 1
   Priority: Latest First
   Active: ✅
   ```
3. Сохрани

**Custom Times пример:**
1. Создай новое rule
2. Frequency: Custom
3. Add Time: 08:00, 12:00, 18:00, 22:00
4. Days: All
5. Активируй

**Проверь:**
- ✅ Rule появился в списке
- ✅ Badge "Active" зеленый
- ✅ Дни недели подсвечены

---

#### **4.3 Queue Tab**

**Run Scheduler:**
1. Вернись на главную страницу (любой tab)
2. Нажми **"Run Scheduler"** (зеленая кнопка справа)
3. ✅ Увидишь: "Scheduled X news injections"

**Открой Queue tab:**
- ✅ Список scheduled injections на 24h
- ✅ Каждый item показывает:
  - News title
  - Scheduled time
  - Status (pending)

**Пример:**
```
📅 2026-02-07 12:00 PM - Breaking: Miami Music Festival
📅 2026-02-07 13:00 PM - Local Artist Wins Grammy
📅 2026-02-07 14:00 PM - New Streaming Technology
```

---

### **ШАГ 5: CONTENT ANNOUNCEMENTS** (5 минут)

#### **5.1 Weather Announcements**

**API Test:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/weather/current?location=Miami"
```

**Ожидается:**
```json
{
  "success": true,
  "weather": {
    "location": "Miami",
    "temperature": 75,
    "condition": "Partly Cloudy",
    "humidity": 65,
    "windSpeed": 10
  }
}
```

**Generate Weather Voice:**
```bash
curl -X POST "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/weather/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Miami",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "voiceName": "Professional Voice"
  }'
```

✅ Создаст weather announcement с TTS audio

---

#### **5.2 Time Announcements**

**Current Time:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/time/current"
```

**Ожидается:**
```json
{
  "success": true,
  "time": {
    "hour": 3,
    "minute": 30,
    "period": "PM",
    "dayOfWeek": "Saturday",
    "message": "It's 3:30 PM on this Saturday..."
  }
}
```

---

#### **5.3 Station IDs**

**Generate Station ID:**
```bash
curl -X POST "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/station-id/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "voiceName": "Professional Voice"
  }'
```

✅ Создаст случайный Station ID с TTS

---

#### **5.4 Batch Generation**

**Создай все announcements сразу:**
```bash
curl -X POST "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/batch-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "types": ["weather", "time", "station_id"],
    "location": "Miami",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "voiceName": "Professional Voice"
  }'
```

✅ Создаст 3 announcements за один раз!

---

### **ШАГ 6: STATS & MONITORING** (2 минуты)

#### **News Injection Stats:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/news-injection/stats"
```

**Ожидается:**
```json
{
  "success": true,
  "stats": {
    "totalVoiceOvers": 5,
    "activeRules": 2,
    "pendingQueue": 24,
    "mostPlayed": [
      { "news_title": "Miami Music Festival", "play_count": 42 }
    ]
  }
}
```

#### **Announcements Stats:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/stats"
```

**Ожидается:**
```json
{
  "success": true,
  "stats": {
    "total": 10,
    "active": 8,
    "byType": {
      "weather": 2,
      "time": 2,
      "traffic": 1,
      "station_id": 3,
      "promo": 2
    }
  }
}
```

---

## 🎯 INTEGRATION WITH AUTO-DJ

### **Как новости попадают в эфир:**

```typescript
// Auto-DJ проверяет каждую минуту:

const nextNews = await getNextNewsToPlay();

if (nextNews && isTimeToPlay(nextNews.scheduledTime)) {
  // 1. Stop current track fade out
  fadeOut(currentTrack);
  
  // 2. Play intro jingle (optional)
  if (rule.introJingleId) {
    await playJingle(rule.introJingleId);
  }
  
  // 3. Play news voice-over
  await playNewsAudio(nextNews.audioUrl);
  
  // 4. Play outro jingle (optional)
  if (rule.outroJingleId) {
    await playJingle(rule.outroJingleId);
  }
  
  // 5. Mark as played
  await markNewsAsPlayed(nextNews.id);
  
  // 6. Resume music
  fadeIn(nextTrack);
}
```

### **Announcements Integration:**

```typescript
// Каждые 2 часа:
const announcement = await getNextAnnouncement('station_id');
playBetweenTracks(announcement);

// Каждый час:
const weather = await getNextAnnouncement('weather');
const time = await getNextAnnouncement('time');
playBetweenTracks([weather, time]);
```

---

## 🔥 РЕАЛЬНЫЕ USE CASES

### **1. 24/7 News Radio**
```yaml
Rules:
  - Hourly News (All Days)
  - Weather Every 2 Hours
  - Time Announcements Every Hour
  - Station IDs Every 3 Hours
```

### **2. Morning Show Format**
```yaml
Rules:
  - Morning News: 07:00, 08:00, 09:00
  - Weather: 07:30, 08:30
  - Traffic: 08:15, 08:45
  - Station IDs: Throughout
```

### **3. Weekend Light Programming**
```yaml
Rules:
  - News Every 3 Hours (Sat-Sun)
  - Weather Every 4 Hours
  - Station IDs Every 2 Hours
```

---

## 📊 EXPECTED RESULTS

### ✅ **Успешный тест показывает:**

1. **News Voice-Overs:**
   - 5 sample news articles created
   - TTS audio generated and stored
   - Audio playback works
   - Stats tracking accurate

2. **Injection Rules:**
   - Rules created and activated
   - Schedule calculation correct
   - Queue populated for 24h

3. **Announcements:**
   - Weather data fetched
   - Time announcements accurate
   - Station IDs varied
   - TTS generation successful

4. **Stats Dashboard:**
   - Accurate counters
   - Real-time updates
   - Most played tracking

---

## 🐛 TROUBLESHOOTING

### **Problem: TTS не генерируется**

**Проверь:**
```bash
# 1. ELEVENLABS_API_KEY установлен?
echo $ELEVENLABS_API_KEY

# 2. В Figma Make Environment Variables?
# Settings → Environment Variables → ELEVENLABS_API_KEY
```

**Решение:**
- Без API key система работает, но без audio
- Text scripts всё равно создаются
- Можно протестировать логику без TTS

---

### **Problem: Weather показывает mock data**

**Проверь:**
```bash
echo $OPENWEATHER_API_KEY
```

**Решение:**
- Это нормально для тестирования
- Добавь API key для real data
- Mock data достаточно для демо

---

### **Problem: Queue пустой**

**Проверь:**
1. Создано ли хотя бы одно active правило?
2. Создан ли хотя бы один active voice-over?
3. Запущен ли scheduler? (кнопка "Run Scheduler")

**Решение:**
```bash
# Проверь active rules
SELECT * FROM news_injection_rules_06086aa3 WHERE is_active = true;

# Проверь active voice-overs
SELECT * FROM news_voice_overs_06086aa3 WHERE is_active = true;
```

---

### **Problem: Supabase errors**

**Проверь:**
```bash
# Storage buckets созданы?
SELECT * FROM storage.buckets WHERE name LIKE 'make-06086aa3%';
```

**Должны быть:**
- `make-06086aa3-news-voiceovers`
- `make-06086aa3-announcements`

**Создать вручную:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('make-06086aa3-news-voiceovers', 'make-06086aa3-news-voiceovers', false),
  ('make-06086aa3-announcements', 'make-06086aa3-announcements', false);
```

---

## 🎬 DEMO SCENARIO

### **Полный цикл тестирования (15 минут):**

```
00:00 - Выполнить SQL migrations
01:00 - Открыть /admin/system-test
02:00 - Run All Tests → 5/5 passed ✅
03:00 - Открыть /admin/news-injection
04:00 - Generate 3 voice-overs
07:00 - Create 2 injection rules (hourly, custom)
08:00 - Activate rules
09:00 - Run Scheduler
10:00 - Check Queue → 24+ items ✅
11:00 - Test batch announcements (API)
13:00 - Check stats dashboard
14:00 - Preview audio playback
15:00 - ✅ ALL SYSTEMS OPERATIONAL!
```

---

## 🚀 PRODUCTION DEPLOYMENT

### **Pre-Deploy Checklist:**

- [ ] SQL migrations executed
- [ ] ELEVENLABS_API_KEY configured
- [ ] OPENWEATHER_API_KEY configured (optional)
- [ ] Storage buckets created
- [ ] Sample data seeded
- [ ] Test suite passed (5/5)
- [ ] Audio playback verified
- [ ] Queue scheduling verified
- [ ] Stats dashboard accurate

### **Post-Deploy:**

1. Monitor first 24h
2. Check queue execution
3. Verify audio quality
4. Monitor API usage (ElevenLabs quotas)
5. Adjust rules based on feedback

---

## 📚 DOCUMENTATION

**Полные гайды:**
- `/NEWS_INJECTION_COMPLETE.md` - News Injection system
- `/TESTING_GUIDE.md` - This file
- `/ENV_SETUP_GUIDE.md` - Environment variables

**API Endpoints:**
- News Injection: `/news-injection/*`
- Announcements: `/announcements/*`

---

## 🎉 SUCCESS CRITERIA

✅ **Система готова к production когда:**

1. All SQL tables created
2. Sample data loaded successfully
3. TTS generation working
4. Voice-overs playable
5. Rules scheduling correctly
6. Queue populated for 24h
7. Announcements generating
8. Stats dashboard accurate
9. API endpoints responding
10. Test suite passing 5/5

---

**Happy Testing! 🧪🚀**

**Questions? Check the documentation or console logs for detailed error messages.**
