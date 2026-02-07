# 🧪 LIVE TESTING CHECKLIST

**Дата:** 2026-02-07  
**Статус:** В процессе тестирования...

---

## ✅ STEP-BY-STEP TESTING PROGRESS

### 📋 **PHASE 1: DATABASE SETUP** (5 min)

- [ ] **1.1** Открыть Supabase Dashboard
- [ ] **1.2** SQL Editor → New Query
- [ ] **1.3** Скопировать `/QUICK_SETUP.sql`
- [ ] **1.4** Execute (RUN)
- [ ] **1.5** Проверить success message: "✅✅✅ SETUP COMPLETE!"

**Проверка:**
```sql
-- Должно вернуть 4 таблицы:
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%06086aa3' 
AND table_schema = 'public';
```

**Ожидается:**
- news_voice_overs_06086aa3
- news_injection_rules_06086aa3
- news_queue_06086aa3
- content_announcements_06086aa3

---

### 🚀 **PHASE 2: AUTOMATED TESTS** (5 min)

- [ ] **2.1** Открыть `http://localhost:5173/admin/system-test`
- [ ] **2.2** Нажать "Run All Tests"
- [ ] **2.3** Подождать ~30 секунд
- [ ] **2.4** Проверить результаты: 5/5 passed ✅

**Тесты:**
- [ ] ✅ Test 1: Seed Test News Data (5 news + 3 voices)
- [ ] ✅ Test 2: Generate Weather Announcement
- [ ] ✅ Test 3: Generate Time Announcement
- [ ] ✅ Test 4: Generate Station ID
- [ ] ✅ Test 5: Schedule News Injections

**Если тест fail:**
- Проверь console (F12) для ошибок
- Проверь что ELEVENLABS_API_KEY установлен (опционально)
- Mock data всё равно будет работать

---

### 📰 **PHASE 3: NEWS INJECTION UI** (10 min)

#### **Tab 1: Voice-Overs**

- [ ] **3.1** Открыть `http://localhost:5173/admin/news-injection`
- [ ] **3.2** Проверить stats:
  - Total Voice-Overs: ___
  - Active: ___
  - Total Plays: ___

- [ ] **3.3** Нажать "Generate Voice-Over"
- [ ] **3.4** Выбрать:
  - [ ] News Article: "Miami Beach Announces New Music Festival"
  - [ ] Voice: "Professional News Anchor"
- [ ] **3.5** Нажать "Generate"
- [ ] **3.6** Подождать 5-10 секунд
- [ ] **3.7** Voice-over появился в списке? ✅
- [ ] **3.8** Нажать Play button (🎵)
- [ ] **3.9** Аудио воспроизводится? ✅ (если есть ELEVENLABS_API_KEY)

**Проверка:**
- Title корректный?
- Duration показан?
- Play count = 0?
- Badge "Active" зеленый?

---

#### **Tab 2: Injection Rules**

- [ ] **3.10** Переключиться на Tab "Injection Rules"
- [ ] **3.11** Проверить existing rules (должно быть 2 sample rules)
- [ ] **3.12** Нажать "Create Rule"
- [ ] **3.13** Заполнить:
  - [ ] Name: "Test Hourly News"
  - [ ] Frequency: "Hourly"
  - [ ] Days: Mon, Tue, Wed, Thu, Fri (выбрать)
  - [ ] Max News Per Slot: 1
  - [ ] Priority: "Latest First"
  - [ ] Active: ✅ Checked
- [ ] **3.14** Нажать "Create"
- [ ] **3.15** Rule появился в списке? ✅
- [ ] **3.16** Badge "Active" зеленый? ✅

---

#### **Tab 3: Queue**

- [ ] **3.17** Вернуться на главную страницу (любой tab)
- [ ] **3.18** Нажать "Run Scheduler" (зеленая кнопка справа)
- [ ] **3.19** Toast message: "Scheduled X news injections" ✅
- [ ] **3.20** Переключиться на Tab "Queue"
- [ ] **3.21** Проверить список scheduled injections
- [ ] **3.22** Минимум 10+ items в queue? ✅

**Queue item содержит:**
- [ ] News title
- [ ] Scheduled time (future time)
- [ ] Status: "pending"

---

### 🌤️ **PHASE 4: CONTENT ANNOUNCEMENTS** (5 min)

#### **Weather Test**

- [ ] **4.1** Открыть новую вкладку Terminal/Console
- [ ] **4.2** Run command:
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/weather/current?location=Miami"
```
- [ ] **4.3** Response содержит weather data? ✅

**Ожидается:**
```json
{
  "success": true,
  "weather": {
    "location": "Miami",
    "temperature": 75,
    ...
  }
}
```

---

#### **Time Test**

- [ ] **4.4** Run command:
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/time/current"
```
- [ ] **4.5** Response содержит current time? ✅

**Ожидается:**
```json
{
  "success": true,
  "time": {
    "hour": 3,
    "period": "PM",
    "message": "It's 3 PM..."
  }
}
```

---

#### **Batch Generation Test**

- [ ] **4.6** Run command (может занять 20-30 сек):
```bash
curl -X POST "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/batch-generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "types": ["weather", "time", "station_id"],
    "location": "Miami",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "voiceName": "Professional Voice"
  }'
```

- [ ] **4.7** Response: 3 announcements created? ✅

---

### 📊 **PHASE 5: STATS & VERIFICATION** (3 min)

#### **News Injection Stats**

- [ ] **5.1** Run command:
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/news-injection/stats"
```

**Проверь:**
- [ ] totalVoiceOvers > 0
- [ ] activeRules > 0
- [ ] pendingQueue > 0

---

#### **Announcements Stats**

- [ ] **5.2** Run command:
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/stats"
```

**Проверь:**
- [ ] total > 0
- [ ] byType.weather > 0
- [ ] byType.time > 0
- [ ] byType.station_id > 0

---

### 🎯 **PHASE 6: DATABASE VERIFICATION** (2 min)

- [ ] **6.1** Открыть Supabase Dashboard → Table Editor
- [ ] **6.2** Проверить таблицы:

**news_voice_overs_06086aa3:**
- [ ] Есть записи? (минимум 1)
- [ ] audio_url заполнен?
- [ ] play_count = 0?

**news_injection_rules_06086aa3:**
- [ ] Есть записи? (минимум 1 active)
- [ ] is_active = true?

**news_queue_06086aa3:**
- [ ] Есть записи? (минимум 10+)
- [ ] status = 'pending'?
- [ ] scheduled_time в будущем?

**content_announcements_06086aa3:**
- [ ] Есть записи? (минимум 3)
- [ ] type = weather, time, station_id?
- [ ] content заполнен?

---

## 🎉 **SUCCESS CRITERIA**

✅ **ВСЁ РАБОТАЕТ ЕСЛИ:**

- [x] SQL tables created (4 tables)
- [ ] Automated tests passed (5/5)
- [ ] Voice-overs generated (минимум 1)
- [ ] Audio playback works (если есть API key)
- [ ] Injection rules created (минимум 1 active)
- [ ] Queue populated (минимум 10+ items)
- [ ] Weather API responding
- [ ] Time API responding
- [ ] Batch generation works
- [ ] Stats accurate
- [ ] Database verified

---

## 🐛 **ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:**

### Problem: Tables not created
```sql
-- Run this to check:
SELECT * FROM information_schema.tables 
WHERE table_name LIKE '%06086aa3';

-- If empty, re-run QUICK_SETUP.sql
```

### Problem: Tests failing
```
1. Check browser console (F12)
2. Check that backend is running
3. Check Supabase connection
4. TTS generation может fail без API key - это OK
```

### Problem: No audio playback
```
- Normal без ELEVENLABS_API_KEY
- Text scripts всё равно создаются
- Queue и scheduling работают
```

### Problem: Queue empty
```
1. Создал ли active rule?
2. Создал ли active voice-over?
3. Запустил ли "Run Scheduler"?
```

---

## 📝 **NOTES / OBSERVATIONS**

**Write here what you found during testing:**

```
[Время] - [Что тестировал] - [Результат]

Example:
14:30 - SQL Setup - ✅ All tables created
14:35 - Automated tests - ✅ 5/5 passed
14:40 - Generate voice-over - ✅ Audio plays
14:45 - Queue scheduling - ✅ 24 items queued
```

---

## 🚀 **NEXT STEPS AFTER TESTING**

После успешного тестирования:

1. [ ] Activate injection rules для production
2. [ ] Настроить custom times (morning show, etc.)
3. [ ] Создать больше voice-overs
4. [ ] Интегрировать в Auto-DJ
5. [ ] Monitor first 24h execution
6. [ ] Adjust rules based on feedback

---

**Testing Start Time:** _____________  
**Testing End Time:** _____________  
**Total Duration:** _____________  
**Final Result:** ⬜ PASS / ⬜ FAIL  

**Notes:**
_______________________________________
_______________________________________
_______________________________________
