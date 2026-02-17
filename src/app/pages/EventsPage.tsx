import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Music,
  Users,
  Star,
  ChevronRight,
  Filter,
  ExternalLink,
  Mic2,
  Radio,
  PartyPopper,
} from 'lucide-react';
import { motion } from 'motion/react';

type EventCategory = 'all' | 'live' | 'virtual' | 'workshop' | 'festival';

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
  status: 'upcoming' | 'live' | 'past';
  attendees: number;
}

const EVENTS: SoulEvent[] = [
  {
    id: '1',
    title: 'Soul FM Live: Midnight Groove Session',
    description: 'An unforgettable night of live soul, funk and R&B. Join our DJs for a midnight session you won\'t forget.',
    date: '2026-03-15',
    time: '10:00 PM',
    venue: 'The Blue Note Lounge',
    location: 'Miami Beach, FL',
    category: 'live',
    artists: ['DJ SoulWave', 'MC Rhythmic', 'The Groove Collective'],
    isFeatured: true,
    isFree: false,
    price: '$25',
    status: 'upcoming',
    attendees: 342,
  },
  {
    id: '2',
    title: 'Virtual Vinyl Night: Rare Soul Cuts',
    description: 'Stream with us as we spin rare vinyl cuts from the golden era of soul music. Interactive chat and Q&A.',
    date: '2026-03-08',
    time: '8:00 PM',
    venue: 'Soul FM Studio (Online)',
    location: 'Virtual Event',
    category: 'virtual',
    artists: ['DJ Heritage', 'Professor Funk'],
    isFeatured: false,
    isFree: true,
    status: 'upcoming',
    attendees: 1250,
  },
  {
    id: '3',
    title: 'Beat Making Workshop',
    description: 'Learn the art of producing soul-inspired beats. Bring your laptop and headphones.',
    date: '2026-03-22',
    time: '2:00 PM',
    venue: 'Soul FM Creative Hub',
    location: 'Miami, FL',
    category: 'workshop',
    artists: ['Producer X', 'Synthia Keys'],
    isFeatured: false,
    isFree: false,
    price: '$40',
    status: 'upcoming',
    attendees: 28,
  },
  {
    id: '4',
    title: 'Soul FM Summer Festival 2026',
    description: 'Our annual summer festival featuring 12 hours of non-stop live performances, food trucks, and vibes.',
    date: '2026-06-21',
    time: '12:00 PM',
    venue: 'Bayfront Park',
    location: 'Miami, FL',
    category: 'festival',
    artists: ['DJ SoulWave', 'The Groove Collective', 'Velvet Voice', 'Brass Dynasty', 'Neo Soul Orchestra'],
    isFeatured: true,
    isFree: false,
    price: '$65',
    status: 'upcoming',
    attendees: 2800,
  },
  {
    id: '5',
    title: 'Open Mic Night: Soul Edition',
    description: 'Showcase your talent! Open mic for singers, poets, and musicians. Sign up at the door.',
    date: '2026-04-05',
    time: '7:00 PM',
    venue: 'Rhythm & Brews Cafe',
    location: 'Wynwood, Miami',
    category: 'live',
    artists: ['Open to all!'],
    isFeatured: false,
    isFree: true,
    status: 'upcoming',
    attendees: 85,
  },
  {
    id: '6',
    title: 'DJ Masterclass: Mixing Soul & Funk',
    description: 'Learn mixing techniques from our resident DJs. Covering transitions, EQ, and crowd reading.',
    date: '2026-04-12',
    time: '3:00 PM',
    venue: 'Soul FM Studio',
    location: 'Miami Beach, FL',
    category: 'workshop',
    artists: ['DJ SoulWave', 'DJ Heritage'],
    isFeatured: false,
    isFree: false,
    price: '$35',
    status: 'upcoming',
    attendees: 15,
  },
];

const CATEGORIES: { id: EventCategory; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All Events', icon: Calendar },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'virtual', label: 'Virtual', icon: Music },
  { id: 'workshop', label: 'Workshops', icon: Mic2 },
  { id: 'festival', label: 'Festivals', icon: PartyPopper },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysUntil(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Past';
  if (diff === 0) return 'Today!';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

export function EventsPage() {
  const [category, setCategory] = useState<EventCategory>('all');

  const filteredEvents = category === 'all'
    ? EVENTS
    : EVENTS.filter((e) => e.category === category);

  const featuredEvents = EVENTS.filter((e) => e.isFeatured);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ffaa]/10 border border-[#00ffaa]/30 mb-6">
            <Calendar className="w-4 h-4 text-[#00ffaa]" />
            <span className="text-sm text-[#00ffaa] font-medium">Upcoming Events</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Righteous, cursive' }}
          >
            Events & <span className="text-[#00ffaa]">Live Shows</span>
          </h1>
          <p className="text-cyan-100/60 text-lg max-w-2xl mx-auto">
            Join us for live shows, virtual streams, workshops, and festivals. Feel the soul in person.
          </p>
        </motion.div>

        {/* Featured Events */}
        {featuredEvents.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-[#FFD700]" />
              Featured Events
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/5 border-[#00d9ff]/20 p-6 hover:border-[#00d9ff]/40 transition-all group cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">
                        <Star className="w-3 h-3 mr-1" /> Featured
                      </Badge>
                      <span className="text-xs text-[#00ffaa] font-medium">{getDaysUntil(event.date)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00d9ff] transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-sm text-white/50 mb-4 line-clamp-2">{event.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Calendar className="w-4 h-4 text-[#00d9ff]" />
                        {formatDate(event.date)} at {event.time}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <MapPin className="w-4 h-4 text-[#00ffaa]" />
                        {event.venue} — {event.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Users className="w-4 h-4 text-[#FF8C42]" />
                        {event.attendees.toLocaleString()} interested
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {event.artists.slice(0, 3).map((a) => (
                          <Badge key={a} variant="outline" className="text-xs text-white/60 border-white/10">{a}</Badge>
                        ))}
                        {event.artists.length > 3 && (
                          <Badge variant="outline" className="text-xs text-white/40 border-white/10">+{event.artists.length - 3}</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        {event.isFree ? (
                          <span className="text-[#00ffaa] font-bold text-sm">FREE</span>
                        ) : (
                          <span className="text-white font-bold text-sm">{event.price}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={category === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat.id)}
                className={
                  category === cat.id
                    ? 'bg-[#00d9ff] text-slate-900 font-bold'
                    : 'border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                }
              >
                <Icon className="w-4 h-4 mr-1.5" />
                {cat.label}
              </Button>
            );
          })}
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {filteredEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-white/5 border-white/10 p-4 md:p-6 hover:bg-white/[0.07] transition-all group cursor-pointer">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Date Block */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/10 flex flex-col items-center justify-center border border-[#00d9ff]/20">
                    <span className="text-xs text-[#00d9ff] uppercase font-bold">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Righteous, cursive' }}>
                      {new Date(event.date).getDate()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-[#00d9ff] transition-colors truncate">
                        {event.title}
                      </h3>
                      {event.isFree && (
                        <Badge className="bg-[#00ffaa]/20 text-[#00ffaa] border-[#00ffaa]/30 text-[10px]">FREE</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {event.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {event.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {event.attendees}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.artists.slice(0, 4).map((a) => (
                        <span key={a} className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">{a}</span>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {!event.isFree && (
                      <span className="text-lg font-bold text-white">{event.price}</span>
                    )}
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold gap-1"
                    >
                      <Ticket className="w-4 h-4" />
                      {event.isFree ? 'RSVP' : 'Get Tickets'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg">No events in this category yet.</p>
            <p className="text-white/25 text-sm mt-1">Check back soon or explore other categories.</p>
          </div>
        )}
      </div>
    </div>
  );
}
