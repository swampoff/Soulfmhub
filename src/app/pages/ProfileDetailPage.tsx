import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  ArrowLeft,
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
  Calendar,
  Clock,
  Sparkles,
  Quote,
  Heart,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../lib/api';
import nikoAvatar from 'figma:asset/2bcd2a7b9863e5b63f9a6dba11123e60aa992bd0.png';

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

export function ProfileDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [slug]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await api.getProfileBySlug(slug!);
      
      // Replace avatar URL for Niko
      if (response.profile && response.profile.slug === 'niko') {
        response.profile.avatar_url = nikoAvatar;
      }
      
      setProfile(response.profile);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, any> = {
      dj: Headphones,
      host: Mic2,
      producer: Music2,
      music_curator: Star,
    };
    return icons[role] || Users;
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

  const getSocialIcon = (platform: string) => {
    const icons: Record<string, any> = {
      twitter: Twitter,
      instagram: Instagram,
      website: Globe,
      email: Mail,
    };
    return icons[platform.toLowerCase()] || Globe;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-1/4 mb-8" />
            <div className="aspect-[21/9] bg-white/10 rounded-lg mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-32 bg-white/10 rounded" />
                <div className="h-48 bg-white/10 rounded" />
              </div>
              <div className="space-y-6">
                <div className="h-64 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg mb-4">Profile not found</p>
            <Button
              variant="outline"
              onClick={() => navigate('/team')}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] border-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Team
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(profile.role);
  const roleColor = getRoleColor(profile.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Button
            variant="outline"
            onClick={() => navigate('/team')}
            className="bg-white/5 text-white border-white/20 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Button>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
            {/* Cover Image or Gradient */}
            <div
              className="aspect-[21/9] relative overflow-hidden"
              style={{
                background: profile.cover_image_url
                  ? `url(${profile.cover_image_url})`
                  : `linear-gradient(135deg, ${roleColor}40, ${roleColor}10)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/50 to-transparent" />

              {/* Profile Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div
                      className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 shadow-2xl"
                      style={{ borderColor: roleColor }}
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: `${roleColor}20` }}
                        >
                          <RoleIcon className="w-16 h-16" style={{ color: roleColor }} />
                        </div>
                      )}
                    </div>

                    {/* Featured Badge */}
                    {profile.featured && (
                      <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg">
                        <Star className="w-5 h-5 text-[#0a1628]" />
                      </div>
                    )}
                  </div>

                  {/* Name & Info */}
                  <div className="flex-1">
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-bold mb-3 backdrop-blur-sm"
                      style={{ backgroundColor: `${roleColor}40`, borderColor: roleColor, borderWidth: 1 }}
                    >
                      <RoleIcon className="w-4 h-4" />
                      {profile.role.toUpperCase()}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
                      {profile.name}
                    </h1>

                    {profile.archetype && (
                      <p
                        className="text-xl md:text-2xl font-semibold mb-3"
                        style={{ color: roleColor }}
                      >
                        {profile.archetype}
                      </p>
                    )}

                    {profile.show_name && (
                      <div className="flex items-center gap-2 text-white/90 mb-3">
                        <Radio className="w-5 h-5 text-[#00d9ff]" />
                        <span className="text-lg font-semibold">{profile.show_name}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-white/70">
                      {profile.years_experience && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          <span>{profile.years_experience} years experience</span>
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Social Links */}
                  {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                    <div className="flex gap-2">
                      {Object.entries(profile.social_links).map(([platform, url]) => {
                        const Icon = getSocialIcon(platform);
                        return (
                          <Button
                            key={platform}
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                          >
                            <Icon className="w-4 h-4" />
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Bio */}
            {profile.bio && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6" style={{ color: roleColor }} />
                  About
                </h2>
                <p className="text-white/80 leading-relaxed text-lg">{profile.bio}</p>
              </Card>
            )}

            {/* Voice Description */}
            {profile.voice_description && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Mic2 className="w-6 h-6" style={{ color: roleColor }} />
                  Voice & Style
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profile.voice_description.timber && (
                    <div>
                      <div className="text-white/50 text-sm font-semibold mb-1">ТЕМБР</div>
                      <div className="text-white font-semibold">{profile.voice_description.timber}</div>
                    </div>
                  )}
                  {profile.voice_description.tempo && (
                    <div>
                      <div className="text-white/50 text-sm font-semibold mb-1">ТЕМП</div>
                      <div className="text-white font-semibold">{profile.voice_description.tempo}</div>
                    </div>
                  )}
                  {profile.voice_description.energy && (
                    <div>
                      <div className="text-white/50 text-sm font-semibold mb-1">ЭНЕРГИЯ</div>
                      <div className="text-white font-semibold">{profile.voice_description.energy}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Quote */}
            {profile.signature_quote && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <Quote className="w-12 h-12 mb-4 opacity-20" style={{ color: roleColor }} />
                <p className="text-white/90 text-xl italic leading-relaxed">
                  "{profile.signature_quote}"
                </p>
              </Card>
            )}

            {/* Favorite Artists */}
            {profile.favorite_artists && profile.favorite_artists.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Heart className="w-6 h-6 text-[#E91E63]" />
                  Favorite Artists
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.favorite_artists.map((artist) => (
                    <span
                      key={artist}
                      className="px-3 py-2 rounded-lg bg-white/10 text-white font-semibold"
                    >
                      {artist}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Achievements */}
            {profile.achievements && profile.achievements.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-[#FFD700]" />
                  Achievements
                </h2>
                <ul className="space-y-3">
                  {profile.achievements.map((achievement, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Star className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#FFD700]" />
                      <span className="text-white/80">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Schedule */}
            {profile.schedule && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#00d9ff]" />
                  Schedule
                </h3>
                <div className="space-y-2">
                  {profile.schedule.day && (
                    <div>
                      <div className="text-white/50 text-sm">Day</div>
                      <div className="text-white font-semibold">{profile.schedule.day}</div>
                    </div>
                  )}
                  {profile.schedule.time && (
                    <div>
                      <div className="text-white/50 text-sm">Time</div>
                      <div className="text-white font-semibold">{profile.schedule.time}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Specialties */}
            {profile.specialties && profile.specialties.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Music2 className="w-5 h-5 text-[#00d9ff]" />
                  Specialties
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="px-3 py-2 rounded-lg text-sm font-semibold"
                      style={{
                        backgroundColor: `${roleColor}20`,
                        color: roleColor,
                      }}
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Contact */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Get in Touch</h3>
              <div className="space-y-3">
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-3 text-white/80 hover:text-[#00d9ff] transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    <span>{profile.email}</span>
                  </a>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-white/80 hover:text-[#00d9ff] transition-colors"
                  >
                    <Globe className="w-5 h-5" />
                    <span>Visit Website</span>
                  </a>
                )}
              </div>
            </Card>

            {/* CTA */}
            <Button
              className="w-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold hover:opacity-90"
              onClick={() => navigate('/schedule')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              View Show Schedule
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}