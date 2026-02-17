import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  ShoppingBag,
  Star,
  Truck,
  Package,
  Heart,
  Eye,
  Tag,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface MerchItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  colors: string[];
  sizes: string[];
  rating: number;
  reviews: number;
  badge?: string;
  gradient: string;
  emoji: string;
}

const MERCH: MerchItem[] = [
  {
    id: '1',
    name: 'Soul FM Classic Tee',
    description: 'Premium cotton tee with iconic Soul FM logo. Soft, breathable, and perfect for everyday vibes.',
    price: 29.99,
    category: 'Apparel',
    colors: ['Black', 'White', 'Navy'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    rating: 4.8,
    reviews: 156,
    badge: 'Bestseller',
    gradient: 'from-[#00d9ff] to-[#0088cc]',
    emoji: '👕',
  },
  {
    id: '2',
    name: 'Groove Master Hoodie',
    description: 'Stay warm in style. Heavyweight hoodie with embroidered logo and kangaroo pocket.',
    price: 59.99,
    originalPrice: 79.99,
    category: 'Apparel',
    colors: ['Black', 'Charcoal', 'Forest Green'],
    sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.9,
    reviews: 89,
    badge: 'Sale',
    gradient: 'from-[#00ffaa] to-[#00cc88]',
    emoji: '🧥',
  },
  {
    id: '3',
    name: 'Vinyl Vibes Snapback',
    description: 'Structured snapback cap with Soul FM wave embroidery. One size fits all.',
    price: 24.99,
    category: 'Accessories',
    colors: ['Black', 'White'],
    sizes: ['One Size'],
    rating: 4.7,
    reviews: 67,
    gradient: 'from-[#FF8C42] to-[#FF6B1A]',
    emoji: '🧢',
  },
  {
    id: '4',
    name: 'Soul FM Tote Bag',
    description: 'Eco-friendly canvas tote. Carry your records, groceries, or good vibes.',
    price: 19.99,
    category: 'Accessories',
    colors: ['Natural', 'Black'],
    sizes: ['One Size'],
    rating: 4.6,
    reviews: 42,
    gradient: 'from-[#E91E63] to-[#C2185B]',
    emoji: '👜',
  },
  {
    id: '5',
    name: 'Frequency Mug',
    description: 'Ceramic mug with heat-reactive Soul FM waveform. Changes color with hot drinks!',
    price: 16.99,
    category: 'Accessories',
    colors: ['Black/Cyan'],
    sizes: ['11oz', '15oz'],
    rating: 4.9,
    reviews: 203,
    badge: 'New',
    gradient: 'from-[#9C27B0] to-[#7B1FA2]',
    emoji: '☕',
  },
  {
    id: '6',
    name: 'Wave Rider Sticker Pack',
    description: '10 premium vinyl stickers featuring Soul FM designs. Waterproof and UV resistant.',
    price: 9.99,
    category: 'Accessories',
    colors: ['Multi'],
    sizes: ['One Size'],
    rating: 4.8,
    reviews: 312,
    gradient: 'from-[#FFD700] to-[#FFA000]',
    emoji: '🎨',
  },
];

const CATEGORIES = ['All', 'Apparel', 'Accessories'];

export function MerchPage() {
  const [category, setCategory] = useState('All');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const filteredMerch = category === 'All' ? MERCH : MERCH.filter((m) => m.category === category);

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info('Removed from wishlist');
      } else {
        next.add(id);
        toast.success('Added to wishlist!');
      }
      return next;
    });
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E91E63]/10 border border-[#E91E63]/30 mb-6">
            <ShoppingBag className="w-4 h-4 text-[#E91E63]" />
            <span className="text-sm text-[#E91E63] font-medium">Official Merch</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Righteous, cursive' }}
          >
            Soul FM <span className="text-[#00d9ff]">Shop</span>
          </h1>
          <p className="text-cyan-100/60 text-lg max-w-2xl mx-auto">
            Wear the wave. Rep Soul FM with premium merch designed for music lovers.
          </p>
        </motion.div>

        {/* Promo Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-[#00d9ff]/15 to-[#00ffaa]/10 border-[#00d9ff]/20 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00d9ff]/20 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#00d9ff]" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Free Shipping on orders $50+</div>
                  <div className="text-white/40 text-xs">Use code SOULWAVE at checkout</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white/50 text-xs">
                  <Package className="w-4 h-4" /> 2-5 day delivery
                </div>
                <div className="flex items-center gap-2 text-white/50 text-xs">
                  <Zap className="w-4 h-4" /> Eco-friendly packaging
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat)}
              className={
                category === cat
                  ? 'bg-[#00d9ff] text-slate-900 font-bold'
                  : 'border-white/10 text-white/60 hover:text-white hover:bg-white/5'
              }
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMerch.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-white/5 border-white/10 overflow-hidden hover:border-white/20 transition-all group">
                {/* Product Image Placeholder */}
                <div className={`relative h-52 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                  <span className="text-7xl">{item.emoji}</span>
                  {item.badge && (
                    <Badge
                      className={`absolute top-3 left-3 ${
                        item.badge === 'Sale'
                          ? 'bg-red-500/90 text-white'
                          : item.badge === 'New'
                          ? 'bg-[#00ffaa]/90 text-slate-900'
                          : 'bg-[#FFD700]/90 text-slate-900'
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                  <button
                    onClick={() => toggleWishlist(item.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${wishlist.has(item.id) ? 'text-red-400 fill-red-400' : 'text-white/70'}`}
                    />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(5)].map((_, si) => (
                      <Star
                        key={si}
                        className={`w-3 h-3 ${si < Math.floor(item.rating) ? 'text-[#FFD700] fill-[#FFD700]' : 'text-white/20'}`}
                      />
                    ))}
                    <span className="text-xs text-white/40 ml-1">({item.reviews})</span>
                  </div>
                  <h3 className="text-white font-bold mb-1 group-hover:text-[#00d9ff] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-white/40 line-clamp-2 mb-3">{item.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.colors.map((c) => (
                      <span key={c} className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-white">${item.price.toFixed(2)}</span>
                      {item.originalPrice && (
                        <span className="text-sm text-white/30 line-through">${item.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold text-xs gap-1"
                      onClick={() => toast.success(`${item.name} added to cart!`)}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
