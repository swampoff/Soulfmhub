import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Clock, Calendar, User, Radio, Play, Users, Heart, Share2, Podcast } from 'lucide-react';
import { api } from '../../lib/api';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export function ShowDetailPage() {
  const { id } = useParams();
  const [show, setShow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShow();
  }, [id]);

  const loadShow = async () => {
    if (!id) return;
    
    try {
      const { show: data } = await api.getShow(id);
      setShow(data);
    } catch (error) {
      console.error('Error loading show:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-8">
        <div className="container mx-auto px-4">
          <div className="text-white text-center py-12">Loading show...</div>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-8">
        <div className="container mx-auto px-4">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-12 text-center">
            <Radio className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white text-xl mb-4">Show not found</p>
            <Link to="/shows">
              <Button variant="outline" className="bg-white/5 text-white border-white/20 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shows
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link to="/shows">
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shows
            </Button>
          </Link>
        </motion.div>

        {/* Show Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
            <div className="grid md:grid-cols-3 gap-8 p-8">
              {/* Cover Image */}
              <div className="md:col-span-1">
                <div className="relative group">
                  {(show.coverImage || show.cover) ? (
                    <img
                      src={show.coverImage || show.cover}
                      alt={show.title || show.name}
                      className="w-full aspect-square object-cover rounded-lg shadow-2xl"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20 rounded-lg flex items-center justify-center">
                      <Radio className="w-24 h-24 text-[#00d9ff]/50" />
                    </div>
                  )}
                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <Button
                      size="icon"
                      className="w-20 h-20 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628]"
                    >
                      <Play className="w-8 h-8 ml-1" fill="currentColor" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Follow
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/5 text-white border-white/20 hover:bg-white/10"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Show Info */}
              <div className="md:col-span-2">
                <div className="flex flex-wrap items-start gap-2 mb-4">
                  {show.type === 'live' && (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      LIVE SHOW
                    </div>
                  )}
                  {show.type === 'podcast' && (
                    <div className="px-3 py-1 rounded-full bg-blue-500/90 text-white text-xs font-bold">
                      <Podcast className="w-3 h-3 inline mr-1" />
                      PODCAST
                    </div>
                  )}
                  {show.genre && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30">
                      {show.genre}
                    </span>
                  )}
                </div>

                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-4" style={{ fontFamily: 'var(--font-family-display)' }}>
                  {show.title || show.name}
                </h1>

                {show.host && (
                  <div className="flex items-center gap-2 text-white/80 mb-6">
                    <User className="w-5 h-5 text-[#00ffaa]" />
                    <span className="text-lg">Hosted by <span className="text-white font-semibold">{show.host}</span></span>
                  </div>
                )}

                {(show.schedule) && (
                  <div className="flex items-center gap-2 text-white/80 mb-6">
                    <Calendar className="w-5 h-5 text-[#00d9ff]" />
                    <span>{typeof show.schedule === 'string' ? show.schedule : Array.isArray(show.schedule) ? show.schedule.map((s: any) => `${s.day} ${s.startTime}-${s.endTime}`).join(', ') : ''}</span>
                  </div>
                )}

                {show.description && (
                  <p className="text-white/90 text-lg leading-relaxed mb-6">
                    {show.description}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/10 rounded-lg border border-[#00d9ff]/20">
                    <div className="text-3xl font-bold text-white mb-1">
                      {show.episodes?.length || 0}
                    </div>
                    <div className="text-sm text-white/60">Episodes</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/10 rounded-lg border border-[#00d9ff]/20">
                    <div className="text-3xl font-bold text-white mb-1">
                      {show.totalListeners || show.averageListeners || 0}
                    </div>
                    <div className="text-sm text-white/60">Listeners</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-[#00d9ff]/10 to-[#00ffaa]/10 rounded-lg border border-[#00d9ff]/20">
                    <div className="text-3xl font-bold text-white mb-1">
                      {show.averageRating?.toFixed(1) || show.totalPlays || 0}
                    </div>
                    <div className="text-sm text-white/60">{show.averageRating ? 'Rating' : 'Total Plays'}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Episodes / Archive */}
        {show.episodes && show.episodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-white mb-6">Recent Episodes</h2>
            <div className="space-y-4">
              {show.episodes.map((episode: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all group">
                    <div className="p-6">
                      <div className="flex items-start gap-6">
                        {/* Episode Number */}
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center text-[#0a1628] font-bold text-xl shadow-lg">
                          {show.episodes.length - index}
                        </div>
                        
                        {/* Episode Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00d9ff] transition-colors">
                            {episode.title || `Episode ${show.episodes.length - index}`}
                          </h3>
                          {episode.date && (
                            <div className="text-white/60 text-sm mb-3 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(episode.date), 'MMMM d, yyyy')}
                            </div>
                          )}
                          {episode.description && (
                            <p className="text-white/80 mb-3 line-clamp-2">{episode.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-white/50 text-sm">
                            {episode.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{episode.duration}</span>
                              </div>
                            )}
                            {episode.plays && (
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{episode.plays} plays</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Play Button */}
                        <Button
                          size="icon"
                          className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] hover:from-[#00b8dd] hover:to-[#00dd88] text-[#0a1628] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* About Section */}
        {show.about && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Radio className="w-6 h-6 text-[#00d9ff]" />
                About This Show
              </h2>
              <div className="text-white/80 text-lg leading-relaxed whitespace-pre-line">
                {show.about}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}