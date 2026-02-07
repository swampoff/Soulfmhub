# 🎵 SOUL FM - COMPLETE INTEGRATION FLOW

**From Upload to On Air** - Полная интеграция всех систем

---

## 📊 **ПОЛНАЯ СИСТЕМА - КАК ВСЁ РАБОТАЕТ ВМЕСТЕ**

```
┌─────────────────────────────────────────────────────────────┐
│                    SOUL FM RADIO STATION                     │
│                     Fully Automated                          │
└─────────────────────────────────────────────────────────────┘

         ┌──────────────┐
         │ UPLOAD TRACK │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Extract      │──┐
         │ Metadata     │  │ Auto-extract:
         │ (Auto)       │  │ - Title, Artist
         └──────┬───────┘  │ - Genre, BPM
                │          │ - Duration
                │          │ - Cover Art
                ▼          └─────────────
         ┌──────────────┐
         │ Save to      │
         │ KV Store     │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Add to       │──── Playlist Selection
         │ PLAYLIST     │     (soul, jazz, rnb, etc.)
         └──────┬───────┘
                │
                ▼
    ╔═══════════════════════╗
    ║     AUTO-DJ ENGINE     ║
    ║   (Main Controller)    ║
    ╚═══════════════════════╝
                │
                ▼
    ┌───────────────────────┐
    │ Scheduling System     │
    │ (Time-based playlists)│
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────────────────────┐
    │       CONTENT INJECTION CHECK         │
    │     (Every track transition)          │
    └───────────┬───────────────────────────┘
                │
                ├───────────────────────┐
                │                       │
                ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │  1. NEWS CHECK   │    │ 2. ANNOUNCEMENT  │
    │  (Highest ⚡)    │    │    CHECK         │
    └────┬─────────────┘    └────┬─────────────┘
         │                       │
         │ Scheduled?            │ Every 3-5
         │ Yes → PLAY            │ tracks?
         │ No → Skip             │ Yes → PLAY
         │                       │ No → Skip
         │                       │
         └───────┬───────────────┘
                 │
                 ▼
    ┌──────────────────┐
    │ 3. JINGLE CHECK  │
    │    (Rules-based) │
    └────┬─────────────┘
         │
         │ Rule matched?
         │ Yes → PLAY
         │ No → Skip
         │
         ▼
    ┌──────────────────┐
    │ 4. MUSIC TRACK   │
    │  (From playlist) │
    └────┬─────────────┘
         │
         ▼
    ┌──────────────────┐
    │   🔊 ON AIR!     │
    └──────────────────┘
```

---

## 🎯 **PRIORITY SYSTEM**

Когда трек заканчивается, Auto-DJ проверяет в таком порядке:

### **Priority 1: 📰 NEWS (HIGHEST)**
```
IF news is scheduled within next 5 minutes:
  → STOP everything
  → PLAY news voice-over
  → Mark as played
  → Reset track counter
  → Continue with music
```

**Example:**
```
14:58 - Track "Ain't No Sunshine" ends
14:59 - News scheduled at 15:00 (within 5 min window)
15:00 - 📰 "Breaking: Miami Music Festival Announced"
15:02 - Resume regular programming
```

---

### **Priority 2: 📻 ANNOUNCEMENTS (HIGH)**
```
IF 3-5 tracks played since last announcement:
  → Check announcement type (rotate):
     - 40% chance: Station ID
     - 30% chance: Weather
     - 20% chance: Time
     - 10% chance: Any type
  → PLAY announcement
  → Mark as played
  → Reset track counter
  → Continue with music
```

**Types:**
- 🌤️ **Weather**: "It's 75 degrees and sunny in Miami..."
- ⏰ **Time**: "It's 3 PM on Soul FM..."
- 📻 **Station ID**: "This is Soul FM, your home for soul music..."
- 🚗 **Traffic**: "Traffic update for Miami area..."
- 🎪 **Promo**: "Coming this weekend at Soul FM..."

---

### **Priority 3: 🔔 JINGLES (MEDIUM)**
```
IF jingle rule matches:
  - Every N tracks
  - Time-based (hourly, etc.)
  - Category rotation
  → PLAY jingle
  → Mark as played
  → Continue with music
```

---

### **Priority 4: 🎵 MUSIC TRACKS (DEFAULT)**
```
IF no news/announcements/jingles:
  → Get scheduled playlist for current time
  → Play next track from playlist
  → Increment track counter
  → Repeat
```

---

## 📋 **TRACK UPLOAD TO AIR WORKFLOW**

### **Step-by-Step Process:**

#### **1. Upload Track** (Admin Panel)
```
Admin Panel → Tracks Management → Upload Track

Input:
- Audio file (MP3, FLAC, WAV)
- Select playlist (optional)
- Auto-add to Live Stream? (checkbox)

Auto-extraction:
✅ Title, Artist, Album
✅ Genre, Year, BPM
✅ Duration
✅ Cover art (embedded or online search)
✅ Waveform generation
```

#### **2. Storage & Database**
```
Audio File → Supabase Storage (make-06086aa3-tracks)
Metadata → KV Store (track:id)
Short Link → Generated (soulfm.stream/xyz123)
Cover Art → Supabase Storage (make-06086aa3-covers)
```

#### **3. Add to Playlist**
```
IF "Auto-add to Live Stream" checked:
  → Add to 'livestream' playlist
  → Position: Start or End

OR manually:
  → Playlists Management → Edit Playlist
  → Add track to playlist
  → Drag to reorder
```

#### **4. Schedule Playlist**
```
Schedule Management → Create Schedule

Set:
- Day of week
- Start time
- End time
- Select playlist
- Priority

Example:
Mon-Fri, 06:00-10:00 → "Morning Soul" playlist
Mon-Fri, 10:00-16:00 → "Daytime Grooves" playlist
```

#### **5. Auto-DJ Plays**
```
When current time matches schedule:
  → Auto-DJ loads playlist
  → Plays tracks in order (or shuffle)
  → Checks for injections between tracks
  → Updates "Now Playing"
  → Broadcasts to Icecast
```

---

## 🎬 **REAL-TIME EXAMPLE**

### **Typical Hour on Soul FM:**

```
15:00 - 📰 News: "Miami Beach Music Festival"
        Duration: 2 minutes
        Voice: Professional News Anchor

15:02 - 🎵 "Lovely Day" by Bill Withers
        Duration: 4:15
        Playlist: Afternoon Soul

15:06 - 🎵 "Ain't No Sunshine" by Bill Withers  
        Duration: 2:03
        Playlist: Afternoon Soul

15:08 - 🎵 "Just The Two Of Us" by Grover Washington Jr.
        Duration: 7:21
        Playlist: Afternoon Soul

15:15 - 🔔 Station Jingle: "Soul FM" (Rule: Every 3 tracks)
        Duration: 0:10

15:15 - 🎵 "Let's Stay Together" by Al Green
        Duration: 3:18
        Playlist: Afternoon Soul

15:18 - 🎵 "For The Love Of You" by Isley Brothers
        Duration: 5:36
        Playlist: Afternoon Soul

15:24 - 🎵 "Always There" by Incognito
        Duration: 5:17
        Playlist: Afternoon Soul

15:29 - 📻 Weather Announcement (Every ~5 tracks)
        "It's 75 degrees and sunny in Miami..."
        Duration: 0:30

15:30 - 🎵 "Rock With You" by Michael Jackson
        Duration: 3:40
        Playlist: Afternoon Soul

... and so on
```

---

## 🔄 **NEWS INJECTION WORKFLOW**

### **Complete News Lifecycle:**

```
1. CREATE NEWS
   ↓
   Admin → News Management → Create Article
   - Title, Content, Category
   - Mark as published

2. GENERATE VOICE-OVER
   ↓
   Admin → News Injection → Generate Voice-Over
   - Select news article
   - Select voice (Professional Anchor, etc.)
   - Click "Generate"
   → ElevenLabs TTS creates audio
   → Saves to Supabase Storage
   → Creates voice-over record

3. CREATE INJECTION RULE
   ↓
   Admin → News Injection → Create Rule
   - Name: "Hourly News Updates"
   - Frequency: Hourly (or custom times)
   - Days: Mon-Fri
   - Max news per slot: 1
   - Priority: Latest first
   - Active: ✅

4. RUN SCHEDULER
   ↓
   Admin → Click "Run Scheduler"
   → Reads active rules
   → Calculates next 24h schedule
   → Selects news for each slot
   → Populates queue
   
   Queue Example:
   - 16:00 → "Miami Music Festival"
   - 17:00 → "Local Artist Grammy Win"
   - 18:00 → "New Streaming Technology"
   - 19:00 → "Community Fundraiser"

5. AUTO-DJ PLAYS
   ↓
   When 15:55-16:05 (5-min window):
   → Auto-DJ checks queue
   → Finds news scheduled for 16:00
   → Plays news voice-over
   → Marks as "playing" → "completed"
   → Increments play count
   → Resumes music

6. STATS & MONITORING
   ↓
   Admin → News Injection → Stats
   - Total voice-overs: 15
   - Active rules: 3
   - Pending queue: 24
   - Most played: "Miami Music Festival" (12 plays)
```

---

## 🌤️ **ANNOUNCEMENTS WORKFLOW**

### **Weather Announcement:**

```
1. FETCH WEATHER DATA
   ↓
   OpenWeatherMap API → Current conditions
   - Temperature: 75°F
   - Condition: Partly Cloudy
   - Humidity: 65%
   - Wind: 10 mph

2. GENERATE SCRIPT
   ↓
   Script template + weather data:
   "Here's your weather update. It's currently 75 degrees 
    and partly cloudy in Miami. Humidity is at 65 percent, 
    with winds around 10 miles per hour."

3. TTS GENERATION
   ↓
   ElevenLabs TTS → Audio file
   Save to storage → Get signed URL

4. SAVE TO DATABASE
   ↓
   content_announcements_06086aa3
   - type: 'weather'
   - content: (script)
   - audio_url: (signed URL)
   - voice_id: Professional Voice
   - duration: 15 seconds
   - is_active: true
   - schedule_pattern: '0 * * * *' (every hour)

5. AUTO-DJ ROTATION
   ↓
   After 3-5 tracks:
   → Randomly select announcement type
   → 30% chance = weather
   → Play weather announcement
   → Mark as played
   → Continue music
```

---

## 📊 **STATISTICS & MONITORING**

### **Track Statistics:**
```sql
SELECT 
  title,
  artist,
  play_count,
  last_played
FROM tracks
ORDER BY play_count DESC
LIMIT 10;
```

### **News Statistics:**
```sql
SELECT 
  news_title,
  play_count,
  last_played,
  voice_name
FROM news_voice_overs_06086aa3
WHERE is_active = true
ORDER BY play_count DESC;
```

### **Announcement Statistics:**
```sql
SELECT 
  type,
  COUNT(*) as total,
  SUM(play_count) as total_plays
FROM content_announcements_06086aa3
GROUP BY type;
```

---

## 🔧 **CONFIGURATION**

### **For Professional Radio Station:**

```yaml
Playlists:
  - Morning Show (6-10 AM): Upbeat soul & funk
  - Daytime (10 AM-4 PM): Smooth jazz & R&B
  - Drive Time (4-7 PM): Classic soul hits
  - Evening (7 PM-12 AM): Mellow jazz
  - Overnight (12-6 AM): Instrumental jazz

News Injection:
  - Hourly news (Mon-Fri, 7 AM-7 PM)
  - News every 2 hours (weekends)
  - Breaking news (as needed)

Announcements:
  - Station ID: Every 30 minutes
  - Weather: Every hour at :30
  - Time: Every hour on the hour
  - Traffic: Mon-Fri during drive time

Jingles:
  - Station ID jingle: Every 3 tracks
  - Show transitions: At schedule changes
  - Special events: As configured
```

---

## 🎉 **FINAL RESULT**

### **What You Get:**

✅ **Professional Radio Station**
- Fully automated 24/7
- Smart content injection
- Natural transitions
- Professional sound

✅ **Easy Management**
- Upload tracks → Auto-metadata
- Create playlists → Drag & drop
- Schedule programming → Time-based
- Inject news → TTS + scheduling
- Add announcements → Auto-generated

✅ **Real-time Monitoring**
- Now Playing
- Queue preview
- Play statistics
- Listener metrics

✅ **Enterprise Features**
- News injection
- Weather announcements
- Time announcements
- Station IDs
- Traffic reports
- Jingle rotation
- Smart scheduling

---

## 🚀 **YOU NOW HAVE:**

```
Track Upload System ✅
Playlist Management ✅
Schedule System ✅
Auto-DJ Engine ✅
Jingle Rotation ✅
News Injection ✅
Content Announcements ✅
TTS Integration ✅
Smart Scheduling ✅
Queue Management ✅
Statistics Dashboard ✅
Admin Panel ✅
```

**THIS IS A COMPLETE, PROFESSIONAL RADIO AUTOMATION SYSTEM! 🔥**

---

**Ready to test? Let's go! 🧪**
