import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Search, Trash2, Play, Pause, ListPlus, Check, Plus, X, RefreshCw, Upload } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { toast } from 'sonner';
import { API_BASE } from '../../../lib/supabase';
import { getAuthHeaders } from '../../../lib/api';

const AZURA_BASE = 'http://187.77.85.42';

interface UploadingFile {
  name: string;
  progress: number; // 0-100, -1 = error
  done: boolean;
  error?: string;
}

// ── Types ──────────────────────────────────────────────────────────────
interface AzuraTrack {
  id: number;
  unique_id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  length: number;
  length_text: string;
  art: string;
  path: string;
  playlists: { id: number; name: string }[];
}

interface AzuraPlaylist {
  id: number;
  name: string;
  short_name: string;
  is_enabled: boolean;
  num_songs: number;
}

// ── API helpers ────────────────────────────────────────────────────────
async function azFetch(path: string, init?: RequestInit) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/azuracast${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Main Component ─────────────────────────────────────────────────────
export function TracksManagement() {
  const [tracks, setTracks] = useState<AzuraTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<AzuraTrack | null>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await azFetch('/tracks');
      setTracks(data.rows || []);
    } catch (e: any) {
      toast.error('Ошибка загрузки: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTracks(); }, [loadTracks]);

  const handleDelete = async (track: AzuraTrack) => {
    if (!confirm(`Удалить "${track.artist} — ${track.title}" из AzuraCast?`)) return;
    try {
      await azFetch(`/tracks/${track.id}`, { method: 'DELETE' });
      setTracks(t => t.filter(x => x.id !== track.id));
      toast.success('Трек удалён');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    }
  };

  const uploadFiles = async (files: File[]) => {
    const audioFiles = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|flac|aac|ogg|wav|m4a)$/i.test(f.name));
    if (!audioFiles.length) { toast.error('Только аудио файлы'); return; }

    const authHeaders = await getAuthHeaders();
    const newItems: UploadingFile[] = audioFiles.map(f => ({ name: f.name, progress: 0, done: false }));
    setUploading(prev => [...prev, ...newItems]);

    await Promise.all(audioFiles.map(async (file, i) => {
      const idx = (uploading.length) + i; // position in state - we use name as key instead
      const update = (patch: Partial<UploadingFile>) =>
        setUploading(prev => prev.map(u => u.name === file.name ? { ...u, ...patch } : u));

      try {
        update({ progress: 10 });
        const fd = new FormData();
        fd.append('file', file, file.name);

        const res = await fetch(`${API_BASE}/azuracast/upload`, {
          method: 'POST',
          headers: authHeaders,
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        update({ progress: 100, done: true });
        toast.success(`Загружен: ${file.name}`);
      } catch (e: any) {
        update({ progress: -1, error: e.message });
        toast.error(`Ошибка: ${file.name} — ${e.message}`);
      }
    }));

    // Refresh track list after uploads
    await loadTracks();
    // Clear completed after 3s
    setTimeout(() => setUploading(prev => prev.filter(u => !u.done)), 3000);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const filtered = tracks.filter(t => {
    const q = search.toLowerCase();
    return !q || t.title?.toLowerCase().includes(q) || t.artist?.toLowerCase().includes(q) || t.album?.toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-righteous text-white mb-1">Треки</h1>
            <p className="text-white/50 text-sm">AzuraCast · {tracks.length} треков</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={loadTracks} variant="outline"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button onClick={() => fileInputRef.current?.click()}
              className="bg-[#00d9ff]/10 border border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/20">
              <Upload className="w-4 h-4 mr-2" />
              Загрузить треки
            </Button>
            <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.flac,.aac,.ogg,.wav,.m4a"
              multiple className="hidden" onChange={handleFileInput} />
          </div>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40" />
          </div>
        </motion.div>

        {/* Upload progress */}
        <AnimatePresence>
          {uploading.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-2">
              {uploading.map((u) => (
                <div key={u.name} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white/80 text-sm truncate mb-1">{u.name}</div>
                    {u.progress >= 0 ? (
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#00d9ff] transition-all duration-300"
                          style={{ width: `${u.progress}%` }} />
                      </div>
                    ) : (
                      <div className="text-red-400 text-xs">{u.error}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-white/40">
                    {u.done ? <Check className="w-4 h-4 text-[#00ffaa]" /> : u.progress < 0 ? <X className="w-4 h-4 text-red-400" /> : `${u.progress}%`}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card
            className={`bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden transition-colors ${dragOver ? 'border-[#00d9ff]/60 bg-[#00d9ff]/5' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}>
            {loading ? (
              <div className="flex items-center justify-center py-20 text-white/50">
                <RefreshCw className="w-6 h-6 animate-spin mr-3" />
                Загрузка из AzuraCast...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{search ? 'Ничего не найдено' : 'Нет треков'}</p>
                {!search && (
                  <Button onClick={() => fileInputRef.current?.click()}
                    className="mt-4 bg-[#00d9ff]/10 border border-[#00d9ff]/30 text-[#00d9ff]">
                    <Upload className="w-4 h-4 mr-2" /> Загрузить треки
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="text-left text-white/50 text-xs font-semibold p-4 w-10">#</th>
                      <th className="text-left text-white/50 text-xs font-semibold p-4">Трек</th>
                      <th className="text-left text-white/50 text-xs font-semibold p-4 hidden md:table-cell">Альбом</th>
                      <th className="text-left text-white/50 text-xs font-semibold p-4 hidden lg:table-cell">Плейлисты</th>
                      <th className="text-left text-white/50 text-xs font-semibold p-4 w-16">Дл.</th>
                      <th className="text-white/50 text-xs font-semibold p-4 w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((track, idx) => (
                      <motion.tr key={track.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.008 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="p-4 text-white/30 text-sm">{idx + 1}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {track.art ? (
                              <img src={track.art} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 flex items-center justify-center shrink-0">
                                <Music className="w-5 h-5 text-[#00d9ff]" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-white font-semibold text-sm truncate">{track.title || track.path}</div>
                              <div className="text-white/50 text-xs truncate">{track.artist}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-white/50 text-sm hidden md:table-cell truncate max-w-[140px]">
                          {track.album || '—'}
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {track.playlists?.filter(p => p.name !== 'default').length > 0
                              ? track.playlists.filter(p => p.name !== 'default').map(pl => (
                                <span key={pl.id} className="px-2 py-0.5 rounded text-xs bg-[#00d9ff]/20 text-[#00d9ff]">
                                  {pl.name}
                                </span>
                              ))
                              : <span className="text-white/20 text-xs">—</span>
                            }
                          </div>
                        </td>
                        <td className="p-4 text-white/50 font-mono text-sm">{track.length_text}</td>
                        <td className="p-4">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost"
                              className="w-8 h-8 text-[#00d9ff] hover:bg-[#00d9ff]/10"
                              onClick={() => setPlayingId(playingId === track.id ? null : track.id)}>
                              {playingId === track.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" title="Добавить в плейлист"
                              className="w-8 h-8 text-[#00ffaa] hover:bg-[#00ffaa]/10"
                              onClick={() => setAddToPlaylistTrack(track)}>
                              <ListPlus className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost"
                              className="w-8 h-8 text-red-400 hover:bg-red-400/10"
                              onClick={() => handleDelete(track)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Hidden audio player */}
        {playingId !== null && (
          <audio key={playingId} autoPlay
            src={`${AZURA_BASE}/api/station/1/file/${playingId}/play`}
            onEnded={() => setPlayingId(null)}
          />
        )}

        {/* Add to playlist modal */}
        {addToPlaylistTrack && (
          <AddToPlaylistModal
            track={addToPlaylistTrack}
            onClose={() => { setAddToPlaylistTrack(null); loadTracks(); }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// ── Add to Playlist Modal ──────────────────────────────────────────────
function AddToPlaylistModal({ track, onClose }: { track: AzuraTrack; onClose: () => void }) {
  const [playlists, setPlaylists] = useState<AzuraPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());

  useEffect(() => {
    azFetch('/playlists')
      .then(data => setPlaylists(Array.isArray(data) ? data : []))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const alreadyIn = new Set(track.playlists?.map(p => p.id) || []);

  const handleAdd = async (pl: AzuraPlaylist) => {
    if (done.has(pl.id) || alreadyIn.has(pl.id)) return;
    setSaving(pl.id);
    try {
      const headers = await getAuthHeaders();
      // Get current file IDs in the playlist, add this track
      const plData = await fetch(`${API_BASE}/azuracast/playlists`, { headers }).then(r => r.json());
      const fullPl = (Array.isArray(plData) ? plData : []).find((p: any) => p.id === pl.id);
      // AzuraCast: assign files to playlist via PUT /playlist/:id/files
      // We just add this file ID to the playlist
      const r = await fetch(`${API_BASE}/azuracast/playlists/${pl.id}/tracks`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ trackIds: [track.id] }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      setDone(s => new Set(s).add(pl.id));
      toast.success(`Добавлено в «${pl.name}»`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0a1628] rounded-xl border border-[#00ffaa]/30 shadow-2xl z-50 max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-[#00ffaa]" /> Добавить в плейлист
            </h2>
            <p className="text-white/40 text-sm truncate mt-1">{track.artist} — {track.title}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-white/50 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="overflow-y-auto flex-1 p-3">
          {loading ? (
            <div className="text-center py-8 text-white/40">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Загрузка...
            </div>
          ) : playlists.filter(p => p.name !== 'default').length === 0 ? (
            <div className="text-center py-8 text-white/40">Нет плейлистов</div>
          ) : (
            <div className="space-y-1.5">
              {playlists.filter(p => p.name !== 'default').map(pl => {
                const isIn = alreadyIn.has(pl.id) || done.has(pl.id);
                const isLoading = saving === pl.id;
                return (
                  <button key={pl.id} onClick={() => handleAdd(pl)}
                    disabled={isLoading || isIn}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all
                      ${isIn ? 'bg-[#00ffaa]/10 border-[#00ffaa]/30 cursor-default' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${pl.is_enabled ? 'bg-green-400' : 'bg-white/20'}`} />
                      <span className="text-white text-sm font-medium truncate">{pl.name}</span>
                      <span className="text-white/30 text-xs shrink-0">{pl.num_songs} тр.</span>
                    </div>
                    <div className="shrink-0 ml-2">
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-[#00ffaa]/40 border-t-[#00ffaa] rounded-full animate-spin" />
                      ) : isIn ? (
                        <Check className="w-4 h-4 text-[#00ffaa]" />
                      ) : (
                        <Plus className="w-4 h-4 text-white/40" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
