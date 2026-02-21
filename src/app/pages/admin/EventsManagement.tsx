import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  MapPin,
  Clock,
  Users,
  Star,
  Ticket,
  Music,
  Radio,
  Mic2,
  PartyPopper,
  RefreshCw,
  ExternalLink,
  Eye,
  StarOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { toast } from 'sonner';

type EventCategory = 'live' | 'virtual' | 'workshop' | 'festival';
type EventStatus = 'upcoming' | 'live' | 'past';

interface SoulEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  category: EventCategory;
  image?: string;
  artists: string[];
  isFeatured: boolean;
  isFree: boolean;
  price?: string;
  status: EventStatus;
  attendees: number;
  ticketUrl?: string;
  createdAt?: string;
}

const CATEGORY_OPTIONS: { id: EventCategory; label: string; icon: React.ElementType }[] = [
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'virtual', label: 'Virtual', icon: Music },
  { id: 'workshop', label: 'Workshop', icon: Mic2 },
  { id: 'festival', label: 'Festival', icon: PartyPopper },
];

const STATUS_OPTIONS: EventStatus[] = ['upcoming', 'live', 'past'];

const emptyEvent: Omit<SoulEvent, 'id'> = {
  title: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  time: '20:00',
  venue: '',
  location: '',
  category: 'live',
  artists: [],
  isFeatured: false,
  isFree: true,
  price: '',
  status: 'upcoming',
  attendees: 0,
  ticketUrl: '',
  image: '',
};

export function EventsManagement() {
  const [events, setEvents] = useState<SoulEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<SoulEvent, 'id'>>(emptyEvent);
  const [artistInput, setArtistInput] = useState('');
  const [filter, setFilter] = useState<'all' | EventCategory>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { events: data } = await api.getEvents();
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Event title is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { event } = await api.updateEvent(editingId, form);
        setEvents(prev => prev.map(e => e.id === editingId ? event : e));
        toast.success('Event updated');
      } else {
        const { event } = await api.createEvent(form);
        setEvents(prev => [...prev, event]);
        toast.success('Event created');
      }
      resetForm();
    } catch (error: any) {
      console.error('Save event error:', error);
      toast.error(error.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success('Event deleted');
      if (editingId === id) resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete event');
    }
  };

  const handleEdit = (event: SoulEvent) => {
    setForm({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      venue: event.venue,
      location: event.location,
      category: event.category,
      artists: event.artists || [],
      isFeatured: event.isFeatured,
      isFree: event.isFree,
      price: event.price || '',
      status: event.status,
      attendees: event.attendees || 0,
      ticketUrl: event.ticketUrl || '',
      image: event.image || '',
    });
    setEditingId(event.id);
    setShowForm(true);
  };

  const toggleFeatured = async (event: SoulEvent) => {
    try {
      const { event: updated } = await api.updateEvent(event.id, { isFeatured: !event.isFeatured });
      setEvents(prev => prev.map(e => e.id === event.id ? updated : e));
      toast.success(updated.isFeatured ? 'Marked as featured' : 'Removed from featured');
    } catch (error: any) {
      toast.error('Failed to update');
    }
  };

  const resetForm = () => {
    setForm(emptyEvent);
    setEditingId(null);
    setShowForm(false);
    setArtistInput('');
  };

  const addArtist = () => {
    const trimmed = artistInput.trim();
    if (trimmed && !form.artists.includes(trimmed)) {
      setForm(prev => ({ ...prev, artists: [...prev.artists, trimmed] }));
      setArtistInput('');
    }
  };

  const removeArtist = (artist: string) => {
    setForm(prev => ({ ...prev, artists: prev.artists.filter(a => a !== artist) }));
  };

  const filteredEvents = events.filter(e => {
    const matchesFilter = filter === 'all' || e.category === filter;
    const matchesSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getCategoryIcon = (cat: EventCategory) => {
    const found = CATEGORY_OPTIONS.find(c => c.id === cat);
    return found ? found.icon : Calendar;
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'live': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'upcoming': return 'bg-[#00ffaa]/20 text-[#00ffaa] border-[#00ffaa]/30';
      case 'past': return 'bg-white/10 text-white/40 border-white/10';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/10">
                <Calendar className="w-6 h-6 text-[#00d9ff]" />
              </div>
              Events Management
            </h1>
            <p className="text-white/50 text-sm mt-1">{events.length} events total</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadEvents}
              className="border-white/10 text-white/60 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold"
            >
              <Plus className="w-4 h-4 mr-1" /> New Event
            </Button>
          </div>
        </div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">
                    {editingId ? 'Edit Event' : 'Create New Event'}
                  </h2>
                  <Button size="icon" variant="ghost" onClick={resetForm} className="text-white/50 hover:text-white">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="text-sm text-white/60 mb-1 block">Title *</label>
                    <Input
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Event title"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="text-sm text-white/60 mb-1 block">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Event description..."
                      rows={3}
                      className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d9ff]"
                    />
                  </div>

                  {/* Date & Time */}
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Date</label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Time</label>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  {/* Venue & Location */}
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Venue</label>
                    <Input
                      value={form.venue}
                      onChange={e => setForm(p => ({ ...p, venue: e.target.value }))}
                      placeholder="Venue name"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Location</label>
                    <Input
                      value={form.location}
                      onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                      placeholder="City, Country"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  {/* Category & Status */}
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Category</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value as EventCategory }))}
                      className="w-full h-10 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d9ff]"
                    >
                      {CATEGORY_OPTIONS.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#0a0a0a]">{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value as EventStatus }))}
                      className="w-full h-10 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#00d9ff]"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s} className="bg-[#0a0a0a]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="text-sm text-white/60 mb-1 block">Price</label>
                      <Input
                        value={form.isFree ? '' : (form.price || '')}
                        onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                        placeholder="$25"
                        disabled={form.isFree}
                        className="bg-white/5 border-white/10 text-white disabled:opacity-40"
                      />
                    </div>
                    <label className="flex items-center gap-2 pb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isFree}
                        onChange={e => setForm(p => ({ ...p, isFree: e.target.checked, price: e.target.checked ? '' : p.price }))}
                        className="w-4 h-4 rounded border-white/20 accent-[#00ffaa]"
                      />
                      <span className="text-sm text-white/60">Free</span>
                    </label>
                  </div>

                  {/* Attendees */}
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Attendees / Interested</label>
                    <Input
                      type="number"
                      value={form.attendees}
                      onChange={e => setForm(p => ({ ...p, attendees: parseInt(e.target.value) || 0 }))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  {/* Ticket URL */}
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Ticket URL</label>
                    <Input
                      value={form.ticketUrl || ''}
                      onChange={e => setForm(p => ({ ...p, ticketUrl: e.target.value }))}
                      placeholder="https://..."
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Image URL</label>
                    <Input
                      value={form.image || ''}
                      onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
                      placeholder="https://..."
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  {/* Featured toggle */}
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={e => setForm(p => ({ ...p, isFeatured: e.target.checked }))}
                        className="w-4 h-4 rounded border-white/20 accent-[#FFD700]"
                      />
                      <Star className="w-4 h-4 text-[#FFD700]" />
                      <span className="text-sm text-white/60">Featured Event</span>
                    </label>
                  </div>

                  {/* Artists */}
                  <div className="md:col-span-2">
                    <label className="text-sm text-white/60 mb-1 block">Artists / Performers</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={artistInput}
                        onChange={e => setArtistInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addArtist(); } }}
                        placeholder="Add artist name..."
                        className="bg-white/5 border-white/10 text-white"
                      />
                      <Button size="sm" variant="outline" onClick={addArtist} className="border-white/10 text-white/60">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.artists.map(a => (
                        <Badge
                          key={a}
                          variant="outline"
                          className="text-white/70 border-white/20 gap-1 cursor-pointer hover:border-red-400/50 hover:text-red-400"
                          onClick={() => removeArtist(a)}
                        >
                          {a}
                          <X className="w-3 h-3" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-6 pt-4 border-t border-white/5">
                  <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    {editingId ? 'Update Event' : 'Create Event'}
                  </Button>
                  <Button variant="outline" onClick={resetForm} className="border-white/10 text-white/60">
                    Cancel
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events..."
            className="bg-white/5 border-white/10 text-white sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-[#00d9ff] text-slate-900' : 'border-white/10 text-white/50'}
            >
              All ({events.length})
            </Button>
            {CATEGORY_OPTIONS.map(c => {
              const count = events.filter(e => e.category === c.id).length;
              const Icon = c.icon;
              return (
                <Button
                  key={c.id}
                  size="sm"
                  variant={filter === c.id ? 'default' : 'outline'}
                  onClick={() => setFilter(c.id)}
                  className={filter === c.id ? 'bg-[#00d9ff] text-slate-900' : 'border-white/10 text-white/50'}
                >
                  <Icon className="w-3.5 h-3.5 mr-1" />
                  {c.label} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Events Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#00d9ff] animate-spin" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card className="p-12 bg-white/5 border-white/10 text-center">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 mb-2">No events found</p>
            <p className="text-white/30 text-sm">
              {events.length === 0
                ? 'Create your first event to get started.'
                : 'Try adjusting your search or filter.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const CatIcon = getCategoryIcon(event.category);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layout
                >
                  <Card className="bg-white/5 border-white/10 p-4 hover:bg-white/[0.07] transition-all">
                    <div className="flex items-start gap-4">
                      {/* Date block */}
                      <div className="hidden sm:flex flex-shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/10 flex-col items-center justify-center border border-[#00d9ff]/20">
                        <span className="text-[10px] text-[#00d9ff] uppercase font-bold">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-white leading-tight">
                          {new Date(event.date).getDate()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-bold text-white truncate">{event.title}</h3>
                          {event.isFeatured && (
                            <Star className="w-4 h-4 text-[#FFD700] flex-shrink-0" fill="#FFD700" />
                          )}
                          <Badge className={`text-[10px] ${getStatusColor(event.status)}`}>
                            {event.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] text-white/40 border-white/10 gap-1">
                            <CatIcon className="w-3 h-3" />
                            {event.category}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {event.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {event.venue || 'TBD'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {event.attendees}
                          </span>
                          {event.isFree ? (
                            <span className="text-[#00ffaa] font-medium">FREE</span>
                          ) : event.price ? (
                            <span className="flex items-center gap-1">
                              <Ticket className="w-3 h-3" /> {event.price}
                            </span>
                          ) : null}
                        </div>
                        {(event.artists || []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {event.artists.slice(0, 4).map(a => (
                              <span key={a} className="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded">{a}</span>
                            ))}
                            {event.artists.length > 4 && (
                              <span className="text-[10px] text-white/30">+{event.artists.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleFeatured(event)}
                          className="text-white/30 hover:text-[#FFD700]"
                          title={event.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                        >
                          {event.isFeatured ? (
                            <Star className="w-4 h-4 text-[#FFD700]" fill="#FFD700" />
                          ) : (
                            <StarOff className="w-4 h-4" />
                          )}
                        </Button>
                        {event.ticketUrl && (
                          <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="text-white/30 hover:text-[#00d9ff]">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(event)}
                          className="text-white/30 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(event.id)}
                          className="text-white/30 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
