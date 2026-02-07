# 🚀 START TESTING NOW - QUICK GUIDE

**Ready to test in 5 minutes!** 🔥

---

## ⚡ SUPER QUICK START

### **STEP 1: Database Setup** (2 minutes)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy **ALL** content from `/QUICK_SETUP.sql`
5. Click **RUN** (or press Ctrl+Enter)
6. Wait for success message: **"✅✅✅ SETUP COMPLETE!"**

✅ **Done!** Tables created.

---

### **STEP 2: Run Automated Tests** (3 minutes)

1. Open browser: `http://localhost:5173/admin/system-test`
2. Click big green button: **"Run All Tests"**
3. Watch the magic happen ✨
4. Wait ~30 seconds
5. Check results: **5/5 tests passed** ✅

**What it tests:**
- ✅ Creates 5 sample news articles
- ✅ Creates 3 ElevenLabs voices
- ✅ Generates weather announcement
- ✅ Generates time announcement
- ✅ Generates station ID
- ✅ Schedules news injections

---

### **STEP 3: Explore News Injection** (5 minutes)

Open: `http://localhost:5173/admin/news-injection`

**Try this:**

1. **Tab: Voice-Overs**
   - Click "Generate Voice-Over"
   - Select any news article
   - Select "Professional News Anchor"
   - Click "Generate"
   - Wait 5-10 seconds
   - ✅ New voice-over appears!
   - 🎵 Click Play to listen (if you have ELEVENLABS_API_KEY)

2. **Tab: Injection Rules**
   - Click "Create Rule"
   - Fill in:
     - Name: "Hourly Test"
     - Frequency: "Hourly"
     - Days: Mon-Fri
     - Active: ✅
   - Click "Create"
   - ✅ Rule created!

3. **Run Scheduler**
   - Click green "Run Scheduler" button (top right)
   - Toast: "Scheduled X news injections" ✅

4. **Tab: Queue**
   - See list of scheduled news
   - Should have 10+ items
   - ✅ Queue populated!

---

### **STEP 4: Quick API Test** (2 minutes)

**Test Weather API:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/weather/current?location=Miami"
```

**Expected:**
```json
{
  "success": true,
  "weather": {
    "location": "Miami",
    "temperature": 75,
    "condition": "Partly Cloudy"
  }
}
```

**Test Time API:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/time/current"
```

**Expected:**
```json
{
  "success": true,
  "time": {
    "hour": 3,
    "period": "PM",
    "message": "It's 3 PM on Soul FM..."
  }
}
```

---

## ✅ SUCCESS CHECKLIST

After 5 minutes, you should have:

- [x] ✅ 4 database tables created
- [ ] ✅ 5/5 automated tests passed
- [ ] ✅ Sample news articles loaded
- [ ] ✅ Voice-over generated
- [ ] ✅ Injection rule created
- [ ] ✅ News queue populated
- [ ] ✅ Weather API working
- [ ] ✅ Time API working

---

## 🎯 WHAT EACH SYSTEM DOES

### **News Injection System** 📰
```
Purpose: Automatically insert news into radio stream
How: TTS voice-overs + smart scheduling
Example: News plays every hour at :00
```

### **Weather Announcements** 🌤️
```
Purpose: Real-time weather updates
How: Fetch weather → generate script → TTS
Example: "It's 75 degrees and sunny in Miami"
```

### **Time Announcements** ⏰
```
Purpose: Time checks for listeners
How: Current time → generate script → TTS
Example: "It's 3 PM on Soul FM"
```

### **Station IDs** 📻
```
Purpose: Brand the station
How: Random station ID → TTS
Example: "This is Soul FM, your home for soul music"
```

---

## 🔥 WHAT'S HAPPENING BEHIND THE SCENES

When you click "Run All Tests":

```
1. 📝 Seed Data
   → Creates 5 news articles in KV store
   → Creates 3 voices in database
   → Creates 2 sample injection rules

2. 🌤️ Weather Test
   → Fetches Miami weather
   → Generates natural script
   → Creates TTS audio (if API key)
   → Saves to database

3. ⏰ Time Test
   → Gets current time
   → Generates time announcement
   → Creates TTS audio
   → Saves to database

4. 📻 Station ID Test
   → Random station ID script
   → TTS generation
   → Database save

5. 📅 Scheduling Test
   → Reads active injection rules
   → Calculates next 24h times
   → Selects news for each slot
   → Populates queue
```

---

## 🎮 INTERACTIVE TESTING

### **Want to test manually?**

**Generate a weather announcement:**
```bash
curl -X POST "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/weather/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Miami",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "voiceName": "Professional Voice"
  }'
```

**Generate all at once:**
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

---

## 🐛 COMMON ISSUES

### ❌ "Table already exists"
**Solution:** That's fine! Tables are created. Continue testing.

### ❌ "No audio playback"
**Reason:** No ELEVENLABS_API_KEY
**Solution:** Add API key OR continue testing (scripts still work)

### ❌ "Tests fail"
**Check:**
1. Is backend running? (localhost:5173)
2. Did you run SQL setup?
3. Check browser console (F12)

### ❌ "Queue is empty"
**Check:**
1. Did you create an ACTIVE rule?
2. Did you create an ACTIVE voice-over?
3. Did you click "Run Scheduler"?

---

## 📊 EXPECTED RESULTS

### After Testing:

**Database:**
- news_voice_overs_06086aa3: 1-5 rows
- news_injection_rules_06086aa3: 2-3 rows
- news_queue_06086aa3: 10-50 rows
- content_announcements_06086aa3: 3-10 rows

**UI:**
- Voice-Overs tab: Shows generated voice-overs
- Rules tab: Shows active rules
- Queue tab: Shows upcoming injections
- Stats: Accurate counts

**API:**
- Weather endpoint: Returns weather data
- Time endpoint: Returns current time
- Stats endpoint: Returns accurate stats

---

## 🎉 YOU'RE DONE!

**If all tests pass, you have:**
- ✅ Full News Injection System
- ✅ Content Announcements System
- ✅ Smart Scheduling Engine
- ✅ TTS Integration
- ✅ Queue Management
- ✅ Stats Dashboard

**Next steps:**
1. Activate rules for production
2. Generate more voice-overs
3. Customize schedules
4. Monitor in real-time

---

## 📞 NEED HELP?

**Check these files:**
- `/TEST_CHECKLIST.md` - Detailed checklist
- `/TESTING_GUIDE.md` - Full testing guide
- `/NEWS_INJECTION_COMPLETE.md` - System documentation

**Check logs:**
- Browser Console (F12)
- Supabase Logs
- Edge Function Logs

---

## 🚀 READY?

**Let's go!**

1. Run SQL setup ✅
2. Run automated tests ✅
3. Explore UI ✅
4. Test APIs ✅
5. Celebrate! 🎉

**Testing time: ~10 minutes total**

---

**GO GO GO! 🔥**
