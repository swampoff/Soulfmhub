# 🎯 SOUL FM - COMPLETE PRIORITY SYSTEM

## 🔄 **HOW AUTO-DJ DECIDES WHAT TO PLAY**

```
┌────────────────────────────────────────────────────────────┐
│              TRACK ENDS - CHECK WHAT'S NEXT                │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │   PRIORITY 1: SCHEDULED PODCAST?      │
        │   (Wed 7PM, Fri 9PM, etc.)           │
        └───────────────┬───────────────────────┘
                        │
                ┌───────┴────────┐
                │ YES            │ NO
                ▼                ▼
        ┌───────────────┐  ┌───────────────────────────────┐
        │ 🎙️ PLAY       │  │ PRIORITY 2: SCHEDULED NEWS?   │
        │   PODCAST     │  │ (Within 5-min window)         │
        │   (45-60 min) │  └──────────┬────────────────────┘
        └───────────────┘             │
                                ┌─────┴─────┐
                                │ YES       │ NO
                                ▼           ▼
                        ┌──────────────┐  ┌─────────────────────────┐
                        │ 📰 PLAY NEWS │  │ PRIORITY 3: CONTEST?    │
                        │   (2-3 min)  │  │ (Every 8-12 tracks)     │
                        └──────────────┘  └──────────┬──────────────┘
                                                     │
                                             ┌───────┴────────┐
                                             │ YES            │ NO
                                             ▼                ▼
                                     ┌──────────────┐  ┌────────────────────┐
                                     │ 🎁 PLAY      │  │ PRIORITY 4:        │
                                     │   CONTEST    │  │ ANNOUNCEMENTS?     │
                                     │   (30 sec)   │  │ (Every 3-5 tracks) │
                                     └──────────────┘  └─────────┬──────────┘
                                                                 │
                                                         ┌───────┴────────┐
                                                         │ YES            │ NO
                                                         ▼                ▼
                                                 ┌──────────────┐  ┌──────────────┐
                                                 │ 📻 PLAY      │  │ PRIORITY 5:  │
                                                 │   WEATHER/   │  │ JINGLES?     │
                                                 │   TIME/ID    │  │ (Rules-based)│
                                                 │   (15-30s)   │  └──────┬───────┘
                                                 └──────────────┘         │
                                                                  ┌───────┴────────┐
                                                                  │ YES            │ NO
                                                                  ▼                ▼
                                                          ┌──────────────┐  ┌──────────┐
                                                          │ 🔔 PLAY      │  │ 🎵 PLAY  │
                                                          │   JINGLE     │  │   MUSIC  │
                                                          │   (10 sec)   │  │   TRACK  │
                                                          └──────────────┘  └──────────┘
```

---

## 📋 **PRIORITY BREAKDOWN**

### **PRIORITY 1: 🎙️ PODCASTS** (Highest)
```yaml
Trigger: Scheduled time (±10 minutes)
Frequency: Weekly, Daily, or One-time
Duration: 30-90 minutes
Example: "Soul Sessions" every Wednesday at 7 PM

When active:
  - Fades out current music
  - Plays full podcast episode
  - Resumes regular programming after
  - Resets ALL counters
```

---

### **PRIORITY 2: 📰 NEWS** (Very High)
```yaml
Trigger: Scheduled time (±5 minutes)
Frequency: Hourly, Every 2 hours, Custom
Duration: 1-3 minutes
Example: "Miami Music Festival" at 3:00 PM

When active:
  - Stops music immediately
  - Plays TTS voice-over
  - Resumes music after
  - Resets track counters
```

---

### **PRIORITY 3: 🎁 CONTESTS** (High)
```yaml
Trigger: Every 8-12 music tracks OR scheduled
Frequency: Hourly, Every 2 hours, Custom
Duration: 20-40 seconds
Example: "Win VIP Tickets!" every hour

When active:
  - Plays contest announcement
  - Encourages listener participation
  - Resets contest counter
```

---

### **PRIORITY 4: 📻 ANNOUNCEMENTS** (Medium-High)
```yaml
Trigger: Every 3-5 music tracks
Frequency: Automatic rotation
Duration: 15-30 seconds
Types:
  - Weather updates
  - Time announcements
  - Station IDs
  - Traffic reports

Rotation:
  40% → Station ID
  30% → Weather
  20% → Time
  10% → Random
```

---

### **PRIORITY 5: 🔔 JINGLES** (Medium)
```yaml
Trigger: Rule-based automation
Frequency:
  - Every N tracks
  - Time-based (hourly)
  - Category rotation
Duration: 5-15 seconds
Example: "Soul FM" jingle every 3 tracks

Rules:
  - Music tracks: Every 3 tracks
  - Time-based: Top of hour
  - Show transitions: On schedule change
```

---

### **PRIORITY 6: 🎵 MUSIC** (Default)
```yaml
Trigger: Always (when nothing else plays)
Frequency: Continuous
Duration: 2-8 minutes per track
Source: Scheduled playlist

When playing:
  - Increments ALL counters
  - Follows schedule rules
  - Auto-advances to next track
```

---

## 🕐 **TYPICAL HOUR BREAKDOWN**

### **Example: Monday 3:00 PM - 4:00 PM**

```
15:00:00 - 📰 NEWS: "Miami Music Festival Announced" (2:00)
15:02:00 - 🎵 "Lovely Day" by Bill Withers (4:15)
15:06:15 - 🎵 "Ain't No Sunshine" by Bill Withers (2:03)
15:08:18 - 🎵 "Just The Two Of Us" by Grover Washington Jr. (7:21)
           [Counter: 3 tracks]
15:15:39 - 🔔 JINGLE: "Soul FM Station ID" (0:10)
15:15:49 - 🎵 "Let's Stay Together" by Al Green (3:18)
15:19:07 - 🎵 "For The Love Of You" by Isley Brothers (5:36)
15:24:43 - 🎵 "Always There" by Incognito (5:17)
           [Counter: 6 tracks since last announcement]
15:30:00 - 📻 ANNOUNCEMENT: "Weather Update" (0:30)
15:30:30 - 🎵 "Rock With You" by Michael Jackson (3:40)
15:34:10 - 🎵 "Caught Up" by Usher (3:55)
15:38:05 - 🎵 "No Diggity" by Blackstreet (4:29)
           [Counter: 9 tracks since last contest]
15:42:34 - 🎁 CONTEST: "Win VIP Tickets to Soul Festival!" (0:30)
15:43:04 - 🎵 "September" by Earth, Wind & Fire (3:35)
15:46:39 - 🎵 "Reasons" by Earth, Wind & Fire (4:59)
15:51:38 - 🎵 "Before I Let Go" by Frankie Beverly (5:18)
           [Counter: 3 tracks]
15:56:56 - 🔔 JINGLE: "Soul FM" (0:08)
15:57:04 - 🎵 "Let's Groove" by Earth, Wind & Fire (3:00)
16:00:04 - [Next hour cycle begins...]

HOUR SUMMARY:
✅ 1 News segment (2 min)
✅ 12 Music tracks (52 min)
✅ 2 Jingles (18 sec)
✅ 1 Weather announcement (30 sec)
✅ 1 Contest announcement (30 sec)
✅ Small gaps for transitions (4 min)

Total Content: 60 minutes
Music: 86.7%
Spoken: 13.3%
```

---

## 📊 **24-HOUR STATS**

### **Typical Day (Mon-Fri):**

```yaml
Total Items Played: ~1,440

Breakdown:
  🎵 Music Tracks: 1,350 (93.8%)
  📰 News Updates: 12 (0.8%)
  🎁 Contest Announcements: 24 (1.7%)
  📻 Regular Announcements: 36 (2.5%)
  🔔 Jingles: 18 (1.3%)
  🎙️ Podcasts: 0 (not today)

Content Duration:
  Music: 22.5 hours
  News: 24 minutes
  Contests: 12 minutes
  Announcements: 18 minutes
  Jingles: 3 minutes
```

### **Wednesday (Podcast Day):**

```yaml
Total Items Played: ~1,380

Breakdown:
  🎵 Music Tracks: 1,320 (95.7%)
  🎙️ Podcast: 1 (0.1%) - 45 minutes!
  📰 News Updates: 12 (0.9%)
  🎁 Contest Announcements: 20 (1.4%)
  📻 Regular Announcements: 20 (1.4%)
  🔔 Jingles: 7 (0.5%)

Content Duration:
  Music: 22 hours
  Podcast: 45 minutes
  News: 24 minutes
  Contests: 10 minutes
  Announcements: 10 minutes
  Jingles: 1 minute
```

---

## 🎯 **COUNTERS & TRIGGERS**

```javascript
// Track counters (reset after injection)
let musicTracksPlayed = 0;           // For news/announcements
let tracksForContests = 0;           // For contest announcements
let tracksForJingles = 0;            // For jingle rotation

// After each music track plays:
function onTrackEnd() {
  musicTracksPlayed++;
  tracksForContests++;
  tracksForJingles++;
  
  // Check priorities in order:
  if (podcastScheduled()) {
    playPodcast();
    resetAllCounters();
  } else if (newsScheduled()) {
    playNews();
    resetMusicAndContestCounters();
  } else if (tracksForContests >= 8) {
    playContest();
    resetContestCounter();
  } else if (musicTracksPlayed >= 3) {
    playAnnouncement();
    resetMusicCounter();
  } else if (tracksForJingles >= 3) {
    playJingle();
    resetJingleCounter();
  } else {
    playNextMusicTrack();
    // Counters keep incrementing
  }
}
```

---

## 🔥 **REAL-WORLD EXAMPLE**

### **Wednesday Evening - Podcast Night:**

```
18:50 - 🎵 Music playing
18:55 - Auto-DJ detects: "Soul Sessions" scheduled at 19:00
18:58 - Current track ends
18:59 - Auto-DJ: "Podcast in 1 minute! Prepare..."
19:00 - 🎙️ PODCAST STARTS
        "Welcome to The Soul Sessions with Marcus Williams!
         Tonight we're diving deep into the golden era of 
         Motown Records..."
        
19:45 - Podcast ends
19:45 - 📻 Station ID: "You're listening to Soul FM"
19:46 - 🎵 Music resumes
        "Lovely Day" by Bill Withers
        
19:50 - 🎵 "Ain't No Sunshine"
19:52 - 🎵 "Just The Two Of Us"
19:59 - 🎵 "Let's Stay Together"
        [Counter: 3 tracks]
        
20:02 - 🔔 Jingle: "Soul FM"
20:03 - 🎵 Music continues...
```

---

## ✅ **SUCCESS = PROFESSIONAL RADIO**

Your station now has:

✅ **Scheduled Shows** (Podcasts)
✅ **News Updates** (TTS voice-overs)
✅ **Contests** (Listener engagement)
✅ **Weather/Time** (Utility announcements)
✅ **Station IDs** (Branding)
✅ **Jingles** (Professional sound)
✅ **Music** (Core content)

**= COMPLETE PROFESSIONAL RADIO AUTOMATION SYSTEM! 🎉**

---

**Next: Build the Admin UI! 🎨**
