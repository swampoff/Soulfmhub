# 🔴 LIVE TESTING SESSION - FOLLOW ALONG!

**Status:** 🟢 READY TO START  
**Time Estimate:** 10-15 minutes  
**Date:** 2026-02-07

---

## 🎯 WHAT WE'RE TESTING

1. **News Injection System** - TTS voice-overs + smart scheduling
2. **Content Announcements** - Weather, Time, Station IDs
3. **Full Integration** - All systems working together

---

## 📋 SESSION CHECKLIST

### ✅ **CHECKPOINT 1: SQL SETUP** (2 min)

**Action Required:**
```
1. Open Supabase Dashboard
2. SQL Editor → New Query
3. Copy content from /QUICK_SETUP.sql
4. Click RUN
5. Wait for success message
```

**Expected Output:**
```
✅✅✅ SETUP COMPLETE! ✅✅✅

📰 News Injection Tables: CREATED
🌤️  Content Announcements Table: CREATED
🔒 RLS Policies: ENABLED
📊 Indexes: CREATED

🚀 Ready for testing!
```

**Verification:**
```sql
-- Run this to verify:
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%06086aa3' 
ORDER BY table_name;
```

**Expected 4 tables:**
- ✅ content_announcements_06086aa3
- ✅ news_injection_rules_06086aa3
- ✅ news_queue_06086aa3
- ✅ news_voice_overs_06086aa3

**Status:** [ ] COMPLETE

---

### ✅ **CHECKPOINT 2: AUTOMATED TESTS** (3 min)

**Action Required:**
```
1. Open: http://localhost:5173/admin/system-test
2. Click "Run All Tests" button
3. Watch progress (30 seconds)
4. Check results
```

**Real-time Progress:**
```
[Running] Test 1: Seed Test News Data...
[Running] Test 2: Generate Weather Announcement...
[Running] Test 3: Generate Time Announcement...
[Running] Test 4: Generate Station ID...
[Running] Test 5: Schedule News Injections...
```

**Expected Results:**

| Test | Status | Message |
|------|--------|---------|
| 1. Seed Data | ✅ SUCCESS | Created 5 news articles and 3 voices |
| 2. Weather | ✅ SUCCESS | Weather announcement generated with TTS |
| 3. Time | ✅ SUCCESS | Time announcement generated with TTS |
| 4. Station ID | ✅ SUCCESS | Station ID generated with TTS |
| 5. Schedule | ✅ SUCCESS | Scheduled X news injections |

**Final Toast:**
```
✅ All 5 tests passed! 🎉
```

**If test fails:**
- Check browser console (F12)
- Без ELEVENLABS_API_KEY - text scripts создаются, audio нет
- Это нормально для тестирования

**Test Results:**
- [ ] Test 1: ✅ / ❌
- [ ] Test 2: ✅ / ❌
- [ ] Test 3: ✅ / ❌
- [ ] Test 4: ✅ / ❌
- [ ] Test 5: ✅ / ❌

**Status:** [ ] 5/5 PASSED

---

### ✅ **CHECKPOINT 3: NEWS INJECTION UI** (7 min)

**Action Required:**
```
Open: http://localhost:5173/admin/news-injection
```

---

#### **3A: Voice-Overs Tab** (3 min)

**Current Stats:**
```
Total Voice-Overs: _____ (write actual number)
Active: _____
Total Plays: _____
```

**Test: Generate Voice-Over**
```
1. Click "Generate Voice-Over" button
2. Select News: "Miami Beach Announces New Music Festival"
3. Select Voice: "Professional News Anchor"
4. Click "Generate"
5. Wait 5-10 seconds
```

**Expected:**
- [ ] Progress indicator shows "Generating..."
- [ ] Toast: "Voice-over generated successfully!"
- [ ] New item appears in list
- [ ] Item shows:
  - [ ] Title: "Miami Beach Announces New Music Festival"
  - [ ] Voice: "Professional News Anchor"
  - [ ] Duration: ~XX seconds
  - [ ] Play count: 0
  - [ ] Badge: "Active" (green)

**Test: Audio Playback**
```
1. Click Play button (▶️) on voice-over
2. Audio should play
```

**Audio Test Result:**
- [ ] ✅ Audio plays (with ELEVENLABS_API_KEY)
- [ ] ⚠️ No audio (without API key - OK!)

**Status:** [ ] COMPLETE

---

#### **3B: Injection Rules Tab** (2 min)

**Current Rules:**
```
Total Rules: _____ 
Active Rules: _____
```

**Test: Create New Rule**
```
1. Click "Create Rule" button
2. Fill in form:
   Name: "Live Test Hourly"
   Frequency: "Hourly"
   Days: [Mon] [Tue] [Wed] [Thu] [Fri] (click to select)
   Max News Per Slot: 1
   Priority: "Latest First"
   Active: ✅ (checked)
3. Click "Create" button
```

**Expected:**
- [ ] Toast: "Rule created"
- [ ] New rule appears in list
- [ ] Rule details:
  - [ ] Name: "Live Test Hourly"
  - [ ] Badge: "Active" (green)
  - [ ] Frequency: "Every Hour"
  - [ ] Days: Mon Tue Wed Thu Fri (highlighted)

**Status:** [ ] COMPLETE

---

#### **3C: Run Scheduler** (1 min)

**Action:**
```
1. Find green "Run Scheduler" button (top right)
2. Click it
3. Wait 2-3 seconds
```

**Expected:**
- [ ] Button shows "Scheduling..." with spinner
- [ ] Toast appears: "Scheduled X news injections"
- [ ] X should be > 10

**Actual Result:**
```
Scheduled _____ news injections
```

**Status:** [ ] COMPLETE

---

#### **3D: Queue Tab** (1 min)

**Action:**
```
1. Click "Queue" tab
2. Scroll through list
```

**Expected:**
- [ ] List shows 10+ items
- [ ] Each item shows:
  - [ ] News title
  - [ ] Scheduled time (future)
  - [ ] Badge: "pending" (yellow)

**Sample Queue Item:**
```
📅 2026-02-07 15:00 - Miami Beach Announces New Music Festival
Status: pending
```

**Queue Count:** _____ items

**Status:** [ ] COMPLETE

---

### ✅ **CHECKPOINT 4: API TESTS** (3 min)

**Open Terminal / Command Prompt**

---

#### **4A: Weather API**

**Command:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/weather/current?location=Miami"
```

**Expected Response:**
```json
{
  "success": true,
  "weather": {
    "location": "Miami",
    "temperature": 75,
    "condition": "Partly Cloudy",
    "humidity": 65,
    "windSpeed": 10,
    "feelsLike": 73
  }
}
```

**Actual Response:** 
```
(paste here)
```

**Status:** [ ] ✅ SUCCESS / [ ] ❌ FAIL

---

#### **4B: Time API**

**Command:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/time/current"
```

**Expected Response:**
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

**Actual Response:**
```
(paste here)
```

**Status:** [ ] ✅ SUCCESS / [ ] ❌ FAIL

---

#### **4C: News Stats API**

**Command:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/news-injection/stats"
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "totalVoiceOvers": 5,
    "activeRules": 2,
    "pendingQueue": 24,
    "mostPlayed": [...]
  }
}
```

**Actual Numbers:**
```
Total Voice-Overs: _____
Active Rules: _____
Pending Queue: _____
```

**Status:** [ ] ✅ SUCCESS / [ ] ❌ FAIL

---

#### **4D: Announcements Stats API**

**Command:**
```bash
curl "http://localhost:5173/functions/v1/make-server-06086aa3/announcements/stats"
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "total": 10,
    "active": 8,
    "byType": {
      "weather": 2,
      "time": 2,
      "station_id": 3,
      ...
    }
  }
}
```

**Actual Numbers:**
```
Total Announcements: _____
Active: _____
Weather: _____
Time: _____
Station IDs: _____
```

**Status:** [ ] ✅ SUCCESS / [ ] ❌ FAIL

---

### ✅ **CHECKPOINT 5: DATABASE VERIFICATION** (2 min)

**Open Supabase Dashboard → Table Editor**

---

#### **5A: news_voice_overs_06086aa3**

**Check:**
```sql
SELECT COUNT(*) FROM news_voice_overs_06086aa3;
```

**Expected:** > 0 rows

**Spot Check Random Row:**
- [ ] news_title is filled
- [ ] news_content is filled
- [ ] audio_url is filled (or null без API key)
- [ ] voice_name is filled
- [ ] is_active = true
- [ ] play_count = 0

**Row Count:** _____ rows

**Status:** [ ] ✅ GOOD

---

#### **5B: news_injection_rules_06086aa3**

**Check:**
```sql
SELECT COUNT(*) FROM news_injection_rules_06086aa3 WHERE is_active = true;
```

**Expected:** > 0 rows

**Spot Check:**
- [ ] name is filled
- [ ] frequency is set
- [ ] is_active = true

**Active Rules:** _____ rows

**Status:** [ ] ✅ GOOD

---

#### **5C: news_queue_06086aa3**

**Check:**
```sql
SELECT COUNT(*) FROM news_queue_06086aa3 WHERE status = 'pending';
```

**Expected:** > 10 rows

**Spot Check:**
- [ ] scheduled_time is in future
- [ ] status = 'pending'
- [ ] news_voice_over_id is valid UUID

**Pending Queue:** _____ rows

**Status:** [ ] ✅ GOOD

---

#### **5D: content_announcements_06086aa3**

**Check:**
```sql
SELECT type, COUNT(*) 
FROM content_announcements_06086aa3 
GROUP BY type;
```

**Expected:**
```
weather     | 1+
time        | 1+
station_id  | 1+
```

**Actual Counts:**
```
weather: _____
time: _____
station_id: _____
traffic: _____
promo: _____
```

**Status:** [ ] ✅ GOOD

---

## 🎉 FINAL RESULTS

### **Overall Status:**

- [ ] ✅ Checkpoint 1: SQL Setup
- [ ] ✅ Checkpoint 2: Automated Tests (5/5)
- [ ] ✅ Checkpoint 3: News Injection UI
- [ ] ✅ Checkpoint 4: API Tests
- [ ] ✅ Checkpoint 5: Database Verification

---

### **System Health:**

| Component | Status | Notes |
|-----------|--------|-------|
| Database Tables | ✅ / ❌ | 4 tables created |
| News Voice-Overs | ✅ / ❌ | ___ items |
| Injection Rules | ✅ / ❌ | ___ active |
| News Queue | ✅ / ❌ | ___ pending |
| Announcements | ✅ / ❌ | ___ total |
| Weather API | ✅ / ❌ | Working |
| Time API | ✅ / ❌ | Working |
| TTS Generation | ✅ / ❌ / ⚠️ | With/without API key |
| Audio Playback | ✅ / ❌ / ⚠️ | With/without API key |

---

### **Performance:**

```
Test Suite Duration: _____ seconds
Voice-Over Generation: _____ seconds
Scheduler Execution: _____ seconds
API Response Time: _____ ms
```

---

### **Issues Found:**

```
(Write any issues or errors here)

Example:
- TTS generation failed: No ELEVENLABS_API_KEY (expected)
- Queue was empty: Forgot to activate rule (fixed)
```

---

## 🚀 NEXT ACTIONS

### **If ALL PASSED ✅:**
```
1. System is production ready!
2. Activate rules for live stream
3. Generate more voice-overs
4. Customize schedules
5. Monitor first 24h
```

### **If SOME FAILED ❌:**
```
1. Check error messages
2. Review console logs
3. Verify SQL setup
4. Re-run specific tests
5. Report issues
```

---

## 📝 SESSION NOTES

**Start Time:** _____________  
**End Time:** _____________  
**Duration:** _____________  

**Tester Name:** _____________  

**Overall Experience:** 
- [ ] 😊 Excellent - Everything worked!
- [ ] 🙂 Good - Minor issues
- [ ] 😐 OK - Some problems
- [ ] 😞 Poor - Many issues

**Comments:**
```
(Write your feedback here)
```

---

## 🎊 CONGRATULATIONS!

**If you completed all checkpoints, you now have:**
- ✅ Fully functional News Injection System
- ✅ Content Announcements (Weather, Time, Station IDs)
- ✅ Smart Scheduling Engine
- ✅ Queue Management
- ✅ TTS Integration
- ✅ Stats Dashboard
- ✅ Production-ready API

**This is ENTERPRISE-LEVEL radio automation! 🔥**

---

**Testing Session Complete!** ✅
