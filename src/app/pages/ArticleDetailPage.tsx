import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Tag,
  Share2,
  Facebook,
  Twitter,
  Link as LinkIcon,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { api } from '../../lib/api';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  author_avatar?: string;
  author_bio?: string;
  cover_image?: string;
  published_at: string;
  read_time: number;
  tags: string[];
}

export function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    setLoading(true);
    try {
      if (!id) throw new Error('No article ID');
      const data = await api.getNewsItem(id);
      const n = data.news || data.article || data;
      if (!n || !n.title) {
        throw new Error('Article not found');
      }
      setArticle({
        id: n.id || id,
        title: n.title,
        excerpt: n.excerpt || n.description || '',
        content: n.content || '',
        category: n.category || 'station',
        author: n.author || 'Soul FM Team',
        author_avatar: n.author_avatar || n.authorAvatar || '',
        author_bio: n.author_bio || n.authorBio || '',
        cover_image: n.cover_image || n.coverImage || '',
        published_at: n.published_at || n.publishedAt || n.createdAt || new Date().toISOString(),
        read_time: n.read_time || n.readTime || 5,
        tags: n.tags || [],
      });
    } catch (error) {
      console.error('Error loading article:', error);
      setArticle(null);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = article?.title || '';

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        // Could show toast notification
        break;
    }
    setShareMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-1/4 mb-8" />
            <div className="aspect-video bg-white/10 rounded-lg mb-8" />
            <div className="h-12 bg-white/10 rounded mb-4" />
            <div className="h-6 bg-white/10 rounded w-3/4 mb-8" />
            <div className="space-y-4">
              <div className="h-4 bg-white/10 rounded" />
              <div className="h-4 bg-white/10 rounded" />
              <div className="h-4 bg-white/10 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
            <p className="text-white/70 text-lg mb-4">Article not found</p>
            <Button
              variant="outline"
              onClick={() => navigate('/news')}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] border-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to News
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Button
            variant="outline"
            onClick={() => navigate('/news')}
            className="bg-white/5 text-white border-white/20 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to News
          </Button>
        </motion.div>

        {/* Article */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
            {/* Cover Image */}
            {article.cover_image && (
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className="p-8 md:p-12">
              {/* Category */}
              <div className="mb-4">
                <span className="px-4 py-2 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] text-sm font-bold uppercase">
                  {article.category}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'var(--font-family-display)' }}>
                {article.title}
              </h1>

              {/* Excerpt */}
              <p className="text-xl text-white/80 mb-8 leading-relaxed">
                {article.excerpt}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 mb-8 pb-8 border-b border-white/10">
                {/* Author */}
                <div className="flex items-center gap-3">
                  {article.author_avatar && (
                    <img
                      src={article.author_avatar}
                      alt={article.author}
                      className="w-12 h-12 rounded-full border-2 border-[#00d9ff]"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <User className="w-4 h-4 text-[#00d9ff]" />
                      {article.author}
                    </div>
                    {article.author_bio && (
                      <div className="text-white/50 text-sm">{article.author_bio}</div>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-white/70">
                  <Calendar className="w-4 h-4 text-[#00d9ff]" />
                  {format(new Date(article.published_at), 'MMMM d, yyyy')}
                </div>

                {/* Read Time */}
                <div className="flex items-center gap-2 text-white/70">
                  <Clock className="w-4 h-4 text-[#00d9ff]" />
                  {article.read_time} min read
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-sm flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Article Content */}
              <div
                className="prose prose-invert prose-lg max-w-none mb-8"
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* Actions */}
              <div className="flex items-center gap-4 pt-8 border-t border-white/10">
                {/* Like */}
                <Button
                  variant="outline"
                  onClick={() => setLiked(!liked)}
                  className={`${
                    liked
                      ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] border-0'
                      : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 mr-2 ${liked ? 'fill-current' : ''}`} />
                  {liked ? 'Liked' : 'Like'}
                </Button>

                {/* Comment */}
                <Button
                  variant="outline"
                  className="bg-white/5 text-white border-white/20 hover:bg-white/10"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Comment
                </Button>

                {/* Share */}
                <div className="relative ml-auto">
                  <Button
                    variant="outline"
                    onClick={() => setShareMenuOpen(!shareMenuOpen)}
                    className="bg-white/5 text-white border-white/20 hover:bg-white/10"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>

                  {shareMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1f2e] border border-white/20 rounded-lg shadow-xl overflow-hidden z-10">
                      <button
                        onClick={() => handleShare('facebook')}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                      >
                        <Facebook className="w-4 h-4" />
                        Facebook
                      </button>
                      <button
                        onClick={() => handleShare('twitter')}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                      >
                        <Twitter className="w-4 h-4" />
                        Twitter
                      </button>
                      <button
                        onClick={() => handleShare('copy')}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Copy Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.article>
      </div>
    </div>
  );
}