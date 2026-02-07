# 🎙️🎁 PODCAST & CONTEST SYSTEM - QUICK TEST GUIDE

## 🚀 **SETUP (5 MINUTES)**

### **Step 1: Run SQL Migration**
```sql
-- In Supabase SQL Editor:
-- Copy & paste entire contents of PODCAST_CONTESTS_SETUP.sql
-- Click "Run"
-- ✅ Tables created, seed data inserted
```

**Expected Result:**
```
✅ podcast_schedule_06086aa3 (2 schedules)
✅ podcast_play_history_06086aa3
✅ contests_06086aa3 (2 active contests)
✅ contest_announcements_queue_06086aa3
✅ contest_entries_06086aa3
```

---

## 🧪 **TESTING PODCASTS**

### **Test 1: View Podcast Schedules**

**API Call:**
```bash
GET /make-server-06086aa3/podcast-schedules
```

**Expected Response:**
```json
{
  "schedules": [
    {
      "id": "...",
      "podcast_id": "podcast_soul_sessions",
      "title": "The Soul Sessions - Episode 1",
      "schedule_type": "weekly",
      "day_of_week": 3,
      "time_of_day": "19:00:00",
      "duration": 2700,
      "is_active": true
    },
    {
      "id": "...",
      "podcast_id": "podcast_jazz_tonight",
      "title": "Jazz Tonight - Smooth Grooves",
      "schedule_type": "weekly",
      "day_of_week": 5,
      "time_of_day": "21:00:00",
      "duration": 3600,
      "is_active": true
    }
  ]
}
```

---

### **Test 2: Create One-Time Podcast**

**API Call:**
```bash
POST /make-server-06086aa3/podcast-schedules
```

**Request Body:**
```json
{
  "podcast_id": "podcast_special",
  "episode_id": "episode_live_001",
  "schedule_type": "one_time",
  "date": "2026-02-08",
  "time_of_day": "14:00:00",
  "title": "Special Live Soul Concert",
  "description": "Exclusive live performance from Miami Soul Festival",
  "duration": 5400,
  "is_active": true
}
```

**Expected Response:**
```json
{
  "schedule": {
    "id": "...",
    "title": "Special Live Soul Concert",
    "schedule_type": "one_time",
    "date": "2026-02-08",
    "time_of_day": "14:00:00",
    "duration": 5400
  }
}
```

---

### **Test 3: Auto-DJ Podcast Check** (Integration Test)

**Scenario:** Wednesday at 18:55

**Auto-DJ Logic:**
```javascript
// At 18:55 on Wednesday
const podcast = await checkForScheduledPodcast();

// Returns:
{
  "scheduleId": "...",
  "podcastId": "podcast_soul_sessions",
  "title": "The Soul Sessions - Episode 1",
  "duration": 2700,
  "scheduledTime": "2026-02-12T19:00:00Z"
}

// Auto-DJ behavior:
// 18:59 - Current track ends
// 19:00 - Auto-DJ detects podcast scheduled
// 19:00 - Fades out music
// 19:00 - 🎙️ Starts podcast
// 19:45 - Podcast ends
// 19:45 - Resumes music playlist
```

---

## 🎁 **TESTING CONTESTS**

### **Test 4: View Active Contests**

**API Call:**
```bash
GET /make-server-06086aa3/contests?status=active
```

**Expected Response:**
```json
{
  "contests": [
    {
      "id": "...",
      "title": "Win Tickets to Miami Soul Festival 2026",
      "description": "Enter to win 2 VIP tickets...",
      "prize": "2 VIP Tickets to Miami Soul Festival (Value: $500)",
      "entry_method": "text",
      "entry_details": {
        "text": "SOUL to 305-555-SOUL",
        "keyword": "SOUL",
        "shortcode": "305-555-SOUL"
      },
      "start_date": "2026-02-07T...",
      "end_date": "2026-02-21T...",
      "status": "active",
      "is_featured": true,
      "announcement_frequency": "hourly",
      "announcement_script": "Hey Soul FM listeners! Want to win VIP tickets...",
      "announcement_play_count": 0,
      "total_entries": 0
    }
  ]
}
```

---

### **Test 5: Schedule Contest Announcements**

**API Call:**
```bash
POST /make-server-06086aa3/contests/{contest_id}/schedule
```

**Server Logic:**
```javascript
// Generates announcement schedule based on frequency
// For "hourly" frequency from Feb 7 to Feb 21:
// - Creates queue items every hour
// - Adds "last chance" 1 hour before end
// - Returns ~336 scheduled announcements (14 days * 24 hours)
```

**Expected Response:**
```json
{
  "message": "Contest announcements scheduled successfully"
}
```

**View Queue:**
```bash
GET /make-server-06086aa3/contests/{contest_id}/queue
```

**Queue Response:**
```json
{
  "queue": [
    {
      "id": "...",
      "contest_id": "...",
      "scheduled_time": "2026-02-07T15:00:00Z",
      "announcement_type": "promo",
      "status": "pending"
    },
    {
      "scheduled_time": "2026-02-07T16:00:00Z",
      "announcement_type": "promo",
      "status": "pending"
    },
    ...
    {
      "scheduled_time": "2026-02-21T13:00:00Z",
      "announcement_type": "last_chance",
      "status": "pending"
    }
  ]
}
```

---

### **Test 6: Submit Contest Entry** (Public API)

**API Call:**
```bash
POST /make-server-06086aa3/contests/{contest_id}/enter
```

**Request Body:**
```json
{
  "entry_method": "text",
  "contact_info": "305-555-1234",
  "entry_data": {
    "keyword": "SOUL",
    "timestamp": "2026-02-07T14:30:00Z"
  }
}
```

**Expected Response:**
```json
{
  "entry": {
    "id": "...",
    "contest_id": "...",
    "entry_method": "text",
    "contact_info": "305-555-1234",
    "is_valid": true,
    "entered_at": "2026-02-07T14:30:00Z"
  },
  "message": "Entry submitted successfully!"
}
```

---

### **Test 7: Auto-DJ Contest Announcement** (Integration Test)

**Scenario:** Every 8-12 tracks

**Auto-DJ Logic:**
```javascript
// After 8 tracks played
const contest = await checkForContestAnnouncement();

// Returns:
{
  "contestId": "...",
  "title": "Win Tickets to Miami Soul Festival 2026",
  "announcementType": "promo",
  "duration": 30,
  "audioUrl": "https://...",
  "script": "Hey Soul FM listeners! Want to win VIP tickets..."
}

// Auto-DJ behavior:
// Track ends
// Counter = 8 tracks
// 🎁 Plays contest announcement (30 sec)
// Resets counter
// Resumes music
```

---

## 🎯 **COMPLETE AUTO-DJ PRIORITY TEST**

### **Full Integration Scenario:**

```
TIME: Wednesday, 18:58

TRACK QUEUE:
1. "Lovely Day" - Bill Withers (4:15) - PLAYING
2. [Auto-DJ checks priority]

PRIORITY SYSTEM CHECK:
┌─────────────────────────────────────┐
│ 1. PODCAST SCHEDULED?               │
│    → YES! "Soul Sessions" at 19:00  │
│    → PLAY PODCAST (45 min)          │
└─────────────────────────────────────┘
❌ Skip news check
❌ Skip contest check
❌ Skip announcements
❌ Skip jingles
❌ Skip music

RESULT:
18:58 - "Lovely Day" playing
19:00 - Track ends
19:00 - 🎙️ "The Soul Sessions - Episode 1" starts
19:45 - Podcast ends
19:45 - Resume music playlist
```

---

### **No Podcast, Check Others:**

```
TIME: Monday, 15:45

TRACK QUEUE:
1. "Ain't No Sunshine" - Bill Withers (2:03) - PLAYING
2. [Auto-DJ checks priority]

PRIORITY SYSTEM CHECK:
┌─────────────────────────────────────┐
│ 1. PODCAST SCHEDULED?               │
│    → NO                             │
│                                     │
│ 2. NEWS SCHEDULED?                  │
│    → YES! "Miami Music Fest" @ 16:00│
│    → PLAY NEWS (2 min)              │
└─────────────────────────────────────┘
❌ Skip contest check
❌ Skip announcements
❌ Skip jingles
❌ Skip music

RESULT:
15:45 - Track playing
15:47 - Track ends
15:47 - 📰 "Miami Music Fest" news (2 min)
15:49 - Resume music
```

---

### **No Podcast, No News:**

```
TIME: Tuesday, 10:30

TRACKS PLAYED: 9 since last announcement

PRIORITY SYSTEM CHECK:
┌─────────────────────────────────────┐
│ 1. PODCAST? NO                      │
│ 2. NEWS? NO                         │
│ 3. ANNOUNCEMENTS? (3-5 tracks) NO   │
│ 4. CONTEST? (8+ tracks) YES!        │
│    → PLAY CONTEST ANNOUNCEMENT      │
└─────────────────────────────────────┘

RESULT:
10:30 - Track ends
10:30 - 🎁 "Win VIP Tickets!" (30 sec)
10:31 - Resume music
```

---

## 📊 **EXPECTED STATISTICS**

After running for 24 hours:

**Podcast Stats:**
```
Total Schedules: 3
Active: 3
Played Today: 2 (Wed evening, Fri evening)
Total Plays: 2
```

**Contest Stats:**
```
Active Contests: 2
Announcements Scheduled: 336
Announcements Played: 24
Total Entries: 47
```

**Auto-DJ Priority Breakdown:**
```
Total Content Played: 1440 items (24h)

Breakdown:
- Music Tracks: 1380 (95.8%)
- Podcasts: 2 (0.1%)
- News: 12 (0.8%)
- Contest Announcements: 24 (1.7%)
- Regular Announcements: 12 (0.8%)
- Jingles: 10 (0.7%)
```

---

## ✅ **SUCCESS CRITERIA**

### **Podcasts:**
- [x] Create weekly/daily/one-time schedules
- [x] Auto-detect scheduled podcasts (10-min window)
- [x] Auto-play at scheduled time
- [x] Track play history
- [x] Smart rotation (don't repeat too often)

### **Contests:**
- [x] Create contests with entry methods
- [x] Generate announcement schedules
- [x] Auto-play announcements (hourly, etc.)
- [x] Accept public entries
- [x] Track statistics
- [x] Queue management

### **Auto-DJ Integration:**
- [x] Priority 1: Podcasts (scheduled shows)
- [x] Priority 2: News (scheduled updates)
- [x] Priority 3: Contests (every 8+ tracks)
- [x] Priority 4: Announcements (every 3-5 tracks)
- [x] Priority 5: Jingles (rules-based)
- [x] Priority 6: Music (always)

---

## 🎉 **YOU NOW HAVE:**

✅ **Podcast Auto-Scheduling**
- Weekly shows
- Special episodes
- One-time broadcasts
- Smart rotation

✅ **Contest Management**
- Create contests
- Auto-generate announcements
- Schedule announcement times
- Accept entries
- Track stats

✅ **Complete Radio Automation**
```
Upload Track → Playlist → Schedule → Auto-DJ
  ↓
Inject: Podcasts → News → Contests → Announcements → Jingles
  ↓
🔊 Professional 24/7 Radio Station
```

---

**Ready to build the UI? Let's create the admin panels! 🎨**
