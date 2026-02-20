import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { ListMusic, Plus, Trash2, Music, RefreshCw, X, Play, Zap, ZapOff, Search, ChevronRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { API_BASE } from '../../../lib/supabase';
import { getAuthHeaders } from '../../../lib/api';

const AZURACAST_URL = 'http://187.77.85.42';

// ── Types ──────────────────────────────────────────────────────────────
interface AzuraPlaylist {
  id: number;
  name: string;
  short_name: string;
  is_enabled: boolean;
  num_songs: number;
  total_length: number;
  type: string;
  source: string;
  order: string;
  weight: number;
  schedule_items?: { start_time: number; end_time: number; days: number[] }[];
}

interface AzuraTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  length_text: string;
  art: string;
  path: string;
}

// ── API helper ─────────────────────────────────────────────────────────
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

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

// ── Main Component ─────────────────────────────────────────────────────
export function PlaylistsManagement() {
  const [playlists, setPlaylists] = useState<AzuraPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<AzuraPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<AzuraTrack[]>([]);
  const [allTracks, setAllTracks] = useState<AzuraTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await azFetch('/playlists');
      const list = (Array.isArray(data) ? data : []).filter((p: AzuraPlaylist) => p.name !== 'default');
      setPlaylists(list);
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlaylists(); }, [loadPlaylists]);

  const openPlaylist = async (pl: AzuraPlaylist) => {
    setSelectedPlaylist(pl);
    setPlaylistTracks([]);
    setAllTracks([]);
    setTracksLoading(true);
    setAddSearch('');
    try {
      // Load all tracks to show what can be added
      const [tracksData] = await Promise.all([
        azFetch('/tracks'),
      ]);
      const all: AzuraTrack[] = tracksData.rows || [];
      setAllTracks(all);
      // Tracks in this playlist = those with this playlist in their playlists array
      const inPlaylist = all.filter(t =>
        (t as any).playlists?.some((p: any) => p.id === pl.id)
      );
      setPlaylistTracks(inPlaylist);
    } catch (e: any) {
      toast.error('Ошибка загрузки: ' + e.message);
    } finally {
      setTracksLoading(false);
    }
  };

  const handleToggle = async (pl: AzuraPlaylist, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await azFetch(`/playlists/${pl.id}/toggle`, { method: 'POST' });
      setPlaylists(list => list.map(p => p.id === pl.id ? { ...p, is_enabled: !p.is_enabled } : p));
      if (selectedPlaylist?.id === pl.id) {
        setSelectedPlaylist(prev => prev ? { ...prev, is_enabled: !prev.is_enabled } : null);
      }
      toast.success(pl.is_enabled ? 'Плейлист отключён' : 'Плейлист включён');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    }
  };

  const handleDelete = async (pl: AzuraPlaylist, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Удалить плейлист «${pl.name}»?`)) return;
    try {
      await azFetch(`/playlists/${pl.id}`, { method: 'DELETE' });
      setPlaylists(list => list.filter(p => p.id !== pl.id));
      if (selectedPlaylist?.id === pl.id) setSelectedPlaylist(null);
      toast.success('Плейлист удалён');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const data = await azFetch('/playlists', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          type: 'default',
          source: 'songs',
          order: 'shuffle',
          is_enabled: true,
          weight: 3,
          avoid_duplicates: true,
          include_in_requests: true,
          include_in_on_demand: false,
        }),
      });
      setPlaylists(list => [...list, data]);
      setNewName('');
      setIsCreateOpen(false);
      toast.success(`Плейлист «${data.name}» создан`);
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveTrack = async (track: AzuraTrack) => {
    if (!selectedPlaylist) return;
    try {
      // Get current track IDs in playlist, remove this one
      const newIds = playlistTracks.filter(t => t.id !== track.id).map(t => t.id);
      await azFetch(`/playlists/${selectedPlaylist.id}/tracks`, {
        method: 'PUT',
        body: JSON.stringify({ trackIds: newIds }),
      });
      setPlaylistTracks(list => list.filter(t => t.id !== track.id));
      setPlaylists(list => list.map(p => p.id === selectedPlaylist.id
        ? { ...p, num_songs: p.num_songs - 1 } : p));
      toast.success('Трек удалён из плейлиста');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    }
  };

  const handleAddTrack = async (track: AzuraTrack) => {
    if (!selectedPlaylist) return;
    if (playlistTracks.find(t => t.id === track.id)) {
      toast.info('Уже в плейлисте');
      return;
    }
    try {
      const newIds = [...playlistTracks.map(t => t.id), track.id];
      await azFetch(`/playlists/${selectedPlaylist.id}/tracks`, {
        method: 'PUT',
        body: JSON.stringify({ trackIds: newIds }),
      });
      setPlaylistTracks(list => [...list, track]);
      setPlaylists(list => list.map(p => p.id === selectedPlaylist.id
        ? { ...p, num_songs: p.num_songs + 1 } : p));
      toast.success(`«${track.title}» добавлен`);
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    }
  };

  const filteredPlaylists = playlists.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const tracksNotInPlaylist = allTracks.filter(t =>
    !playlistTracks.find(pt => pt.id === t.id) &&
    (!addSearch || t.title?.toLowerCase().includes(addSearch.toLowerCase()) ||
      t.artist?.toLowerCase().includes(addSearch.toLowerCase()))
  );

  // ── Playlist detail view ──────────────────────────────────────────────
  if (selectedPlaylist) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 flex-wrap">
            <Button variant="ghost" onClick={() => setSelectedPlaylist(null)}
              className="text-white/60 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Назад
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-righteous text-white">{selectedPlaylist.name}</h1>
              <p className="text-white/40 text-sm">
                {selectedPlaylist.num_songs} треков · {formatDuration(selectedPlaylist.total_length)} ·
                <span className={`ml-2 ${selectedPlaylist.is_enabled ? 'text-green-400' : 'text-white/30'}`}>
                  {selectedPlaylist.is_enabled ? 'Активен' : 'Отключён'}
                </span>
              </p>
            </div>
            <Button onClick={e => handleToggle(selectedPlaylist, e)}
              className={selectedPlaylist.is_enabled
                ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'}>
              {selectedPlaylist.is_enabled
                ? <><ZapOff className="w-4 h-4 mr-2" />Отключить</>
                : <><Zap className="w-4 h-4 mr-2" />Включить</>}
            </Button>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tracks in playlist */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#00d9ff]" />
                  Треки в плейлисте ({playlistTracks.length})
                </h2>
              </div>
              {tracksLoading ? (
                <div className="flex items-center justify-center py-12 text-white/40">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Загрузка...
                </div>
              ) : playlistTracks.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <Music className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Плейлист пуст</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[500px]">
                  {playlistTracks.map(track => (
                    <div key={track.id} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0">
                      {track.art ? (
                        <img src={track.art} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-[#00d9ff]/10 flex items-center justify-center shrink-0">
                          <Music className="w-4 h-4 text-[#00d9ff]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{track.title || track.path}</div>
                        <div className="text-white/40 text-xs truncate">{track.artist}</div>
                      </div>
                      <span className="text-white/30 text-xs font-mono shrink-0">{track.length_text}</span>
                      <Button size="icon" variant="ghost"
                        className="w-7 h-7 text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemoveTrack(track)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Add tracks */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-semibold flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-[#00ffaa]" />
                  Добавить треки
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input value={addSearch} onChange={e => setAddSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-white/30 h-8 text-sm" />
                </div>
              </div>
              <div className="overflow-y-auto max-h-[500px]">
                {tracksNotInPlaylist.length === 0 ? (
                  <div className="text-center py-12 text-white/30 text-sm">Все треки уже в плейлисте</div>
                ) : (
                  tracksNotInPlaylist.map(track => (
                    <button key={track.id}
                      onClick={() => handleAddTrack(track)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0">
                      {track.art ? (
                        <img src={track.art} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-[#00ffaa]/10 flex items-center justify-center shrink-0">
                          <Music className="w-4 h-4 text-[#00ffaa]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{track.title || track.path}</div>
                        <div className="text-white/40 text-xs truncate">{track.artist}</div>
                      </div>
                      <Plus className="w-4 h-4 text-[#00ffaa]/50 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Playlists list view ────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-righteous text-white mb-1">Плейлисты</h1>
            <p className="text-white/50 text-sm">AzuraCast · {playlists.length} плейлистов</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadPlaylists} variant="outline"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Создать
            </Button>
            <Button onClick={() => window.open(`${AZURACAST_URL}/station/soul_fm_/playlists`, '_blank')}
              variant="outline" className="bg-white/5 border-white/20 text-white/60 hover:bg-white/10">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск плейлиста..."
            className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40" />
        </div>

        {/* Playlists Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/50">
            <RefreshCw className="w-6 h-6 animate-spin mr-3" /> Загрузка из AzuraCast...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlaylists.map((pl, idx) => (
              <motion.div key={pl.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}>
                <Card
                  onClick={() => openPlaylist(pl)}
                  className="bg-white/10 backdrop-blur-sm border-white/20 p-5 cursor-pointer hover:bg-white/15 transition-all hover:border-white/30 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${pl.is_enabled ? 'bg-green-400' : 'bg-white/20'}`} />
                      <h3 className="text-white font-semibold truncate">{pl.name}</h3>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <button
                        onClick={e => handleToggle(pl, e)}
                        className={`w-7 h-7 rounded flex items-center justify-center transition-colors
                          ${pl.is_enabled ? 'text-green-400 hover:bg-green-400/10' : 'text-white/30 hover:bg-white/10'}`}
                        title={pl.is_enabled ? 'Отключить' : 'Включить'}>
                        {pl.is_enabled ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={e => handleDelete(pl, e)}
                        className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">{pl.num_songs} треков</span>
                    <div className="flex items-center gap-1 text-white/30 group-hover:text-white/60 transition-colors">
                      <span className="text-xs">Открыть</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  {pl.total_length > 0 && (
                    <div className="text-white/30 text-xs mt-1">{formatDuration(pl.total_length)}</div>
                  )}
                  {pl.schedule_items && pl.schedule_items.length > 0 && (
                    <div className="text-[#00d9ff]/50 text-xs mt-2">
                      По расписанию
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create modal */}
        <AnimatePresence>
          {isCreateOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                onClick={() => setIsCreateOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#0a1628] rounded-xl border border-[#00d9ff]/30 shadow-2xl z-50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-white">Новый плейлист</h2>
                  <Button size="icon" variant="ghost" onClick={() => setIsCreateOpen(false)}
                    className="text-white/50 hover:text-white">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white mb-2 block">Название</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreate()}
                      placeholder="Soul Classics, Funk Mix..."
                      className="bg-white/5 border-white/20 text-white" autoFocus />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10">
                      Отмена
                    </Button>
                    <Button onClick={handleCreate} disabled={creating || !newName.trim()}
                      className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628]">
                      {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Создать'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
