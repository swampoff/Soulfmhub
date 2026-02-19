import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { toast } from 'sonner';
import {
  Mic,
  Play,
  Pause,
  Volume2,
  Trash2,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  RadioTower
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectId } from '../../../../utils/supabase/info';
import { getAuthHeaders } from '../../../lib/api';

interface NewsVoiceOver {
  id: string;
  news_id: string;
  news_title: string;
  news_content: string;
  audio_url: string;
  voice_id: string;
  voice_name: string;
  duration: number;
  is_active: boolean;
  play_count: number;
  last_played?: string;
  created_at: string;
}

interface Voice {
  id: string;
  hostName: string;
  elevenLabsVoiceId: string;
  isActive: boolean;
}

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  is_published: boolean;
}

export function NewsVoiceOverManager() {
  const [voiceOvers, setVoiceOvers] = useState<NewsVoiceOver[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  
  // Generate dialog
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [voiceOversRes, voicesRes, newsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/news-voiceovers`, {
          headers
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/voices`, {
          headers
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news`, {
          headers
        })
      ]);

      const voiceOversData = await voiceOversRes.json();
      const voicesData = await voicesRes.json();
      const newsData = await newsRes.json();

      setVoiceOvers(voiceOversData.voiceOvers || []);
      setVoices(voicesData.voices || []);
      
      // Parse news from /news endpoint
      const newsArticles = (newsData.news || []);
      setNews(newsArticles.filter((n: any) => n.is_published !== false));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateVoiceOver = async () => {
    if (!selectedNewsId || !selectedVoiceId) {
      toast.error('Please select both news and voice');
      return;
    }

    const newsArticle = news.find(n => n.id === selectedNewsId);
    const voice = voices.find(v => v.elevenLabsVoiceId === selectedVoiceId);

    if (!newsArticle || !voice) {
      toast.error('Invalid selection');
      return;
    }

    setGenerating(selectedNewsId);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/news-voiceovers/generate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            newsId: newsArticle.id,
            newsTitle: newsArticle.title,
            newsContent: newsArticle.content,
            voiceId: voice.elevenLabsVoiceId,
            voiceName: voice.hostName
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Voice-over generated successfully!');
        setVoiceOvers([data.voiceOver, ...voiceOvers]);
        setIsGenerateDialogOpen(false);
        setSelectedNewsId('');
        setSelectedVoiceId('');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error generating voice-over:', error);
      toast.error(error.message || 'Failed to generate voice-over');
    } finally {
      setGenerating(null);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/news-voiceovers/${id}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ is_active: !currentActive })
        }
      );

      const data = await response.json();

      if (data.success) {
        setVoiceOvers(voiceOvers.map(vo => 
          vo.id === id ? { ...vo, is_active: !currentActive } : vo
        ));
        toast.success(!currentActive ? 'Voice-over activated' : 'Voice-over deactivated');
      }
    } catch (error) {
      console.error('Error toggling active:', error);
      toast.error('Failed to update status');
    }
  };

  const deleteVoiceOver = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice-over?')) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/news-voiceovers/${id}`,
        {
          method: 'DELETE',
          headers
        }
      );

      const data = await response.json();

      if (data.success) {
        setVoiceOvers(voiceOvers.filter(vo => vo.id !== id));
        toast.success('Voice-over deleted');
      }
    } catch (error) {
      console.error('Error deleting voice-over:', error);
      toast.error('Failed to delete voice-over');
    }
  };

  const togglePlayback = (voiceOver: NewsVoiceOver) => {
    if (playingId === voiceOver.id) {
      // Pause
      audioElements[voiceOver.id]?.pause();
      setPlayingId(null);
    } else {
      // Stop any currently playing
      if (playingId && audioElements[playingId]) {
        audioElements[playingId].pause();
      }

      // Create or get audio element
      let audio = audioElements[voiceOver.id];
      if (!audio) {
        audio = new Audio(voiceOver.audio_url);
        audio.addEventListener('ended', () => setPlayingId(null));
        setAudioElements({ ...audioElements, [voiceOver.id]: audio });
      }

      audio.play();
      setPlayingId(voiceOver.id);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d9ff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mic className="w-6 h-6 text-[#00d9ff]" />
            News Voice-Overs
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Generate TTS audio for news articles using ElevenLabs
          </p>
        </div>

        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black">
              <RadioTower className="w-4 h-4 mr-2" />
              Generate Voice-Over
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141414] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Generate News Voice-Over</DialogTitle>
              <DialogDescription>
                Select a news article and voice to generate TTS audio
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>News Article</Label>
                <Select value={selectedNewsId} onValueChange={setSelectedNewsId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select news article" />
                  </SelectTrigger>
                  <SelectContent>
                    {news.map(article => (
                      <SelectItem key={article.id} value={article.id}>
                        {article.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Voice</Label>
                <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.filter(v => v.isActive).map(voice => (
                      <SelectItem key={voice.elevenLabsVoiceId} value={voice.elevenLabsVoiceId}>
                        {voice.hostName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedNewsId && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Preview:</div>
                  <div className="text-sm text-white line-clamp-3">
                    {news.find(n => n.id === selectedNewsId)?.content}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsGenerateDialogOpen(false)}
                disabled={!!generating}
              >
                Cancel
              </Button>
              <Button
                onClick={generateVoiceOver}
                disabled={!!generating || !selectedNewsId || !selectedVoiceId}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#141414] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Voice-Overs</p>
                <p className="text-2xl font-bold text-white">{voiceOvers.length}</p>
              </div>
              <Mic className="w-8 h-8 text-[#00d9ff] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active</p>
                <p className="text-2xl font-bold text-white">
                  {voiceOvers.filter(vo => vo.is_active).length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Plays</p>
                <p className="text-2xl font-bold text-white">
                  {voiceOvers.reduce((sum, vo) => sum + vo.play_count, 0)}
                </p>
              </div>
              <Volume2 className="w-8 h-8 text-[#00ffaa] opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voice-Overs List */}
      <Card className="bg-[#141414] border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Generated Voice-Overs</CardTitle>
        </CardHeader>
        <CardContent>
          {voiceOvers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Mic className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No voice-overs generated yet</p>
              <p className="text-sm mt-1">Click "Generate Voice-Over" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {voiceOvers.map(voiceOver => (
                  <motion.div
                    key={voiceOver.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Play Button */}
                      <button
                        onClick={() => togglePlayback(voiceOver)}
                        className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        {playingId === voiceOver.id ? (
                          <Pause className="w-5 h-5 text-black" />
                        ) : (
                          <Play className="w-5 h-5 text-black ml-0.5" />
                        )}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold truncate">
                              {voiceOver.news_title}
                            </h3>
                            <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                              {voiceOver.news_content}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              variant={voiceOver.is_active ? 'default' : 'secondary'}
                              className={voiceOver.is_active ? 'bg-green-500/20 text-green-400' : ''}
                            >
                              {voiceOver.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                          <span>Voice: {voiceOver.voice_name}</span>
                          <span>Duration: {formatDuration(voiceOver.duration)}</span>
                          <span>Plays: {voiceOver.play_count}</span>
                          {voiceOver.last_played && (
                            <span>Last: {new Date(voiceOver.last_played).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(voiceOver.id, voiceOver.is_active)}
                          className="text-gray-400 hover:text-white"
                        >
                          {voiceOver.is_active ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteVoiceOver(voiceOver.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}