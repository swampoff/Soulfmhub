import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Newspaper,
  Calendar,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { api } from '../../../lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
}

export function NewsManagement() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: 'Soul FM Team',
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      // Mock data for now
      const mockArticles: NewsArticle[] = [
        {
          id: '1',
          title: 'New Soul Classics Added to Rotation',
          excerpt: 'We\'ve just added 50 classic soul tracks from the 70s to our rotation!',
          content: 'Full article content here...',
          author: 'DJ Marcus',
          publishedAt: new Date().toISOString(),
          status: 'published',
          views: 1234
        },
        {
          id: '2',
          title: 'Upcoming Live Show: Funk Friday',
          excerpt: 'Join us this Friday for a special funk music marathon featuring rare grooves.',
          content: 'Full article content here...',
          author: 'DJ Sarah',
          publishedAt: new Date().toISOString(),
          status: 'published',
          views: 856
        }
      ];
      setArticles(mockArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingArticle) {
        // Update article
        toast.success('Article updated successfully');
      } else {
        // Create new article
        toast.success('Article created successfully');
      }
      setShowEditor(false);
      setEditingArticle(null);
      setFormData({ title: '', excerpt: '', content: '', author: 'Soul FM Team' });
      loadArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Failed to save article');
    }
  };

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      author: article.author,
    });
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
      toast.success('Article deleted successfully');
      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Failed to delete article');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/20 text-green-400';
      case 'draft': return 'bg-yellow-500/20 text-yellow-400';
      case 'archived': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <AdminLayout maxWidth="wide">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-righteous text-white">News Management</h1>
            <p className="text-white/60 mt-1 text-sm sm:text-base">Create and manage station news and announcements</p>
          </div>

          <Button
            onClick={() => {
              setEditingArticle(null);
              setFormData({ title: '', excerpt: '', content: '', author: 'Soul FM Team' });
              setShowEditor(true);
            }}
            className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black w-full xs:w-auto"
          >
            <Plus className="size-4 mr-2" />
            New Article
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-[#141414] rounded-lg border border-white/5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-[#00d9ff]/10 rounded-lg flex-shrink-0">
                <Newspaper className="size-4 sm:size-6 text-[#00d9ff]" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-white truncate">{articles.length}</p>
                <p className="text-xs sm:text-sm text-white/60 truncate">Total Articles</p>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-[#141414] rounded-lg border border-white/5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg flex-shrink-0">
                <Eye className="size-4 sm:size-6 text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-white truncate">
                  {articles.filter(a => a.status === 'published').length}
                </p>
                <p className="text-xs sm:text-sm text-white/60 truncate">Published</p>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-[#141414] rounded-lg border border-white/5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-lg flex-shrink-0">
                <EyeOff className="size-4 sm:size-6 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-white truncate">
                  {articles.filter(a => a.status === 'draft').length}
                </p>
                <p className="text-xs sm:text-sm text-white/60 truncate">Drafts</p>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-[#141414] rounded-lg border border-white/5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-purple-500/10 rounded-lg flex-shrink-0">
                <Eye className="size-4 sm:size-6 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-white truncate">
                  {articles.reduce((sum, a) => sum + a.views, 0).toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-white/60 truncate">Total Views</p>
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-4 sm:p-6 bg-[#141414] border-white/5">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {editingArticle ? 'Edit Article' : 'New Article'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEditor(false)}
                    className="flex-shrink-0"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/60 mb-2 block">Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Article title..."
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/60 mb-2 block">Excerpt</label>
                    <Textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="Brief summary..."
                      rows={3}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/60 mb-2 block">Content</label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Full article content..."
                      rows={10}
                      className="bg-white/5 border-white/10 text-white font-mono text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/60 mb-2 block">Author</label>
                    <Input
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Author name..."
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div className="flex flex-col xs:flex-row gap-3 pt-4">
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black w-full xs:w-auto"
                    >
                      <Save className="size-4 mr-2" />
                      Save Article
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowEditor(false)}
                      className="border-white/10 text-white/80 w-full xs:w-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Articles List */}
        <div className="space-y-3 sm:space-y-4">
          {articles.map((article) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 sm:p-6 bg-[#141414] border-white/5 hover:border-white/10 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-white truncate">{article.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(article.status)} self-start xs:self-auto flex-shrink-0`}>
                        {article.status}
                      </span>
                    </div>
                    
                    <p className="text-white/60 mb-3 sm:mb-4 text-sm sm:text-base line-clamp-2">{article.excerpt}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-white/40">
                      <div className="flex items-center gap-1">
                        <User className="size-3 sm:size-4 flex-shrink-0" />
                        <span className="truncate">{article.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3 sm:size-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">{format(new Date(article.publishedAt), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="size-3 sm:size-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">{article.views} views</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-4 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(article)}
                      className="text-white/60 hover:text-white"
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(article.id)}
                      className="text-white/60 hover:text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {articles.length === 0 && !loading && (
          <div className="text-center py-12">
            <Newspaper className="size-12 sm:size-16 mx-auto mb-4 text-white/20" />
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No articles yet</h3>
            <p className="text-sm sm:text-base text-white/60 mb-4">Create your first news article to get started</p>
            <Button
              onClick={() => {
                setEditingArticle(null);
                setFormData({ title: '', excerpt: '', content: '', author: 'Soul FM Team' });
                setShowEditor(true);
              }}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black"
            >
              <Plus className="size-4 mr-2" />
              Create Article
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}