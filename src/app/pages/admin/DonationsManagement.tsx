import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  TrendingUp,
  Users,
  Heart,
  Search,
  RefreshCw,
  Gift,
  Calendar,
  ArrowUpRight,
  Target,
  Sparkles,
  Coffee,
  Award,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Donation {
  id: string;
  name: string;
  email?: string;
  amount: number;
  tier?: string;
  message?: string;
  isAnonymous?: boolean;
  createdAt: string;
}

interface DonationStats {
  total: number;
  count: number;
  monthlyGoal: number;
}

export function DonationsManagement() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<DonationStats>({ total: 0, count: 0, monthlyGoal: 2000 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'amount'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [donationsRes, statsRes] = await Promise.all([
        api.getDonations(),
        api.getDonationStats(),
      ]);

      const rawDonations: Donation[] = donationsRes.donations || [];
      // Filter out stats objects that may be included
      const realDonations = rawDonations.filter((d: any) => d.id && d.amount !== undefined);
      setDonations(realDonations);

      if (statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (error: any) {
      console.error('Error loading donations:', error);
      toast.error('Failed to load donations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedDonations = [...donations]
    .filter((d) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (d.name || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q) ||
        (d.message || '').toLowerCase().includes(q) ||
        (d.tier || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const valA = sortField === 'amount' ? a.amount : new Date(a.createdAt).getTime();
      const valB = sortField === 'amount' ? b.amount : new Date(b.createdAt).getTime();
      return sortDir === 'desc' ? valB - valA : valA - valB;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const goalProgress = stats.monthlyGoal > 0 ? Math.min((stats.total / stats.monthlyGoal) * 100, 100) : 0;
  const averageDonation = stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00';

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? (
      <ChevronDown className="size-3.5 inline ml-0.5" />
    ) : (
      <ChevronUp className="size-3.5 inline ml-0.5" />
    );
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'soul-legend': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'groove': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'vinyl': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'coffee': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const getTierLabel = (tier?: string) => {
    switch (tier) {
      case 'soul-legend': return 'Soul Legend';
      case 'groove': return 'Groove Master';
      case 'vinyl': return 'Vinyl Supporter';
      case 'coffee': return 'Coffee Break';
      default: return tier || 'One-time';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
              Donation Management
            </h1>
            <p className="text-white/60 mt-1">Track and manage supporter contributions</p>
          </div>
          <Button
            onClick={loadData}
            disabled={loading}
            variant="outline"
            className="bg-white/5 text-white border-white/20 hover:bg-white/10 gap-2"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="size-5 text-green-400" />
                </div>
                <div className="text-sm text-white/60">Total Raised</div>
              </div>
              <div className="text-3xl font-bold text-white">${stats.total.toFixed(2)}</div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="bg-gradient-to-br from-[#00d9ff]/10 to-blue-500/10 border-[#00d9ff]/20 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#00d9ff]/20 flex items-center justify-center">
                  <Users className="size-5 text-[#00d9ff]" />
                </div>
                <div className="text-sm text-white/60">Total Donors</div>
              </div>
              <div className="text-3xl font-bold text-white">{stats.count}</div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="size-5 text-purple-400" />
                </div>
                <div className="text-sm text-white/60">Avg Donation</div>
              </div>
              <div className="text-3xl font-bold text-white">${averageDonation}</div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="bg-gradient-to-br from-[#00ffaa]/10 to-emerald-500/10 border-[#00ffaa]/20 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#00ffaa]/20 flex items-center justify-center">
                  <Target className="size-5 text-[#00ffaa]" />
                </div>
                <div className="text-sm text-white/60">Monthly Goal</div>
              </div>
              <div className="text-3xl font-bold text-white">{goalProgress.toFixed(0)}%</div>
              <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="mt-1 text-xs text-white/40">
                ${stats.total.toFixed(0)} / ${stats.monthlyGoal.toFixed(0)}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Donations List */}
        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <Input
                placeholder="Search donors, messages, tiers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span>{sortedDonations.length} donation{sortedDonations.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1fr_120px_140px_180px_1fr] gap-4 px-6 py-3 bg-white/5 text-xs uppercase tracking-wider text-white/40 font-semibold">
            <div>Donor</div>
            <button onClick={() => toggleSort('amount')} className="text-left hover:text-white/60 transition-colors">
              Amount <SortIcon field="amount" />
            </button>
            <div>Tier</div>
            <button onClick={() => toggleSort('createdAt')} className="text-left hover:text-white/60 transition-colors">
              Date <SortIcon field="createdAt" />
            </button>
            <div>Message</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="p-12 text-center text-white/40">
              <RefreshCw className="size-8 mx-auto mb-3 animate-spin text-[#00d9ff]" />
              <p>Loading donations...</p>
            </div>
          ) : sortedDonations.length === 0 ? (
            <div className="p-12 text-center">
              <Heart className="size-12 mx-auto mb-3 text-white/20" />
              <p className="text-white/40">
                {searchQuery ? 'No donations match your search' : 'No donations yet'}
              </p>
              <p className="text-white/30 text-sm mt-1">
                Donations from the Support page will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              <AnimatePresence>
                {sortedDonations.map((donation, i) => (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="px-4 md:px-6 py-4 hover:bg-white/5 transition-colors"
                  >
                    {/* Desktop layout */}
                    <div className="hidden md:grid grid-cols-[1fr_120px_140px_180px_1fr] gap-4 items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center text-xs font-bold text-black">
                            {donation.isAnonymous ? '?' : (donation.name || 'A')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {donation.isAnonymous ? 'Anonymous' : donation.name || 'Supporter'}
                            </div>
                            {donation.email && !donation.isAnonymous && (
                              <div className="text-xs text-white/40">{donation.email}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-[#00ffaa]">
                        ${Number(donation.amount).toFixed(2)}
                      </div>
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getTierColor(donation.tier)}`}>
                          {getTierLabel(donation.tier)}
                        </span>
                      </div>
                      <div className="text-sm text-white/50" title={donation.createdAt}>
                        {format(new Date(donation.createdAt), 'MMM d, yyyy HH:mm')}
                      </div>
                      <div className="text-sm text-white/60 truncate">
                        {donation.message || <span className="text-white/30 italic">No message</span>}
                      </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] flex items-center justify-center text-xs font-bold text-black">
                            {donation.isAnonymous ? '?' : (donation.name || 'A')[0].toUpperCase()}
                          </div>
                          <div className="text-sm font-medium text-white">
                            {donation.isAnonymous ? 'Anonymous' : donation.name || 'Supporter'}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-[#00ffaa]">
                          ${Number(donation.amount).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getTierColor(donation.tier)}`}>
                          {getTierLabel(donation.tier)}
                        </span>
                        <span className="text-xs text-white/40">
                          {formatDistanceToNow(new Date(donation.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {donation.message && (
                        <p className="text-sm text-white/60">{donation.message}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
