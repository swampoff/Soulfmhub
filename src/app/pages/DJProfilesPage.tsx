import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Headphones,
  Music,
  Instagram,
  Twitter,
  Star,
  Play,
  Clock,
  Radio,
  Users,
  Heart,
  Disc3,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';

interface DJ {
  id: string;
  name: string;
  alias: string;
  bio: string;
  genres: string[];
  shows: string[];
  experience: string;
  followers: number;
  rating: number;
  isLive: boolean;
  gradient: string;
  initial: string;
  social: { instagram?: string; twitter?: string };
  speciality: string;
}

const DJS: DJ[] = [
  {
    id: '1',
    name: 'Marcus Williams',
    alias: 'DJ SoulWave',
    bio: 'Pioneer of the deep soul movement. Known for silky transitions and genre-bending sets that take listeners on an unforgettable journey.',
    genres: ['Deep Soul', 'Neo-Soul', 'Funk'],
    shows: ['Midnight Groove', 'Soul Kitchen'],
    experience: '15 years',
    followers: 12400,
    rating: 4.9,
    isLive: true,
    gradient: 'from-[#00d9ff] to-[#0088cc]',
    initial: 'M',
    social: { instagram: '@djsoulwave', twitter: '@djsoulwave' },
    speciality: 'Deep cuts & vinyl sessions',
  },
  {
    id: '2',
    name: 'Sarah Chen',
    alias: 'DJ Heritage',
    bio: 'Music historian and vinyl collector. Sarah brings decades of rare soul recordings and forgotten classics back to life.',
    genres: ['Classic Soul', 'Motown', 'Jazz'],
    shows: ['Vinyl Vault', 'Heritage Hour'],
    experience: '12 years',
    followers: 8700,
    rating: 4.8,
    isLive: false,
    gradient: 'from-[#00ffaa] to-[#00cc88]',
    initial: 'S',
    social: { instagram: '@djheritage' },
    speciality: 'Rare vinyl & music history',
  },
  {
    id: '3',
    name: 'Devon Jackson',
    alias: 'MC Rhythmic',
    bio: 'Hype master and groove architect. Devon keeps the energy flowing with his infectious mixes and crowd interaction.',
    genres: ['R&B', 'Hip-Hop Soul', 'Funk'],
    shows: ['The Rhythm Lab'],
    experience: '8 years',
    followers: 15200,
    rating: 4.7,
    isLive: false,
    gradient: 'from-[#FF8C42] to-[#FF6B1A]',
    initial: 'D',
    social: { instagram: '@mcrhythmic', twitter: '@mcrhythmic' },
    speciality: 'High-energy live sets',
  },
  {
    id: '4',
    name: 'Amara Osei',
    alias: 'Velvet Voice',
    bio: 'Singer-DJ hybrid who weaves live vocals into her sets. Amara\'s shows are part concert, part DJ set — always magical.',
    genres: ['Neo-Soul', 'Afrobeat', 'Jazz Fusion'],
    shows: ['Velvet Sessions', 'Afro Soul Vibes'],
    experience: '6 years',
    followers: 9800,
    rating: 4.9,
    isLive: false,
    gradient: 'from-[#E91E63] to-[#C2185B]',
    initial: 'A',
    social: { instagram: '@velvetvoicedj', twitter: '@velvetvoice' },
    speciality: 'Live vocals over DJ sets',
  },
  {
    id: '5',
    name: 'Rio Nakamura',
    alias: 'Professor Funk',
    bio: 'The funkiest educator in the game. Rio breaks down the science of groove while keeping dancefloors moving worldwide.',
    genres: ['Funk', 'Disco', 'Boogie'],
    shows: ['Funk University', 'Disco Therapy'],
    experience: '20 years',
    followers: 22100,
    rating: 5.0,
    isLive: false,
    gradient: 'from-[#9C27B0] to-[#7B1FA2]',
    initial: 'R',
    social: { instagram: '@professorfunk', twitter: '@profunk' },
    speciality: 'Funk history & education',
  },
  {
    id: '6',
    name: 'Jade Thompson',
    alias: 'Synthia Keys',
    bio: 'Electronic soul producer and live performer. Jade blends analog synths with soulful melodies for a unique sonic experience.',
    genres: ['Electronic Soul', 'Synthwave', 'Lo-Fi'],
    shows: ['Synth & Soul'],
    experience: '5 years',
    followers: 6300,
    rating: 4.6,
    isLive: false,
    gradient: 'from-[#FFD700] to-[#FFA000]',
    initial: 'J',
    social: { instagram: '@synthiakeys' },
    speciality: 'Live synth performances',
  },
];

export function DJProfilesPage() {
  const [selectedDJ, setSelectedDJ] = useState<DJ | null>(null);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00d9ff]/10 border border-[#00d9ff]/30 mb-6">
            <Headphones className="w-4 h-4 text-[#00d9ff]" />
            <span className="text-sm text-[#00d9ff] font-medium">Meet Our DJs</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Righteous, cursive' }}
          >
            Our <span className="text-[#00d9ff]">DJs</span>
          </h1>
          <p className="text-cyan-100/60 text-lg max-w-2xl mx-auto">
            The talented individuals who bring the soul to your speakers. Every day, every night.
          </p>
        </motion.div>

        {/* DJ Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DJS.map((dj, i) => (
            <motion.div
              key={dj.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card
                className="bg-white/5 border-white/10 overflow-hidden hover:border-white/20 transition-all group cursor-pointer"
                onClick={() => setSelectedDJ(selectedDJ?.id === dj.id ? null : dj)}
              >
                {/* Avatar Header */}
                <div className={`relative h-36 bg-gradient-to-br ${dj.gradient} flex items-center justify-center`}>
                  <div className="w-20 h-20 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border-2 border-white/20">
                    <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Righteous, cursive' }}>
                      {dj.initial}
                    </span>
                  </div>
                  {dj.isLive && (
                    <Badge className="absolute top-3 right-3 bg-red-500/90 text-white gap-1 animate-pulse">
                      <Radio className="w-3 h-3" /> LIVE
                    </Badge>
                  )}
                  <div className="absolute bottom-3 left-3 flex gap-1">
                    {dj.genres.slice(0, 2).map((g) => (
                      <Badge key={g} className="bg-black/40 backdrop-blur-sm text-white/90 text-[10px] border-0">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-white group-hover:text-[#00d9ff] transition-colors">
                        {dj.alias}
                      </h3>
                      <p className="text-xs text-white/40">{dj.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
                      <span className="text-sm text-white/70 font-medium">{dj.rating}</span>
                    </div>
                  </div>

                  <p className="text-sm text-white/40 line-clamp-2 mb-3">{dj.bio}</p>

                  <div className="flex items-center justify-between text-xs text-white/30">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {(dj.followers / 1000).toFixed(1)}K</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {dj.experience}</span>
                    </div>
                    <div className="flex gap-2">
                      {dj.social.instagram && <Instagram className="w-3.5 h-3.5 hover:text-[#E4405F] cursor-pointer transition-colors" />}
                      {dj.social.twitter && <Twitter className="w-3.5 h-3.5 hover:text-[#1DA1F2] cursor-pointer transition-colors" />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {selectedDJ?.id === dj.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 border-t border-white/10 space-y-3"
                    >
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Speciality</span>
                        <p className="text-sm text-white/60">{dj.speciality}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Shows</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dj.shows.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs text-[#00d9ff] border-[#00d9ff]/30">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">All Genres</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dj.genres.map((g) => (
                            <Badge key={g} variant="outline" className="text-xs text-white/50 border-white/10">{g}</Badge>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Join CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <Card className="bg-gradient-to-r from-[#00d9ff]/10 to-[#00ffaa]/5 border-[#00d9ff]/20 p-8 max-w-lg mx-auto">
            <Disc3 className="w-10 h-10 text-[#00d9ff] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Righteous, cursive' }}>
              Want to Join the Crew?
            </h3>
            <p className="text-sm text-white/50 mb-4">
              We're always looking for talented DJs and music lovers to join our team.
            </p>
            <Link to="/contact">
              <Button className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold gap-2">
                <Headphones className="w-4 h-4" />
                Apply Now
              </Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
