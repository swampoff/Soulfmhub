# Code Snippets - Key Changes

## 1. Import Statement (Line 3)
```typescript
// ADDED: ListMusic icon
import { Music, Plus, Search, Upload, Edit2, Trash2, Play, Pause, X, Filter, Download, Tag, CheckSquare, Square, ListMusic } from 'lucide-react';
```

## 2. New State Variables (Lines 41-42)
```typescript
const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
// NEW: State for playlist modal
const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
const [tracksToAddToPlaylist, setTracksToAddToPlaylist] = useState<string[]>([]);
```

## 3. New Handler Functions (Lines 106-120)
```typescript
// NEW: Function to open playlist modal with selected tracks
const handleAddToPlaylist = (trackIds: string[]) => {
  if (trackIds.length === 0) {
    toast.error('Please select at least one track');
    return;
  }
  setTracksToAddToPlaylist(trackIds);
  setIsAddToPlaylistModalOpen(true);
};

// NEW: Bulk add handler
const handleBulkAddToPlaylist = () => {
  if (selectedTrackIds.size === 0) {
    toast.error('Please select at least one track');
    return;
  }
  handleAddToPlaylist(Array.from(selectedTrackIds));
};
```

## 4. Bulk Action Button (Lines 168-176)
```tsx
{selectedTrackIds.size > 0 && (
  <>
    {/* NEW: Add to Playlist button for bulk operations */}
    <Button
      onClick={handleBulkAddToPlaylist}
      className="bg-[#00d9ff] text-[#0a1628] hover:bg-[#00b8dd]"
    >
      <ListMusic className="w-4 h-4 mr-2" />
      Add to Playlist ({selectedTrackIds.size})
    </Button>
    <Button
      onClick={handleBulkEditTags}
      className="bg-[#00ffaa] text-[#0a1628] hover:bg-[#00dd88]"
    >
      <Tag className="w-4 h-4 mr-2" />
      Edit Tags ({selectedTrackIds.size})
    </Button>
  </>
)}
```

## 5. Individual Track Action Button (Lines 375-383)
```tsx
<td className="p-4">
  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    {/* NEW: Add to playlist button */}
    <Button
      size="icon"
      variant="ghost"
      className="w-8 h-8 text-[#00d9ff] hover:bg-[#00d9ff]/10"
      onClick={() => handleAddToPlaylist([track.id])}
      title="Add to playlist"
    >
      <ListMusic className="w-3.5 h-3.5" />
    </Button>
    {/* Existing Edit button */}
    <Button
      size="icon"
      variant="ghost"
      className="w-8 h-8 text-blue-400 hover:bg-blue-400/10"
      onClick={() => handleEditTrack(track)}
    >
      <Edit2 className="w-3.5 h-3.5" />
    </Button>
    {/* Existing Delete button */}
    <Button
      size="icon"
      variant="ghost"
      className="w-8 h-8 text-red-400 hover:bg-red-400/10"
      onClick={() => handleDeleteTrack(track.id)}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  </div>
</td>
```

## 6. Modal Integration (Lines 451-463)
```tsx
{/* NEW: Add to Playlist Modal */}
<AddToPlaylistModal
  isOpen={isAddToPlaylistModalOpen}
  trackIds={tracksToAddToPlaylist}
  onClose={() => {
    setIsAddToPlaylistModalOpen(false);
    setTracksToAddToPlaylist([]);
  }}
  onSuccess={() => {
    setIsAddToPlaylistModalOpen(false);
    setTracksToAddToPlaylist([]);
    setSelectedTrackIds(new Set());
  }}
/>
```

## 7. AddToPlaylistModal Component (New, ~165 lines)

### Component Interface
```typescript
interface Playlist {
  id: string;
  name: string;
  description?: string;
}

function AddToPlaylistModal({ 
  isOpen, 
  trackIds, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  trackIds: string[]; 
  onClose: () => void; 
  onSuccess: () => void 
})
```

### State Management
```typescript
const [playlists, setPlaylists] = useState<Playlist[]>([]);
const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
```

### Load Playlists Effect
```typescript
useEffect(() => {
  if (isOpen) {
    loadPlaylists();
  }
}, [isOpen]);

const loadPlaylists = async () => {
  setLoading(true);
  try {
    const response = await api.getPlaylists();
    setPlaylists(response.playlists || []);
  } catch (error) {
    console.error('Error loading playlists:', error);
    toast.error('Failed to load playlists');
  } finally {
    setLoading(false);
  }
};
```

### Form Submission
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!selectedPlaylistId) {
    toast.error('Please select a playlist');
    return;
  }

  setSaving(true);
  try {
    // Add each track to the selected playlist
    for (const trackId of trackIds) {
      await api.addTrackToPlaylist(selectedPlaylistId, trackId, 'end');
    }
    
    toast.success(`Added ${trackIds.length} track${trackIds.length > 1 ? 's' : ''} to playlist`);
    onSuccess();
  } catch (error) {
    console.error('Error adding tracks to playlist:', error);
    toast.error('Failed to add tracks to playlist');
  } finally {
    setSaving(false);
  }
};
```

### Modal UI Structure
```tsx
<AnimatePresence>
  {isOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
      >
        <div className="bg-gradient-to-br from-[#0a1628] to-[#1a2845] border-2 border-[#00d9ff]/30 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-righteous text-white">Add to Playlist</h2>
            <button onClick={onClose}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Playlist Selection */}
            {loading ? (
              <div>Loading playlists...</div>
            ) : playlists.length === 0 ? (
              <div>No playlists found. Create a playlist first.</div>
            ) : (
              <select
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                required
              >
                <option value="">Select a playlist...</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving || !selectedPlaylistId || loading}>
                <ListMusic className="w-4 h-4 mr-2" />
                {saving ? 'Adding...' : 'Add to Playlist'}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

## Summary of Changes

### Lines Added: ~208
### Lines Modified: ~9
### New Components: 1 (AddToPlaylistModal)
### New Functions: 2 (handleAddToPlaylist, handleBulkAddToPlaylist)
### New State Variables: 2
### API Calls Used: 2 (getPlaylists, addTrackToPlaylist)

### Files Modified:
- `src/app/pages/admin/TracksManagement.tsx`

### Testing Checklist:
- [ ] Verify ListMusic icon displays correctly
- [ ] Test single track "Add to Playlist" button
- [ ] Test bulk "Add to Playlist" with multiple selections
- [ ] Verify modal opens and closes correctly
- [ ] Test playlist loading in modal
- [ ] Verify track addition to playlist
- [ ] Test error handling (no playlists, network errors)
- [ ] Verify success/error toast notifications
- [ ] Check responsive design on mobile devices
- [ ] Test keyboard navigation and accessibility
