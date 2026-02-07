# 🎧🎵💬📞 INTERACTIVE FEATURES - COMPLETE TEST GUIDE

## 🚀 **SETUP (5 MINUTES)**

### **Step 1: Run SQL Migration**
```sql
-- In Supabase SQL Editor:
-- Copy & paste entire contents of INTERACTIVE_FEATURES_SETUP.sql
-- Click "Run"
-- ✅ Tables created, seed data inserted
```

**Expected Result:**
```
✅ dj_sessions_06086aa3
✅ dj_session_tracks_06086aa3
✅ song_requests_06086aa3 (2 sample requests)
✅ request_votes_06086aa3
✅ shoutouts_06086aa3 (1 sample shoutout)
✅ call_queue_06086aa3 (1 sample call)
```

---

## 🎧 **TESTING LIVE DJ TAKEOVER**

### **Test 1: Check DJ Status**

**API Call:**
```bash
GET /make-server-06086aa3/dj-sessions/current
```

**Expected Response:**
```json
{
  "isLive": false,
  "session": null
}
```

---

### **Test 2: Start DJ Session (GO LIVE)**

**API Call:**
```bash
POST /make-server-06086aa3/dj-sessions/start
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "dj_name": "DJ Marcus",
  "title": "Friday Night Soul Mix",
  "session_type": "live_show"
}
```

**Expected Response:**
```json
{
  "session": {
    "id": "...",
    "dj_user_id": "...",
    "dj_name": "DJ Marcus",
    "title": "Friday Night Soul Mix",
    "status": "active",
    "started_at": "2026-02-07T...",
    "auto_dj_paused": true,
    "tracks_played": 0,
    "callers_taken": 0,
    "requests_played": 0
  },
  "isLive": true
}
```

**Console Output:**
```
🎧 DJ Session started: "Friday Night Soul Mix" by DJ Marcus
🔴 LIVE DJ MODE ACTIVE - Auto-DJ paused
```

---

### **Test 3: Auto-DJ Behavior During Live Session**

```javascript
// Auto-DJ checks every track end
checkAndAdvanceTrack()
  → isLiveDJ() returns TRUE
  → Console: "🎧 Live DJ is active - Auto-DJ paused"
  → Skip ALL automated content
  → DJ has full manual control
```

**What's Paused:**
```
❌ Auto-track advancement
❌ Podcast injection
❌ News injection
❌ Contest announcements
❌ Announcements (weather/time)
❌ Jingle rotation
❌ Song requests auto-play
❌ Shoutouts auto-play
```

**What DJ Controls:**
```
✅ Manual track selection
✅ Manual jingle playback
✅ Take caller questions live
✅ Play approved song requests
✅ Read shoutouts on air
✅ Full playlist control
```

---

### **Test 4: End DJ Session**

**API Call:**
```bash
POST /make-server-06086aa3/dj-sessions/{session_id}/end
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "message": "DJ session ended",
  "isLive": false
}
```

**Console Output:**
```
✅ DJ Session ended: {session_id}
▶️  Auto-DJ resuming...
```

**Auto-DJ resumes:**
```
✅ All automation re-enabled
✅ Continues scheduled playlist
✅ Resumes content injection
```

---

### **Test 5: View DJ Session History**

**API Call:**
```bash
GET /make-server-06086aa3/dj-sessions/{session_id}/tracks
```

**Expected Response:**
```json
{
  "tracks": [
    {
      "id": "...",
      "session_id": "...",
      "track_id": "track_lovely_day",
      "title": "Lovely Day",
      "artist": "Bill Withers",
      "played_at": "2026-02-07T20:15:00Z",
      "duration": 255,
      "was_request": true,
      "requester_name": "Sarah from Miami"
    },
    ...
  ]
}
```

---

## 🎵 **TESTING SONG REQUESTS**

### **Test 6: Submit Song Request (PUBLIC)**

**API Call:**
```bash
POST /make-server-06086aa3/song-requests/submit
```

**Request Body:**
```json
{
  "requester_name": "Sarah from Miami",
  "requester_email": "sarah@example.com",
  "requester_location": "Miami, FL",
  "track_id": "track_lovely_day",
  "message": "This song always makes my day better! Love Soul FM!"
}
```

**Expected Response:**
```json
{
  "request": {
    "id": "...",
    "requester_name": "Sarah from Miami",
    "track_id": "track_lovely_day",
    "message": "This song always makes my day better!",
    "status": "pending",
    "votes": 0,
    "created_at": "2026-02-07T..."
  },
  "message": "Request submitted! It will be reviewed by our team."
}
```

---

### **Test 7: Rate Limiting**

**Try submitting again immediately:**
```bash
POST /make-server-06086aa3/song-requests/submit
(same IP)
```

**Expected Response (429):**
```json
{
  "error": "Rate limit exceeded. You can only submit 1 request per hour."
}
```

**Rate Limits:**
- Song Requests: 1 per hour per IP
- Shoutouts: 1 per 2 hours per IP

---

### **Test 8: Vote on Request (PUBLIC)**

**API Call:**
```bash
POST /make-server-06086aa3/song-requests/{request_id}/vote
```

**Request Body:**
```json
{
  "vote_type": "up"
}
```

**Expected Response:**
```json
{
  "votes": 1,
  "message": "Vote recorded!"
}
```

**Vote Rules:**
- 1 vote per IP per request
- Duplicate votes ignored (unique constraint)
- vote_type: "up" or "down"

---

### **Test 9: Moderate Request (ADMIN)**

**API Call:**
```bash
POST /make-server-06086aa3/song-requests/{request_id}/moderate
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "approved",
  "note": "Great request!",
  "priority": 10
}
```

**Expected Response:**
```json
{
  "request": {
    "id": "...",
    "status": "approved",
    "moderation_note": "Great request!",
    "moderated_by": "admin_user_id",
    "moderated_at": "2026-02-07T...",
    "priority": 10
  }
}
```

**Status Options:**
- `pending` - Awaiting moderation
- `approved` - Will play on air
- `rejected` - Won't play
- `played` - Already aired
- `cancelled` - Cancelled by requester

---

### **Test 10: Auto-DJ Plays Request**

**Scenario:** After 5 music tracks

```javascript
// Track ends
tracksSinceLastRequest = 5

// Auto-DJ checks:
shouldPlayRequest() → true

// Gets next approved request:
getNextApprovedRequest()
  → Returns: {
      title: "Lovely Day",
      artist: "Bill Withers",
      requesterName: "Sarah from Miami",
      votes: 15
    }

// Plays request:
🎵 Playing song request: "Lovely Day" by Bill Withers
   Requested by: Sarah from Miami
```

**Now Playing Display:**
```
Title: 🎵 Lovely Day
Artist: Bill Withers
Album: Request from Sarah from Miami
```

---

## 💬 **TESTING SHOUTOUTS**

### **Test 11: Submit Shoutout (PUBLIC)**

**API Call:**
```bash
POST /make-server-06086aa3/shoutouts/submit
```

**Request Body:**
```json
{
  "sender_name": "Jennifer",
  "sender_location": "Miami",
  "recipient_name": "Mom (Linda)",
  "occasion": "birthday",
  "message": "Happy 60th birthday Mom! You're the best! Love you so much!"
}
```

**Expected Response:**
```json
{
  "shoutout": {
    "id": "...",
    "sender_name": "Jennifer",
    "recipient_name": "Mom (Linda)",
    "occasion": "birthday",
    "message": "Happy 60th birthday Mom...",
    "tts_script": "Soul FM has a special birthday shoutout! Happy 60th birthday to Linda from your daughter Jennifer! We're sending you love and soul vibes all day long!",
    "status": "pending"
  },
  "message": "Shoutout submitted! It will be reviewed and aired soon."
}
```

**Auto-Generated TTS Script:**
```
Input: Birthday message from Jennifer to Mom
Output: "Soul FM has a special birthday shoutout! 
         Happy 60th birthday to Linda from your daughter Jennifer! 
         [Original message]
         We're sending you love and soul vibes all day long!"
```

---

### **Test 12: Moderate Shoutout (ADMIN)**

**API Call:**
```bash
POST /make-server-06086aa3/shoutouts/{shoutout_id}/moderate
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "scheduled",
  "note": "Perfect for birthday segment!",
  "scheduled_date": "2026-02-08",
  "scheduled_time": "12:00:00",
  "priority": 10,
  "tts_script": "Soul FM has a VERY special birthday shoutout!..."
}
```

**Status Options:**
- `pending` - Awaiting review
- `approved` - Will play automatically
- `scheduled` - Will play at specific time
- `rejected` - Won't air
- `played` - Already aired

---

### **Test 13: Auto-DJ Plays Shoutout**

**Scenario:** After 10 music tracks

```javascript
// Track ends
tracksSinceLastShoutout = 10

// Auto-DJ checks:
shouldPlayShoutout() → true

// Gets next shoutout:
getNextShoutout()
  → Returns: {
      recipientName: "Linda",
      occasion: "birthday",
      duration: 30
    }

// Plays shoutout:
💬 Playing shoutout for Linda
   Occasion: birthday
```

**Now Playing Display:**
```
Title: 💬 Shoutout to Linda
Artist: Soul FM Listener
Album: Birthday
Duration: 30 seconds
```

---

## 📞 **TESTING CALL-INS**

### **Test 14: Add Caller to Queue**

**API Call:**
```bash
POST /make-server-06086aa3/call-queue/add
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "caller_name": "John",
  "caller_phone": "305-555-1234",
  "caller_location": "Miami",
  "call_reason": "request",
  "topic": "Wants to request Earth Wind & Fire"
}
```

**Expected Response:**
```json
{
  "call": {
    "id": "...",
    "caller_name": "John",
    "caller_phone": "305-555-1234",
    "call_reason": "request",
    "topic": "Wants to request Earth Wind & Fire",
    "status": "waiting",
    "queue_position": 1
  }
}
```

---

### **Test 15: Screen Call (APPROVE/REJECT)**

**API Call:**
```bash
POST /make-server-06086aa3/call-queue/{call_id}/screen
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "approved",
  "notes": "Great energy, good topic!"
}
```

**Expected Response:**
```json
{
  "call": {
    "id": "...",
    "status": "approved",
    "screened_by": "admin_user_id",
    "screened_at": "2026-02-07T...",
    "screener_notes": "Great energy, good topic!"
  }
}
```

---

### **Test 16: Connect Call (GO ON AIR)**

**API Call:**
```bash
POST /make-server-06086aa3/call-queue/{call_id}/connect
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "session_id": "{dj_session_id}"
}
```

**Expected Response:**
```json
{
  "message": "Call connected",
  "status": "on_air"
}
```

**Call Status:**
```
Status: on_air
Connected At: 2026-02-07T20:30:00Z
DJ Session: {session_id}
```

---

### **Test 17: Disconnect Call**

**API Call:**
```bash
POST /make-server-06086aa3/call-queue/{call_id}/disconnect
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "message": "Call ended",
  "status": "completed"
}
```

**Call Record Updated:**
```
Status: completed
Disconnected At: 2026-02-07T20:35:00Z
Call Duration: 300 seconds (5 minutes)
```

---

## 🎯 **COMPLETE PRIORITY SYSTEM (UPDATED)**

### **NEW PRIORITY ORDER:**

```
PRIORITY 0: 🔴 LIVE DJ (OVERRIDES ALL)
  → Manual control
  → Auto-DJ completely paused
  
PRIORITY 1: 🎙️ Podcasts (Scheduled shows)
  → Weekly/Daily/One-time
  → 30-90 minutes
  
PRIORITY 2: 📰 News (Scheduled updates)
  → Hourly/Custom
  → 1-3 minutes
  
PRIORITY 3: 🎁 Contests (Every 8-12 tracks)
  → Hourly announcements
  → 20-40 seconds
  
PRIORITY 4: 🎵 Song Requests (Every 5-8 tracks)
  → Community voted
  → Full track (3-5 min)
  
PRIORITY 5: 💬 Shoutouts (Every 10-15 tracks)
  → Listener messages
  → 20-30 seconds
  
PRIORITY 6: 📻 Announcements (Every 3-5 tracks)
  → Weather/Time/Station ID
  → 15-30 seconds
  
PRIORITY 7: 🔔 Jingles (Rules-based)
  → Branding
  → 5-15 seconds
  
PRIORITY 8: 🎵 Music (Always)
  → Scheduled playlists
  → 2-8 minutes
```

---

## 🕐 **TYPICAL HOUR (WITH INTERACTIVE FEATURES)**

### **Example: Friday 8:00 PM - 9:00 PM (LIVE DJ)**

```
20:00:00 - 🔴 DJ Marcus starts session "Friday Night Soul Mix"
20:00:00 - Auto-DJ paused
20:01:00 - 🎵 DJ plays "Lovely Day" (manual selection)
20:05:15 - 💬 DJ reads shoutout live: "Happy birthday Linda!"
20:06:00 - 📞 DJ takes caller: "Hi John from Miami!"
20:09:30 - 🎵 DJ plays caller's request "September" 
20:13:05 - 🔔 DJ plays station ID jingle
20:13:15 - 🎵 "Let's Groove" (manual)
20:16:55 - 📞 Another caller question
20:20:00 - 🎵 "For The Love Of You" (request from Sarah - 15 votes!)
20:25:36 - 💬 DJ reads another shoutout
20:26:00 - 🎵 "Ain't No Sunshine"
...
21:00:00 - 🔴 DJ ends session
21:00:00 - ▶️  Auto-DJ resumes
21:00:05 - 📰 News update (scheduled for 9PM)
21:02:05 - 🎵 Auto-DJ continues playlist...
```

---

## 📊 **24-HOUR STATS (WITH INTERACTIVE)**

### **Typical Friday (With 2-Hour DJ Show):**

```yaml
Total Items Played: ~1,450

Breakdown:
  🎵 Music: 1,280 (88.3%)
  🎧 Live DJ Session: 1 (2 hours)
  🎵 Song Requests: 18 (1.2%)
  💬 Shoutouts: 14 (1.0%)
  📰 News: 12 (0.8%)
  🎁 Contests: 24 (1.7%)
  📻 Announcements: 36 (2.5%)
  🔔 Jingles: 16 (1.1%)
  📞 Live Calls: 8 (during DJ session)

Listener Interaction:
  Song Requests Submitted: 47
  Requests Approved: 18
  Requests Played: 18
  Total Votes Cast: 234
  
  Shoutouts Submitted: 23
  Shoutouts Approved: 14
  Shoutouts Aired: 14
  
  Calls Received: 12
  Calls Screened: 10
  Calls On-Air: 8
```

---

## ✅ **SUCCESS CRITERIA**

### **Live DJ Takeover:**
- [x] Start/end DJ sessions
- [x] Auto-DJ completely paused
- [x] Manual track control
- [x] Session tracking
- [x] Play history
- [x] Smooth handoff back to Auto-DJ

### **Song Requests:**
- [x] Public submission
- [x] Rate limiting (1/hour)
- [x] Community voting
- [x] Admin moderation
- [x] Priority queue
- [x] Auto-play integration

### **Shoutouts:**
- [x] Public submission
- [x] Rate limiting (1/2 hours)
- [x] Auto TTS script generation
- [x] Admin moderation
- [x] Schedule for specific dates
- [x] Auto-play integration

### **Call-Ins:**
- [x] Call queue management
- [x] Screener approval
- [x] On-air connection
- [x] Call duration tracking
- [x] Session integration
- [x] Full call history

---

## 🎉 **YOU NOW HAVE:**

```
✅ Complete Radio Automation
✅ Live DJ Takeover
✅ Song Requests (voted by listeners!)
✅ Shoutouts & Dedications
✅ Call-In System
✅ 8-Level Priority System
✅ Rate Limiting
✅ Moderation Queues
✅ Session Tracking
✅ Full Analytics
```

**= FULLY INTERACTIVE PROFESSIONAL RADIO STATION! 🚀**

---

**Ready for the UI? Let's build the admin dashboard and public widgets! 🎨**
