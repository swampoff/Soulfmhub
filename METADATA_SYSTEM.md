# 🎵 Automatic Metadata Extraction System

Soul FM Hub includes a sophisticated metadata extraction system that automatically processes audio files during upload.

## 🚀 Features

### ✅ Automatic ID3 Tag Extraction

When you upload an audio file, the system automatically extracts:

- **Title** - Song title from ID3 tags
- **Artist** - Performer/band name
- **Album** - Album name
- **Genre** - Music genre classification
- **Year** - Release year
- **BPM** - Beats per minute (if available)
- **Duration** - Precise track length in seconds

### 🎨 Smart Cover Art Retrieval

The system uses a **3-tier fallback strategy** to ensure every track has artwork:

1. **ID3 Embedded Cover** (Priority 1)
   - Extracts embedded album art from ID3 tags
   - Uploads to Supabase Storage
   - Best quality, instant availability

2. **MusicBrainz API Search** (Priority 2)
   - Queries MusicBrainz database by artist, title, and album
   - Fetches cover from Cover Art Archive
   - Downloads and re-uploads to local storage
   - Excellent for popular tracks

3. **Genre-based Default Cover** (Priority 3)
   - Genre-specific placeholder images from Unsplash
   - Maintains visual consistency
   - Available genres: Funk, Soul, Jazz, Blues, R&B, Disco, Electronic

### 📊 Optional Waveform Generation

Enable waveform generation to create visual audio data:

- **100 data points** representing normalized amplitude
- Useful for audio visualization components
- Adds ~2-3 seconds per track processing time
- Stored as array in track metadata

## 🔧 Technical Implementation

### Backend (`/supabase/functions/server/metadata-utils.ts`)

```typescript
// Extract complete metadata
const result = await extractCompleteMetadata(
  supabase,
  fileBuffer,
  mimeType,
  filename,
  {
    searchOnline: true,        // MusicBrainz search
    generateWaveform: false,   // Optional waveform
    waveformSamples: 100       // Number of samples
  }
);

// Returns:
// {
//   metadata: { title, artist, album, genre, year, duration, bpm },
//   coverUrl: string,
//   waveform?: number[]
// }
```

### Key Functions

1. **`extractMetadata()`** - Parse ID3 tags using `music-metadata` library
2. **`searchCoverArt()`** - Query MusicBrainz API and Cover Art Archive
3. **`generateWaveform()`** - Create normalized amplitude array
4. **`uploadCoverArt()`** - Upload cover to Supabase Storage
5. **`getDefaultCoverUrl()`** - Genre-based fallback covers

### Storage Structure

```
Supabase Storage Buckets:
├── make-06086aa3-tracks/     # Audio files
├── make-06086aa3-covers/     # Cover artwork
└── make-06086aa3-jingles/    # Jingle files
```

## 📝 Usage

### Frontend Upload

```typescript
// Enable waveform generation
const formData = new FormData();
formData.append('file', audioFile);
formData.append('generateWaveform', 'true');

await api.uploadTrackFile(formData);
```

### Track Object

```typescript
interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number;
  duration: number;
  bpm?: number;
  coverUrl: string;         // Auto-fetched
  waveform?: number[];      // Optional
  audioUrl: string;
  storageFilename: string;
  createdAt: string;
}
```

## 🎯 Supported Formats

- **MP3** - Most common format
- **WAV** - Uncompressed audio
- **M4A** - Apple AAC format
- **FLAC** - Lossless compression

## 🌐 External APIs

### MusicBrainz API

- **Base URL**: `https://musicbrainz.org/ws/2/`
- **Rate Limit**: 1 request/second (respected by system)
- **User-Agent**: `SoulFMHub/1.0.0 (niqbello@gmail.com)`
- **Documentation**: https://musicbrainz.org/doc/MusicBrainz_API

### Cover Art Archive

- **Base URL**: `https://coverartarchive.org/`
- **Format**: Direct image URLs (JPG/PNG)
- **Size**: 500px front covers
- **Documentation**: https://coverartarchive.org/doc/

## 🔍 Fallback Logic

### Filename Parsing

If ID3 tags are missing, the system tries to parse the filename:

```
Format: "Artist - Title.mp3"
Example: "James Brown - Get Up Offa That Thing.mp3"
Result: { artist: "James Brown", title: "Get Up Offa That Thing" }
```

### Duration Estimation

If metadata parsing fails, duration is estimated:

```typescript
estimatedDuration = fileSize / 16000; // For 128kbps MP3
```

## 💡 Best Practices

1. **Use Properly Tagged Files**
   - Ensure MP3s have complete ID3v2.3 or ID3v2.4 tags
   - Include embedded album art for best results
   - Use standard genre names (Funk, Soul, Jazz, etc.)

2. **File Naming Convention**
   - If tags are missing, use: `Artist - Title.mp3`
   - Helps fallback parsing work correctly

3. **Waveform Generation**
   - Enable for tracks you plan to visualize
   - Skip for bulk uploads to save time
   - Can be generated later if needed

4. **Cover Art Quality**
   - Embedded covers should be at least 500x500px
   - JPEG format recommended for file size
   - Square aspect ratio works best

## 🚦 Processing Flow

```
1. User uploads audio file
   ↓
2. File uploaded to Supabase Storage
   ↓
3. Parse ID3 tags (music-metadata library)
   ↓
4. Extract embedded cover art (if available)
   ├─→ Yes: Upload to covers bucket
   └─→ No: Search MusicBrainz API
       ├─→ Found: Download and upload
       └─→ Not found: Use genre default
   ↓
5. Generate waveform (if enabled)
   ↓
6. Save track metadata to KV store
   ↓
7. Return success with complete metadata
```

## 🔐 Security

- All uploaded files stored in **private buckets**
- Cover art in **public bucket** for fast CDN delivery
- Signed URLs generated for private audio streaming
- File type validation before processing
- Size limits enforced (configurable)

## 📊 Performance

- **ID3 Extraction**: ~50-100ms per file
- **Cover Extraction**: ~100-200ms if embedded
- **MusicBrainz Search**: ~500-1000ms per query
- **Waveform Generation**: ~2-3 seconds per file
- **Total Average**: 1-2 seconds without waveform, 3-5 seconds with

## 🎉 Example Output

```json
{
  "id": "track_1234567890",
  "title": "Get Up Offa That Thing",
  "artist": "James Brown",
  "album": "Get Up Offa That Thing",
  "genre": "Funk",
  "year": 1976,
  "duration": 222,
  "bpm": 115,
  "coverUrl": "https://xyz.supabase.co/storage/v1/object/public/covers/cover-123.jpg",
  "waveform": [0.2, 0.5, 0.8, 0.7, ...],
  "audioUrl": "https://xyz.supabase.co/storage/v1/object/public/tracks/track-123.mp3",
  "tags": ["NEWFUNK"],
  "createdAt": "2026-02-06T12:00:00Z"
}
```

---

Built with ❤️ for Soul FM Hub by the development team
