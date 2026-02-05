import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Newspaper, 
  Search, 
  Calendar, 
  User, 
  Clock, 
  Tag,
  TrendingUp,
  Mic2,
  Radio,
  Music2,
  PartyPopper,
  ArrowRight,
  X
} from 'lucide-react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { AnimatedPalm } from '../components/AnimatedPalm';

const CATEGORIES = [
  { id: 'all', label: 'All News', icon: Newspaper, color: '#00d9ff' },
  { id: 'music', label: 'Music News', icon: Music2, color: '#FF8C42' },
  { id: 'interviews', label: 'Artist Interviews', icon: Mic2, color: '#E91E63' },
  { id: 'station', label: 'Station Updates', icon: Radio, color: '#00BCD4' },
  { id: 'events', label: 'Events', icon: PartyPopper, color: '#FFC107' },
  { id: 'trending', label: 'Trending', icon: TrendingUp, color: '#4CAF50' },
];

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  author_avatar?: string;
  cover_image?: string;
  published_at: string;
  read_time: number;
  tags: string[];
  featured?: boolean;
}

export function NewsPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    loadArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery, selectedCategory, selectedTags]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with real API call
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'The Rise of Neo-Soul: A Renaissance in Modern Music',
          excerpt: 'Exploring how neo-soul is reshaping the contemporary music landscape with fresh voices and classic influences.',
          content: 'Full article content...',
          category: 'music',
          author: 'Sarah Johnson',
          cover_image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=500&fit=crop',
          published_at: '2026-02-03T10:00:00Z',
          read_time: 8,
          tags: ['Soul', 'Neo-Soul', 'Trends'],
          featured: true,
        },
        {
          id: '2',
          title: 'Interview: DJ Groove on 30 Years of Funk',
          excerpt: 'Legendary DJ Groove sits down with us to discuss three decades of bringing funk to the airwaves.',
          content: 'Full article content...',
          category: 'interviews',
          author: 'Mike Davis',
          cover_image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=500&fit=crop',
          published_at: '2026-02-02T14:30:00Z',
          read_time: 12,
          tags: ['Interview', 'Funk', 'DJ'],
          featured: true,
        },
        {
          id: '3',
          title: 'Soul FM Hub Launches New Mobile App',
          excerpt: 'Listen to Soul FM Hub on the go with our brand new mobile application, available now on iOS and Android.',
          content: 'Full article content...',
          category: 'station',
          author: 'Soul FM Team',
          cover_image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=500&fit=crop',
          published_at: '2026-02-01T09:00:00Z',
          read_time: 5,
          tags: ['App', 'Technology', 'Update'],
          featured: false,
        },
        {
          id: '4',
          title: 'Summer Soul Festival 2026 Lineup Announced',
          excerpt: 'Get ready for the hottest soul festival of the year! Check out the incredible lineup we have in store.',
          content: 'Full article content...',
          category: 'events',
          author: 'Events Team',
          cover_image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop',
          published_at: '2026-01-30T11:00:00Z',
          read_time: 6,
          tags: ['Festival', 'Live Music', 'Events'],
          featured: false,
        },
        {
          id: '5',
          title: 'Top 10 Jazz Albums of January 2026',
          excerpt: 'Our curated selection of the best jazz releases from this month that you absolutely need to hear.',
          content: 'Full article content...',
          category: 'music',
          author: 'Jazz Curator',
          cover_image: 'https://images.unsplash.com/photo-1415886541506-6efc5e4b1786?w=800&h=500&fit=crop',
          published_at: '2026-01-28T16:00:00Z',
          read_time: 10,
          tags: ['Jazz', 'Album Reviews', 'Top 10'],
          featured: false,
        },
        {
          id: '6',
          title: 'Behind the Scenes: A Day at Soul FM Studios',
          excerpt: 'Ever wondered what goes on behind the microphone? Take an exclusive tour of our broadcast studios.',
          content: 'Full article content...',
          category: 'station',
          author: 'Station Manager',
          cover_image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&h=500&fit=crop',
          published_at: '2026-01-25T13:00:00Z',
          read_time: 7,
          tags: ['Behind the Scenes', 'Studio', 'Radio'],
          featured: false,
        },
      ];
      
      setArticles(mockArticles);
      setFilteredArticles(mockArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
      setArticles([]);
      setFilteredArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = [...articles];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((article) => article.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.excerpt.toLowerCase().includes(query) ||
          article.author.toLowerCase().includes(query) ||
          article.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((article) =>
        selectedTags.some((tag) => article.tags.includes(tag))
      );
    }

    setFilteredArticles(filtered);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedTags([]);
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = CATEGORIES.find((c) => c.id === categoryId);
    return category ? category.icon : Newspaper;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = CATEGORIES.find((c) => c.id === categoryId);
    return category ? category.color : '#6B7280';
  };

  const allTags = Array.from(new Set(articles.flatMap((a) => a.tags))).sort();
  const featuredArticles = filteredArticles.filter((a) => a.featured);
  const regularArticles = filteredArticles.filter((a) => !a.featured);

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
              <Newspaper className="w-4 h-4 text-[#00d9ff]" />
              <span className="text-[#00d9ff] font-semibold text-sm">NEWS & ARTICLES</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
              Soul FM News
            </h1>
            <p className="text-white/70 text-lg">
              Stay updated with the latest music news, interviews, and station updates
            </p>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    isActive
                      ? 'text-white shadow-lg scale-105'
                      : 'text-white/70 hover:text-white bg-white/10 hover:bg-white/20'
                  }`}
                  style={{
                    backgroundColor: isActive ? category.color : undefined,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                type="text"
                placeholder="Search articles, authors, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#00d9ff]"
              />
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedCategory !== 'all' || selectedTags.length > 0) && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="bg-white/5 text-white border-white/20 hover:bg-white/10"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Tag Filters */}
          {selectedTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-white/70 text-sm font-semibold">Active tags:</span>
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] text-sm font-bold flex items-center gap-1 hover:scale-105 transition-transform"
                >
                  {tag}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card
                key={i}
                className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-white/5" />
                <div className="p-6">
                  <div className="h-6 bg-white/5 rounded mb-3" />
                  <div className="h-4 bg-white/5 rounded mb-2" />
                  <div className="h-4 bg-white/5 rounded w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg mb-2">No articles found</p>
            <p className="text-white/50 text-sm">Try adjusting your filters or search query</p>
          </Card>
        ) : (
          <>
            {/* Featured Articles */}
            {featuredArticles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-[#00d9ff]" />
                  Featured Stories
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {featuredArticles.map((article, index) => {
                    const CategoryIcon = getCategoryIcon(article.category);
                    const categoryColor = getCategoryColor(article.category);

                    return (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group cursor-pointer h-full">
                          {/* Cover Image */}
                          {article.cover_image && (
                            <div className="aspect-video relative overflow-hidden">
                              <img
                                src={article.cover_image}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              
                              {/* Category Badge */}
                              <div
                                className="absolute top-4 left-4 px-3 py-1 rounded-full text-white text-sm font-bold flex items-center gap-1"
                                style={{ backgroundColor: categoryColor }}
                              >
                                <CategoryIcon className="w-3 h-3" />
                                {article.category}
                              </div>
                            </div>
                          )}

                          {/* Content */}
                          <div className="p-6">
                            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[#00d9ff] transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-white/70 mb-4 line-clamp-2">
                              {article.excerpt}
                            </p>

                            {/* Meta */}
                            <div className="flex items-center gap-4 text-white/50 text-sm mb-4">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {article.author}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(article.published_at), 'MMM d, yyyy')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {article.read_time} min
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {article.tags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTag(tag);
                                  }}
                                  className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                    selectedTags.includes(tag)
                                      ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628]'
                                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                                  }`}
                                >
                                  <Tag className="w-3 h-3 inline mr-1" />
                                  {tag}
                                </button>
                              ))}
                            </div>

                            {/* Read More */}
                            <Button
                              variant="outline"
                              className="w-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] border-0 hover:opacity-90 font-semibold"
                              onClick={() => navigate(`/news/${article.id}`)}
                            >
                              Read Full Article
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Regular Articles */}
            {regularArticles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Newspaper className="w-6 h-6 text-[#00d9ff]" />
                  Latest Articles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularArticles.map((article, index) => {
                    const CategoryIcon = getCategoryIcon(article.category);
                    const categoryColor = getCategoryColor(article.category);

                    return (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-[#00d9ff]/50 transition-all overflow-hidden group cursor-pointer h-full flex flex-col">
                          {/* Cover Image */}
                          {article.cover_image && (
                            <div className="aspect-video relative overflow-hidden">
                              <img
                                src={article.cover_image}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              
                              {/* Category Badge */}
                              <div
                                className="absolute top-3 left-3 px-2 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1"
                                style={{ backgroundColor: categoryColor }}
                              >
                                <CategoryIcon className="w-3 h-3" />
                                {article.category}
                              </div>
                            </div>
                          )}

                          {/* Content */}
                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00d9ff] transition-colors line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-white/70 text-sm mb-4 line-clamp-3 flex-1">
                              {article.excerpt}
                            </p>

                            {/* Meta */}
                            <div className="flex items-center gap-3 text-white/50 text-xs mb-3">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {article.author}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {article.read_time} min
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mb-4">
                              {article.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                              {article.tags.length > 2 && (
                                <span className="px-2 py-0.5 text-white/50 text-xs">
                                  +{article.tags.length - 2}
                                </span>
                              )}
                            </div>

                            {/* Read More */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full bg-white/5 text-white border-white/20 hover:bg-gradient-to-r hover:from-[#00d9ff] hover:to-[#00ffaa] hover:text-[#0a1628] hover:border-0"
                              onClick={() => navigate(`/news/${article.id}`)}
                            >
                              Read More
                              <ArrowRight className="w-3 h-3 ml-2" />
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