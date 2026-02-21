import React, { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { api } from '../../lib/api';

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
  role?: string;
}

const GRADIENT_PALETTE = [
  'from-[#00d9ff] to-[#0088cc]',
  'from-[#00ffaa] to-[#00cc88]',
  'from-[#FF8C42] to-[#FF6B1A]',
  'from-[#E91E63] to-[#C2185B]',
  'from-[#9C27B0] to-[#7B1FA2]',
  'from-[#FFD700] to-[#FFA000]',
  'from-[#00BCD4] to-[#0097A7]',
  'from-[#4CAF50] to-[#388E3C]',
];

function mapProfileToDJ(profile: any, index: number): DJ {
  return {
    id: profile.id,
    name: profile.name || 'Unknown',
    alias: profile.alias || profile.nickname || profile.name || 'DJ',
    bio: profile.bio || profile.description || '',
    genres: profile.genres || [],
    shows: profile.shows || [],
    experience: profile.experience || '',
    followers: profile.followers || 0,
    rating: profile.rating || 0,
    isLive: profile.isLive || false,
    gradient: profile.gradient || GRADIENT_PALETTE[index % GRADIENT_PALETTE.length],
    initial: (profile.alias?.[0] || profile.name?.[0] || 'D').toUpperCase(),
    social: profile.social || {},
    speciality: profile.speciality || profile.specialty || '',
    role: profile.role,
  };
}

export function DJProfilesPage() {
  const [selectedDJ, setSelectedDJ] = useState<DJ | null>(null);
  const [djs, setDJs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const { profiles } = await api.getProfiles();
      if (profiles && profiles.length > 0) {
        // Filter for DJ-type profiles (if role exists) or show all
        const djProfiles = profiles
          .filter((p: any) => !p.role || p.role === 'dj' || p.role === 'host' || p.role === 'producer')
          .map((p: any, i: number) => mapProfileToDJ(p, i));
        setDJs(djProfiles);
      }
    } catch (error) {
      console.error('Error loading DJ profiles:', error);
    } finally {
      setLoading(false);
    }
  };

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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-[#00d9ff] animate-spin" />
            <p className="text-white/50">Loading DJs...</p>
          </div>
        ) : djs.length === 0 ? (
          <div className="text-center py-16">
            <Headphones className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg">No DJ profiles yet.</p>
            <p className="text-white/25 text-sm mt-1">Check back soon to meet our team.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {djs.map((dj, i) => (
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
                      {dj.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
                          <span className="text-sm text-white/70 font-medium">{dj.rating}</span>
                        </div>
                      )}
                    </div>

                    {dj.bio && (
                      <p className="text-sm text-white/40 line-clamp-2 mb-3">{dj.bio}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-white/30">
                      <div className="flex items-center gap-3">
                        {dj.followers > 0 && (
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {(dj.followers / 1000).toFixed(1)}K</span>
                        )}
                        {dj.experience && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {dj.experience}</span>
                        )}
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
                        {dj.speciality && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Speciality</span>
                            <p className="text-sm text-white/60">{dj.speciality}</p>
                          </div>
                        )}
                        {dj.shows.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Shows</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {dj.shows.map((s) => (
                                <Badge key={s} variant="outline" className="text-xs text-[#00d9ff] border-[#00d9ff]/30">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {dj.genres.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">All Genres</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {dj.genres.map((g) => (
                                <Badge key={g} variant="outline" className="text-xs text-white/50 border-white/10">{g}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

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
