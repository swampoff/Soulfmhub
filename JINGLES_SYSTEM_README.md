# 🔔 Soul FM Hub - Professional Jingle Automation System

## 📋 Overview

Полная профессиональная система управления джинглами и автоматизации воспроизведения для радиостанции Soul FM Hub. Система поддерживает 20+ типов джинглов, умную ротацию, presets для быстрой настройки и визуальный timeline.

## 🎯 Features

### 1. **20+ Professional Jingle Categories**

#### Imaging & Branding 🎨
- **Station ID** (📻) - Full station identification with call letters
- **Sweeper** (✨) - Quick branding elements between songs
- **Bumper** (🔄) - Short transitions between segments
- **Stinger** (⚡) - Very short sonic logo or accent
- **Drop-In** (🎤) - Voice-over liner played over music intro
- **Liner** (💬) - Standalone voice positioning statement

#### Programming 📺
- **Show Intro** (🎬) - Opening for specific shows
- **Show Outro** (🎭) - Closing for specific shows
- **Segment Transition** (↔️) - Transitions between show segments

#### Time & Information 📰
- **Time Check** (⏰) - Time announcement bumpers
- **Weather Bumper** (🌤️) - Weather report intro/outro
- **Traffic Bumper** (🚗) - Traffic report intro/outro

#### Commercial Breaks 💼
- **Commercial Intro** (💰) - Lead-in before commercial break
- **Commercial Outro** (↩️) - Return from commercial break

#### Special & Promos 🌟
- **Contest/Promo** (🎁) - Contest announcements and promos
- **Holiday/Seasonal** (🎄) - Holiday and seasonal imaging
- **Event Promo** (🎪) - Promotion for specific events

#### Technical 🔧
- **Emergency Alert** (🚨) - Emergency broadcasting system alerts
- **Technical** (⚙️) - Silence fillers and technical elements

### 2. **Smart Automation Rules**

#### 4 Rule Types:
1. **Time Interval** ⏱️ - Play every X minutes
   - Example: Station ID every 60 minutes
   - Use case: Regular branding

2. **Specific Times** 📅 - Play at exact times
   - Example: Time check at 09:00, 10:00, 11:00...
   - Use case: Top of hour IDs, scheduled promos

3. **Track Count** 🔢 - Play after X tracks
   - Example: Sweeper every 3 songs
   - Use case: Consistent music-to-jingle ratio

4. **Show Based** 📻 - Play during specific shows
   - Example: Show intro at program start
   - Use case: Program-specific imaging

#### Advanced Features:
- **Days of Week Filter** - Monday-Sunday selection
- **Minimum Gap** - Prevent flooding (e.g., 15 min minimum between same jingle)
- **Priority System** - 1-10 scale, higher = plays first
- **Active/Inactive Toggle** - Easy on/off without deleting

### 3. **Automation Presets** ⚡

6 professional ready-to-use templates:

1. **Hot Clock Standard** ⏰
   - Station ID every hour (00:00)
   - Sweepers at :15, :30, :45
   - Station liner every 8 songs
   - Format: Universal

2. **Top 40 High Energy** 🎉
   - Aggressive CHR format
   - Sweeper every 3 songs
   - Stinger every 2 songs
   - Drop-in every 5 songs
   - Format: Top 40/CHR

3. **Morning Drive Time** 🌅
   - Weekday morning show (6 AM - 10 AM)
   - Time checks every 30 minutes
   - Traffic reports during rush hour
   - Weather updates
   - Format: Daypart Specific

4. **Smooth & Minimal** 🎵
   - Low-intrusion automation
   - Station ID every 2 hours
   - Subtle bumper every 10 songs
   - Format: Smooth Jazz/Chill

5. **Commercial Automation** 💼
   - Standard break structure
   - Commercial intro at :20 and :50
   - Commercial outro at :24 and :54
   - Format: Universal

6. **Weekend Programming** 🎊
   - Relaxed weekend automation
   - Sweeper every 6 songs
   - Contest promos at noon, 3 PM, 6 PM
   - Format: Daypart Specific

### 4. **24-Hour Visual Timeline** 📊

- Hour-by-hour schedule view
- Day-of-week selector (Monday-Sunday)
- Shows all scheduled jingle plays
- Category distribution breakdown
- Statistics: total events, avg minutes between
- Filter active/inactive rules
- Color-coded by category

### 5. **Smart Rotation Engine**

#### Priority Calculation:
```
Combined Priority = Rule Priority + Jingle Priority
```

#### Conflict Prevention:
- Minimum gap enforcement
- Day-of-week filtering
- Time-based triggers
- No duplicate jingles in short timespan

#### Runtime Behavior:
- Checks rules before each track
- Auto-increments track counter
- Respects minimum gaps
- Highest priority wins

## 🗂️ Architecture

### Backend API (`/supabase/functions/server/`)

**jingles.ts** - CRUD endpoints:
```
GET    /jingles                  # List all jingles
GET    /jingles/:id              # Get single jingle
POST   /jingles                  # Create jingle
PUT    /jingles/:id              # Update jingle
DELETE /jingles/:id              # Delete jingle
POST   /jingles/:id/upload       # Upload audio file

GET    /jingle-rules             # List all rules
GET    /jingle-rules/:id         # Get single rule
POST   /jingle-rules             # Create rule
PUT    /jingle-rules/:id         # Update rule
DELETE /jingle-rules/:id         # Delete rule
```

**jingle-rotation.ts** - Rotation Engine:
```typescript
checkJingleRules(currentShowId?) => Promise<Jingle | null>
markJinglePlayed(jingleId: string) => Promise<void>
incrementTrackCount() => void
resetJingleRotation() => void
```

**auto-dj-helper.ts** - Auto DJ Integration:
```typescript
checkAndPlayJingle(autoDJState) => Promise<Jingle | null>
updateNowPlayingWithJingle(jingle) => Promise<void>
incrementMusicTrackCount() => void
```

### Frontend Components (`/src/app/components/admin/`)

**JinglesLibrary.tsx** - Main library view
- Grid/List view toggle
- Filter by category/active status
- Play/Preview functionality
- Quick active/inactive toggle
- Delete with confirmation

**JingleUpload.tsx** - Upload modal
- Drag-and-drop interface
- File validation (MP3/WAV/M4A, 10MB max)
- Metadata fields: title, description, category, priority, tags
- Auto-extract duration from audio
- Progress bar

**JingleAutomation.tsx** - Main automation interface
- 3 tabs: Presets, Rules Editor, Timeline
- Preset application logic
- Tab navigation

**AutomationPresets.tsx** - Quick-start templates
- 6 professional presets
- Expandable details
- One-click apply
- Auto-creates multiple rules

**JingleRuleEditor.tsx** - Manual rule creation
- Visual rule type selector
- Dynamic form fields
- Days of week picker
- Min gap configuration
- Rules list with toggle/delete

**JingleTimeline.tsx** - 24-hour schedule
- Hour-by-hour breakdown
- Day selector
- Event cards with details
- Category distribution stats
- Show/hide inactive rules

**jingle-categories.ts** - Category definitions
- 20+ categories with metadata
- Grouped by type
- Format presets
- Helper functions

## 📊 Data Structure

### Jingle Object
```typescript
{
  id: string
  title: string
  description: string
  fileUrl: string | null
  storageFilename: string
  storageBucket: 'make-06086aa3-jingles'
  duration: number  // in seconds
  category: string  // one of 20+ categories
  priority: number  // 1-10
  active: boolean
  playCount: number
  lastPlayed: string | null  // ISO timestamp
  tags: string[]
  createdAt: string
  createdBy: string
}
```

### Jingle Rule Object
```typescript
{
  id: string
  jingleId: string
  ruleType: 'interval' | 'time_based' | 'track_count' | 'show_based'
  intervalMinutes: number | null
  specificTimes: string[]  // ['09:00', '12:00']
  daysOfWeek: number[] | null  // [0-6] where 0=Sunday
  trackInterval: number | null
  showId: string | null
  position: 'before_track' | 'after_track' | 'between_tracks'
  minGapMinutes: number  // default 15
  active: boolean
  createdAt: string
  createdBy: string
}
```

## 🚀 Usage Examples

### Example 1: Station ID Every Hour
```typescript
// Rule Configuration
{
  ruleType: 'time_based',
  specificTimes: ['00:00'],  // Will trigger at XX:00 every hour
  daysOfWeek: null,  // All days
  minGapMinutes: 60,
  priority: 10  // Highest priority
}
```

### Example 2: Sweeper Every 4 Songs
```typescript
{
  ruleType: 'track_count',
  trackInterval: 4,
  minGapMinutes: 10,
  priority: 5
}
```

### Example 3: Morning Show Intro (Weekdays Only)
```typescript
{
  ruleType: 'time_based',
  specificTimes: ['06:00'],
  daysOfWeek: [1, 2, 3, 4, 5],  // Mon-Fri
  minGapMinutes: 1440,  // Once per day
  priority: 9
}
```

### Example 4: Traffic Report Bumper (Rush Hour)
```typescript
{
  ruleType: 'time_based',
  specificTimes: ['07:15', '07:45', '08:15', '08:45'],
  daysOfWeek: [1, 2, 3, 4, 5],  // Weekdays
  minGapMinutes: 30,
  priority: 8
}
```

## 🎛️ Priority System

### Priority Levels (1-10):
- **10** - Critical (Station ID, Emergency)
- **9** - Very High (Show intros/outros, Time checks)
- **7-8** - High (Sweepers, Traffic/Weather)
- **5-6** - Medium (Liners, Commercial bumpers)
- **3-4** - Low (Stingers, Drop-ins)
- **1-2** - Very Low (Technical fills)

### How Priority Works:
```
Final Priority = Rule Priority + Jingle Priority

Example:
- Rule: time_based (priority: 10)
- Jingle: Station ID (priority: 10)
- Final: 20 (highest possible)

vs.

- Rule: track_count (priority: 5)
- Jingle: Stinger (priority: 3)
- Final: 8 (lower, plays after higher priority)
```

## 📈 Best Practices

### 1. Hot Clock Planning
- Station ID: Top of every hour (00:00)
- Sweepers: :15, :30, :45 past hour
- Time checks: Every 30 minutes during drive times
- Liners: Every 10-15 minutes

### 2. Category Distribution
- **High frequency**: Sweepers, Stingers (every 2-5 songs)
- **Medium frequency**: Bumpers, Liners (every 5-10 songs)
- **Low frequency**: Station IDs, Time checks (hourly/scheduled)
- **Very low**: Show intros/outros, Holiday (as needed)

### 3. Minimum Gap Settings
- Station ID: 60 minutes
- Sweepers: 10-15 minutes
- Stingers: 5 minutes
- Time checks: 30 minutes
- Liners: 20 minutes

### 4. Upload Quality
- **Format**: MP3 (128-320 kbps) or WAV
- **Duration recommendations**:
  - Station ID: 3-5 seconds
  - Sweeper: 2-4 seconds
  - Bumper: 1-2 seconds
  - Stinger: 0.5-1 second
  - Liner: 3-6 seconds
  - Show intro/outro: 5-10 seconds

### 5. Preset Selection
- **Top 40/CHR**: Use "Top 40 High Energy" + "Commercial Automation"
- **AC/Smooth**: Use "Smooth & Minimal" + "Hot Clock Standard"
- **Talk Radio**: Use "Morning Drive Time" (adapt for all day)
- **Classic Hits**: Use "Hot Clock Standard" + custom rules

## 🔧 Integration with Auto DJ

The jingle system integrates seamlessly with Auto DJ:

1. **Before Each Track**: System checks if jingle should play
2. **Priority Evaluation**: Highest priority jingle wins
3. **Play Jingle**: If matched, plays jingle instead of next track
4. **Update State**: Marks jingle as played, updates counters
5. **Resume Music**: After jingle finishes, resumes normal rotation
6. **Now Playing**: Updates with jingle info (shows 🔔 icon)

## 🎨 UI Features

- **Color-coded categories** - Easy visual identification
- **Priority stars** - ★ rating system (1-10)
- **Grid/List views** - Flexible display options
- **Drag-and-drop upload** - Modern file handling
- **Real-time statistics** - Play counts, last played
- **Active/Inactive toggle** - One-click enable/disable
- **Timeline visualization** - See full day schedule
- **Preset recommendations** - Format-specific suggestions

## 🔒 Storage & Security

- **Jingles bucket**: `make-06086aa3-jingles` (private)
- **Max file size**: 10MB per jingle
- **Supported formats**: MP3, WAV, M4A
- **Auto-cleanup**: Deletes storage file when jingle deleted
- **Auth required**: All write operations require authentication

## 📱 Responsive Design

- **Mobile-friendly**: Works on phones, tablets, desktops
- **Touch-optimized**: Drag-and-drop on touch devices
- **Adaptive layout**: Grid adjusts to screen size
- **Scrollable tables**: Horizontal scroll on small screens

## 🎯 Coming Soon

Potential future enhancements:
- Bulk jingle import from ZIP
- Audio preview/playback in browser
- Advanced scheduling with calendar view
- A/B testing for jingle effectiveness
- Analytics: most played, best performance times
- Auto-categorization based on filename
- Voice synthesis for time announcements
- Integration with external jingle libraries

---

**Built with**: React, TypeScript, Tailwind CSS, Supabase
**Status**: ✅ Production Ready
**Version**: 1.0.0
