import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Users,
  Search,
  Mic2,
  Radio,
  Music2,
  Star,
  MapPin,
  Mail,
  Globe,
  Instagram,
  Twitter,
  Headphones,
  Award,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { AnimatedPalm } from '../components/AnimatedPalm';

const ROLE_FILTERS = [
  { id: 'all', label: 'All', icon: Users },
  { id: 'dj', label: 'DJs', icon: Headphones },
  { id: 'host', label: 'Hosts', icon: Mic2 },
  { id: 'producer', label: 'Producers', icon: Music2 },
  { id: 'music_curator', label: 'Curators', icon: Star },
];

interface VoiceDescription {
  timber?: string;
  tempo?: string;
  energy?: string;
}

interface Schedule {
  day?: string;
  time?: string;
}

interface Profile {
  id: string;
  slug: string;
  name: string;
  role: string;
  archetype?: string;
  show_name?: string;
  avatar_url?: string;
  cover_image_url?: string;
  bio?: string;
  voice_description?: VoiceDescription;
  specialties?: string[];
  schedule?: Schedule;
  social_links?: Record<string, string>;
  achievements?: string[];
  favorite_artists?: string[];
  signature_quote?: string;
  years_experience?: number;
  location?: string;
  email?: string;
  website?: string;
  featured?: boolean;
  active?: boolean;
}

export function ProfilesPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchQuery, selectedRole]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading profiles...');
      const response = await api.getProfiles();
      console.log('✅ Profiles response:', response);
      setProfiles(response.profiles || []);
    } catch (error) {
      console.error('❌ Error loading profiles:', error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    let filtered = [...profiles];

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter((profile) => profile.role === selectedRole);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (profile) =>
          profile.name.toLowerCase().includes(query) ||
          profile.bio?.toLowerCase().includes(query) ||
          profile.archetype?.toLowerCase().includes(query) ||
          profile.show_name?.toLowerCase().includes(query) ||
          profile.specialties?.some((s) => s.toLowerCase().includes(query))
      );
    }

    setFilteredProfiles(filtered);
  };

  const getRoleIcon = (role: string) => {
    const roleFilter = ROLE_FILTERS.find((r) => r.id === role);
    return roleFilter ? roleFilter.icon : Users;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      dj: '#00d9ff',
      host: '#00ffaa',
      producer: '#FF8C42',
      music_curator: '#E91E63',
    };
    return colors[role] || '#6B7280';
  };

  const featuredProfiles = filteredProfiles.filter((p) => p.featured);
  const regularProfiles = filteredProfiles.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] relative overflow-hidden py-12">
      {/* Animated Palms - Left */}
      <AnimatedPalm side="left" delay={0.3} />
      
      {/* Animated Palms - Right */}
      <AnimatedPalm side="right" delay={0.5} />

      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#00d9ff] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-[#00ffaa] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#FF8C42] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 border border-[#00d9ff]/30 mb-4">
              <Users className="w-4 h-4 text-[#00d9ff]" />
              <span className="text-[#00d9ff] font-semibold text-sm">OUR TEAM</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
              Meet the Soul FM Team
            </h1>
            <p className="text-white/70 text-lg">
              The passionate voices and curators bringing you the best in soul, funk, and jazz
            </p>
          </div>

          {/* Role Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {ROLE_FILTERS.map((role) => {
              const Icon = role.icon;
              const isActive = selectedRole === role.id;

              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] shadow-lg scale-105'
                      : 'text-white/70 hover:text-white bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {role.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <Input
              type="text"
              placeholder="Search by name, show, archetype, or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#00d9ff]"
            />
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card
                key={i}
                className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-white/5" />
                <div className="p-6">
                  <div className="h-6 bg-white/5 rounded mb-3" />
                  <div className="h-4 bg-white/5 rounded mb-2" />
                  <div className="h-4 bg-white/5 rounded w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg mb-2">No profiles found</p>
            <p className="text-white/50 text-sm">Try adjusting your filters or search query</p>
          </Card>
        ) : (
          <>
            {/* Featured Profiles */}
            {featuredProfiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Star className="w-6 h-6 text-[#FFD700]" />
                  Featured
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredProfiles.map((profile, index) => {
                    const RoleIcon = getRoleIcon(profile.role);
                    const roleColor = getRoleColor(profile.role);

                    return (
                      <motion.div
                        key={profile.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          onClick={() => navigate(`/team/${profile.slug}`)}
                          className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group cursor-pointer h-full"
                        >
                          {/* Avatar/Cover */}
                          <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-[#0a1628] to-[#1a2332]">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <RoleIcon className="w-24 h-24 text-white/20" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                            {/* Role Badge */}
                            <div
                              className="absolute top-4 left-4 px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1 backdrop-blur-sm"
                              style={{ backgroundColor: `${roleColor}40`, borderColor: roleColor, borderWidth: 1 }}
                            >
                              <RoleIcon className="w-3 h-3" />
                              {profile.role}
                            </div>

                            {/* Featured Badge */}
                            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
                              <Star className="w-4 h-4 text-[#0a1628]" />
                            </div>

                            {/* Name & Archetype */}
                            <div className="absolute bottom-4 left-4 right-4">
                              <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-[#00d9ff] transition-colors">
                                {profile.name}
                              </h3>
                              {profile.archetype && (
                                <p className="text-[#00ffaa] text-sm font-semibold">
                                  {profile.archetype}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            {/* Show Name */}
                            {profile.show_name && (
                              <div className="flex items-center gap-2 mb-3 text-white/80">
                                <Radio className="w-4 h-4 text-[#00d9ff]" />
                                <span className="font-semibold">{profile.show_name}</span>
                              </div>
                            )}

                            {/* Bio */}
                            {profile.bio && (
                              <p className="text-white/70 text-sm mb-4 line-clamp-3">
                                {profile.bio}
                              </p>
                            )}

                            {/* Specialties */}
                            {profile.specialties && profile.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-4">
                                {profile.specialties.slice(0, 3).map((specialty) => (
                                  <span
                                    key={specialty}
                                    className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs"
                                  >
                                    {specialty}
                                  </span>
                                ))}
                                {profile.specialties.length > 3 && (
                                  <span className="px-2 py-1 text-white/50 text-xs">
                                    +{profile.specialties.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* View Profile Button */}
                            <Button
                              variant="outline"
                              className="w-full bg-white/5 text-white border-white/20 hover:bg-gradient-to-r hover:from-[#00d9ff] hover:to-[#00ffaa] hover:text-[#0a1628] hover:border-0"
                            >
                              View Profile
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Regular Profiles */}
            {regularProfiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {featuredProfiles.length > 0 && (
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Users className="w-6 h-6 text-[#00d9ff]" />
                    All Team Members
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {regularProfiles.map((profile, index) => {
                    const RoleIcon = getRoleIcon(profile.role);
                    const roleColor = getRoleColor(profile.role);

                    return (
                      <motion.div
                        key={profile.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Card
                          onClick={() => navigate(`/team/${profile.slug}`)}
                          className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group cursor-pointer h-full flex flex-col"
                        >
                          {/* Avatar */}
                          <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-[#0a1628] to-[#1a2332]">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <RoleIcon className="w-16 h-16 text-white/20" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                            {/* Role Badge */}
                            <div
                              className="absolute top-3 left-3 px-2 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1 backdrop-blur-sm"
                              style={{ backgroundColor: `${roleColor}30`, borderColor: roleColor, borderWidth: 1 }}
                            >
                              <RoleIcon className="w-3 h-3" />
                            </div>

                            {/* Name */}
                            <div className="absolute bottom-3 left-3 right-3">
                              <h3 className="text-lg font-bold text-white group-hover:text-[#00d9ff] transition-colors line-clamp-1">
                                {profile.name}
                              </h3>
                              {profile.archetype && (
                                <p className="text-[#00ffaa] text-xs font-semibold line-clamp-1">
                                  {profile.archetype}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4 flex-1 flex flex-col">
                            {profile.show_name && (
                              <div className="flex items-center gap-2 mb-2 text-white/80 text-sm">
                                <Radio className="w-3 h-3 text-[#00d9ff]" />
                                <span className="font-semibold line-clamp-1">{profile.show_name}</span>
                              </div>
                            )}

                            {profile.bio && (
                              <p className="text-white/70 text-xs mb-3 line-clamp-2 flex-1">
                                {profile.bio}
                              </p>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full bg-white/5 text-white border-white/20 hover:bg-white/10 text-xs"
                            >
                              View Profile
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}