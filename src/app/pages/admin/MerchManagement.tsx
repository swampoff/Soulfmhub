import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  RefreshCw,
  Tag,
  DollarSign,
  Star,
  Package,
  Eraser,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { toast } from 'sonner';

interface MerchItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  category: string;
  colors: string[];
  sizes: string[];
  rating: number;
  reviews: number;
  badge?: string | null;
  gradient: string;
  emoji: string;
  image?: string | null;
  inStock?: boolean;
  sortOrder?: number;
  createdAt?: string;
}

const CATEGORY_OPTIONS = ['Apparel', 'Accessories', 'Music', 'Collectibles'];
const BADGE_OPTIONS = ['', 'New', 'Sale', 'Best Seller', 'Limited'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const GRADIENT_OPTIONS = [
  { label: 'Cyan → Mint', value: 'from-[#00d9ff] to-[#00ffaa]' },
  { label: 'Pink → Orange', value: 'from-[#E91E63] to-[#FF8C42]' },
  { label: 'Purple → Pink', value: 'from-[#9C27B0] to-[#E91E63]' },
  { label: 'Gold → Orange', value: 'from-[#FFD700] to-[#FF8C42]' },
  { label: 'Blue → Purple', value: 'from-[#2196F3] to-[#9C27B0]' },
  { label: 'Green → Cyan', value: 'from-[#4CAF50] to-[#00d9ff]' },
];
const EMOJI_OPTIONS = ['🎵', '🎧', '👕', '🧢', '🎤', '🎸', '💿', '🏖️', '🌊', '✨', '🔥', '🎶'];

const emptyItem: Omit<MerchItem, 'id'> = {
  name: '',
  description: '',
  price: 0,
  originalPrice: null,
  category: 'Apparel',
  colors: [],
  sizes: [],
  rating: 0,
  reviews: 0,
  badge: null,
  gradient: 'from-[#00d9ff] to-[#00ffaa]',
  emoji: '🎵',
  image: null,
  inStock: true,
  sortOrder: 0,
};

export function MerchManagement() {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<MerchItem, 'id'>>(emptyItem);
  const [colorInput, setColorInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [confirmPurge, setConfirmPurge] = useState(false);

  useEffect(() => {
    loadMerch();
  }, []);

  const loadMerch = async () => {
    setLoading(true);
    try {
      const res = await api.getMerch();
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (error) {
      console.error('Error loading merch:', error);
      toast.error('Failed to load merch items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await api.updateMerchItem(editingId, form);
        if (res.item) {
          setItems(prev => prev.map(i => i.id === editingId ? res.item : i));
          toast.success('Item updated');
        }
      } else {
        const res = await api.createMerchItem(form);
        if (res.item) {
          setItems(prev => [...prev, res.item]);
          toast.success('Item created');
        }
      }
      resetForm();
    } catch (error: any) {
      console.error('Save merch error:', error);
      toast.error(error.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this merch item?')) return;
    try {
      await api.deleteMerchItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Item deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    }
  };

  const handlePurgeAll = async () => {
    try {
      for (const item of items) {
        await api.deleteMerchItem(item.id);
      }
      setItems([]);
      setConfirmPurge(false);
      toast.success('All merch items purged');
    } catch (error: any) {
      toast.error(error.message || 'Failed to purge');
    }
  };

  const handleSeed = async () => {
    try {
      const res = await api.seedMerch();
      toast.success(res.message || 'Merch seeded');
      await loadMerch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to seed');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyItem);
    setColorInput('');
  };

  const startEdit = (item: MerchItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price || 0,
      originalPrice: item.originalPrice || null,
      category: item.category || 'Apparel',
      colors: item.colors || [],
      sizes: item.sizes || [],
      rating: item.rating || 0,
      reviews: item.reviews || 0,
      badge: item.badge || null,
      gradient: item.gradient || 'from-[#00d9ff] to-[#00ffaa]',
      emoji: item.emoji || '🎵',
      image: item.image || null,
      inStock: item.inStock ?? true,
      sortOrder: item.sortOrder || 0,
    });
    setShowForm(true);
  };

  const addColor = () => {
    if (colorInput.trim() && !form.colors.includes(colorInput.trim())) {
      setForm(prev => ({ ...prev, colors: [...prev.colors, colorInput.trim()] }));
      setColorInput('');
    }
  };

  const removeColor = (c: string) => {
    setForm(prev => ({ ...prev, colors: prev.colors.filter(x => x !== c) }));
  };

  const toggleSize = (s: string) => {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(s) ? prev.sizes.filter(x => x !== s) : [...prev.sizes, s],
    }));
  };

  const filtered = items
    .filter(i => filter === 'all' || i.category === filter)
    .filter(i => !search || (i.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Righteous, cursive' }}>
              <ShoppingBag className="size-7 text-[#E91E63]" />
              Merch Management
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''} in catalog
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={loadMerch} disabled={loading} className="text-white/40 hover:text-white">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSeed} className="border-white/10 text-white/60 hover:text-white text-xs">
              <Package className="size-3.5 mr-1" /> Seed
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmPurge(true)} className="border-red-500/20 text-red-400/70 hover:text-red-400 text-xs">
              <Eraser className="size-3.5 mr-1" /> Purge All
            </Button>
            <Button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold text-xs gap-1"
            >
              <Plus className="size-4" /> Add Item
            </Button>
          </div>
        </div>

        {/* Purge Confirmation */}
        <AnimatePresence>
          {confirmPurge && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="bg-red-500/10 border-red-500/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="size-5" />
                  <span className="text-sm font-medium">Delete ALL {items.length} merch items? This cannot be undone.</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmPurge(false)} className="text-white/50">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handlePurgeAll} className="bg-red-500 text-white hover:bg-red-600">
                    Confirm Purge
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 sm:max-w-xs"
          />
          <div className="flex gap-1 flex-wrap">
            {['all', ...CATEGORY_OPTIONS].map(cat => (
              <Button
                key={cat}
                variant={filter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(cat)}
                className={filter === cat ? 'bg-[#00d9ff] text-slate-900 font-bold text-xs' : 'border-white/10 text-white/50 text-xs'}
              >
                {cat === 'all' ? 'All' : cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="bg-white/5 border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">
                    {editingId ? 'Edit Item' : 'New Merch Item'}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={resetForm} className="text-white/40">
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Name *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Soul FM T-Shirt"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Price ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  {/* Original Price */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Original Price ($, for sales)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.originalPrice || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || null }))}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Leave empty if no sale"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                    >
                      {CATEGORY_OPTIONS.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                    </select>
                  </div>

                  {/* Badge */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Badge</label>
                    <select
                      value={form.badge || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, badge: e.target.value || null }))}
                      className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                    >
                      {BADGE_OPTIONS.map(b => <option key={b} value={b} className="bg-slate-900">{b || 'None'}</option>)}
                    </select>
                  </div>

                  {/* In Stock */}
                  <div className="flex items-end gap-2 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.inStock ?? true}
                        onChange={(e) => setForm(prev => ({ ...prev, inStock: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm text-white/70">In Stock</span>
                    </label>
                  </div>

                  {/* Description — full width */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-xs text-white/50 mb-1 block">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full h-20 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm resize-none"
                      placeholder="Describe the item..."
                    />
                  </div>

                  {/* Emoji */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Emoji</label>
                    <div className="flex flex-wrap gap-1">
                      {EMOJI_OPTIONS.map(e => (
                        <button
                          key={e}
                          onClick={() => setForm(prev => ({ ...prev, emoji: e }))}
                          className={`w-8 h-8 rounded-md text-lg flex items-center justify-center transition-all ${
                            form.emoji === e ? 'bg-[#00d9ff]/20 ring-1 ring-[#00d9ff]' : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gradient */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Gradient</label>
                    <div className="flex flex-wrap gap-1.5">
                      {GRADIENT_OPTIONS.map(g => (
                        <button
                          key={g.value}
                          onClick={() => setForm(prev => ({ ...prev, gradient: g.value }))}
                          className={`w-8 h-8 rounded-md bg-gradient-to-br ${g.value} transition-all ${
                            form.gradient === g.value ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : 'opacity-60 hover:opacity-100'
                          }`}
                          title={g.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Image URL (optional)</label>
                    <Input
                      value={form.image || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value || null }))}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Sizes */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Sizes</label>
                    <div className="flex flex-wrap gap-1">
                      {SIZE_OPTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => toggleSize(s)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                            form.sizes.includes(s)
                              ? 'bg-[#00d9ff]/20 text-[#00d9ff] ring-1 ring-[#00d9ff]/40'
                              : 'bg-white/5 text-white/40 hover:text-white/60'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Colors</label>
                    <div className="flex gap-1 mb-1 flex-wrap">
                      {form.colors.map(c => (
                        <Badge key={c} variant="outline" className="text-xs text-white/60 border-white/10 gap-1">
                          {c}
                          <button onClick={() => removeColor(c)} className="text-red-400 hover:text-red-300">
                            <X className="size-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Input
                        value={colorInput}
                        onChange={(e) => setColorInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                        placeholder="Add color..."
                        className="bg-white/5 border-white/10 text-white text-xs h-7"
                      />
                      <Button size="sm" variant="ghost" onClick={addColor} className="h-7 text-white/40 text-xs">
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Rating & Reviews */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-white/50 mb-1 block">Rating (0-5)</label>
                      <Input
                        type="number" min="0" max="5" step="0.1"
                        value={form.rating}
                        onChange={(e) => setForm(prev => ({ ...prev, rating: parseFloat(e.target.value) || 0 }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-white/50 mb-1 block">Reviews</label>
                      <Input
                        type="number" min="0"
                        value={form.reviews}
                        onChange={(e) => setForm(prev => ({ ...prev, reviews: parseInt(e.target.value) || 0 }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview + Actions */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${form.gradient} flex items-center justify-center text-2xl`}>
                      {form.emoji}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{form.name || 'Untitled'}</p>
                      <p className="text-white/40 text-xs">${(form.price || 0).toFixed(2)} &middot; {form.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={resetForm} className="text-white/40">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving} className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold">
                      {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
                      {editingId ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="size-8 text-cyan-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 bg-white/5 border-white/10 text-center">
            <ShoppingBag className="size-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Items</h3>
            <p className="text-white/40 mb-4">
              {items.length === 0 ? 'Add merch or use Seed to populate default items.' : 'No items match the current filter.'}
            </p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="bg-white/5 border-white/10 overflow-hidden hover:border-white/20 transition-all group">
                    {/* Preview */}
                    <div className={`relative h-32 bg-gradient-to-br ${item.gradient || 'from-[#00d9ff] to-[#00ffaa]'} flex items-center justify-center`}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-5xl">{item.emoji || '🎵'}</span>
                      )}
                      {item.badge && (
                        <Badge className={`absolute top-2 left-2 text-[10px] ${
                          item.badge === 'Sale' ? 'bg-red-500/90 text-white'
                            : item.badge === 'New' ? 'bg-[#00ffaa]/90 text-slate-900'
                            : 'bg-[#FFD700]/90 text-slate-900'
                        }`}>
                          {item.badge}
                        </Badge>
                      )}
                      {item.inStock === false && (
                        <Badge className="absolute top-2 right-2 bg-gray-600/90 text-white text-[10px]">Out of Stock</Badge>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-white font-medium text-sm line-clamp-1">{item.name || 'Untitled'}</h3>
                        <span className="text-[#00d9ff] font-bold text-sm whitespace-nowrap">${(item.price || 0).toFixed(2)}</span>
                      </div>
                      <p className="text-white/30 text-xs line-clamp-1 mb-2">{item.description || 'No description'}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px] text-white/40 border-white/10">{item.category || 'Other'}</Badge>
                          {(item.rating || 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[#FFD700]">
                              <Star className="size-2.5 fill-[#FFD700]" /> {item.rating}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-6 w-6 p-0 text-white/40 hover:text-[#00d9ff]">
                            <Edit2 className="size-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-6 w-6 p-0 text-white/40 hover:text-red-400">
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
