import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  FileText,
  AlertTriangle,
  Info,
  Search,
  Filter,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  Radio,
  User,
  Settings,
  Music,
  Shield,
} from 'lucide-react';
import { motion } from 'motion/react';

type LogLevel = 'all' | 'info' | 'warning' | 'error' | 'success';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  details?: string;
  userId?: string;
  ip?: string;
}

function generateMockLogs(): LogEntry[] {
  const now = new Date();
  const entries: LogEntry[] = [
    { id: '1', timestamp: new Date(now.getTime() - 120000).toISOString(), level: 'info', category: 'Auth', message: 'Admin logged in via PIN', userId: 'admin-pin', ip: '192.168.1.10' },
    { id: '2', timestamp: new Date(now.getTime() - 300000).toISOString(), level: 'success', category: 'Media', message: 'Track uploaded successfully: "Summer Breeze.mp3"', userId: 'admin-pin' },
    { id: '3', timestamp: new Date(now.getTime() - 450000).toISOString(), level: 'info', category: 'Stream', message: 'Stream status checked — online, 142 listeners' },
    { id: '4', timestamp: new Date(now.getTime() - 600000).toISOString(), level: 'warning', category: 'Storage', message: 'Storage bucket "tracks" approaching 80% capacity' },
    { id: '5', timestamp: new Date(now.getTime() - 900000).toISOString(), level: 'error', category: 'API', message: 'Failed to fetch metadata for track ID: trk_abc123', details: 'Timeout after 15000ms' },
    { id: '6', timestamp: new Date(now.getTime() - 1200000).toISOString(), level: 'info', category: 'Schedule', message: 'Playlist rotation updated for evening slot' },
    { id: '7', timestamp: new Date(now.getTime() - 1500000).toISOString(), level: 'success', category: 'System', message: 'Server health check passed — all services operational' },
    { id: '8', timestamp: new Date(now.getTime() - 1800000).toISOString(), level: 'info', category: 'Auth', message: 'Admin session extended', userId: 'admin-pin' },
    { id: '9', timestamp: new Date(now.getTime() - 2100000).toISOString(), level: 'warning', category: 'Stream', message: 'Listener count dropped below threshold (< 10)' },
    { id: '10', timestamp: new Date(now.getTime() - 2400000).toISOString(), level: 'error', category: 'Media', message: 'Cover art upload failed: file exceeds 5MB limit', userId: 'admin-pin' },
    { id: '11', timestamp: new Date(now.getTime() - 3000000).toISOString(), level: 'success', category: 'Media', message: 'Track metadata updated: "Night Jazz Session"', userId: 'admin-pin' },
    { id: '12', timestamp: new Date(now.getTime() - 3600000).toISOString(), level: 'info', category: 'System', message: 'KV store cleanup — 0 expired entries removed' },
    { id: '13', timestamp: new Date(now.getTime() - 4200000).toISOString(), level: 'info', category: 'Interactive', message: 'Song request received: "Superstition" by Stevie Wonder' },
    { id: '14', timestamp: new Date(now.getTime() - 5000000).toISOString(), level: 'warning', category: 'Auth', message: 'Invalid PIN attempt detected', ip: '10.0.0.55' },
    { id: '15', timestamp: new Date(now.getTime() - 7200000).toISOString(), level: 'success', category: 'Stream', message: 'Auto DJ seamless transition completed' },
  ];
  return entries;
}

const LEVEL_CONFIG = {
  info: { icon: Info, color: '#00d9ff', bg: 'bg-[#00d9ff]/10', text: 'text-[#00d9ff]', label: 'Info' },
  warning: { icon: AlertTriangle, color: '#FFD700', bg: 'bg-[#FFD700]/10', text: 'text-[#FFD700]', label: 'Warning' },
  error: { icon: XCircle, color: '#EF4444', bg: 'bg-red-500/10', text: 'text-red-400', label: 'Error' },
  success: { icon: CheckCircle, color: '#00ffaa', bg: 'bg-[#00ffaa]/10', text: 'text-[#00ffaa]', label: 'Success' },
};

function formatLogTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
    ' ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function LogsAuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogs(generateMockLogs());
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = !search || log.message.toLowerCase().includes(search.toLowerCase()) || log.category.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const levelCounts = {
    all: logs.length,
    info: logs.filter((l) => l.level === 'info').length,
    warning: logs.filter((l) => l.level === 'warning').length,
    error: logs.filter((l) => l.level === 'error').length,
    success: logs.filter((l) => l.level === 'success').length,
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLogs(generateMockLogs());
      setLoading(false);
    }, 500);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#00d9ff]" />
              Logs & Audit Trail
            </h1>
            <p className="text-sm text-white/40 mt-1">Monitor system events, errors, and admin activity</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="border-white/10 text-white/60 hover:text-white gap-1">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="border-white/10 text-white/60 hover:text-white gap-1">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.entries(levelCounts) as [LogLevel, number][]).map(([level, count]) => {
            const config = level === 'all'
              ? { icon: FileText, color: '#fff', bg: 'bg-white/10', text: 'text-white', label: 'Total' }
              : LEVEL_CONFIG[level];
            const Icon = config.icon;
            return (
              <Card
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`p-3 cursor-pointer transition-all border ${
                  levelFilter === level ? 'border-white/20 bg-white/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{count}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">{config.label}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        {/* Logs Table */}
        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-white/40 font-medium">Level</th>
                  <th className="text-left p-3 text-white/40 font-medium">Time</th>
                  <th className="text-left p-3 text-white/40 font-medium">Category</th>
                  <th className="text-left p-3 text-white/40 font-medium">Message</th>
                  <th className="text-left p-3 text-white/40 font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => {
                  const config = LEVEL_CONFIG[log.level];
                  const Icon = config.icon;
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="p-3">
                        <Badge className={`${config.bg} ${config.text} border-0 gap-1 text-[10px]`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-white/50 whitespace-nowrap text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatLogTime(log.timestamp)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-white/60 text-xs bg-white/5 px-2 py-0.5 rounded">{log.category}</span>
                      </td>
                      <td className="p-3 text-white/70 max-w-md">
                        <div className="truncate">{log.message}</div>
                        {log.details && <div className="text-xs text-white/30 mt-0.5">{log.details}</div>}
                      </td>
                      <td className="p-3">
                        {log.userId ? (
                          <span className="flex items-center gap-1 text-xs text-white/40">
                            <User className="w-3 h-3" />
                            {log.userId}
                          </span>
                        ) : log.ip ? (
                          <span className="text-xs text-white/30">{log.ip}</span>
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No logs matching your criteria</p>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
