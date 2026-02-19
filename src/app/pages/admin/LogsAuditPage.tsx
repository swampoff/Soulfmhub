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
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  User,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

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
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await api.getAuditLogs(200);
      const items = (result.logs || []).map((l: any) => ({
        id: l.id || crypto.randomUUID(),
        timestamp: l.timestamp || new Date().toISOString(),
        level: l.level || 'info',
        category: l.category || 'System',
        message: l.message || '',
        details: l.details || undefined,
        userId: l.userId || undefined,
        ip: l.ip || undefined,
      }));
      setLogs(items);
    } catch (error) {
      console.error('[Logs] Error loading:', error);
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm(`Clear all ${logs.length} log entries? This cannot be undone.`)) return;
    try {
      await api.clearAuditLogs();
      setLogs([]);
      toast.success('All logs cleared');
    } catch (error) {
      console.error('[Logs] Clear error:', error);
      toast.error('Failed to clear logs');
    }
  };

  const handleExportLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soulfm-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported');
  };

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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="size-10 animate-spin text-[#00d9ff] mx-auto mb-4" />
            <p className="text-white/60 text-sm">Loading audit logs...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

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
            <Button variant="outline" size="sm" onClick={loadLogs} className="border-white/10 text-white/60 hover:text-white gap-1">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportLogs} className="border-white/10 text-white/60 hover:text-white gap-1">
              <Download className="w-4 h-4" />
              Export
            </Button>
            {logs.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearLogs} className="border-red-500/20 text-red-400/60 hover:text-red-400 gap-1">
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>
            )}
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
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
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
              <p className="text-white/30 text-sm">{logs.length === 0 ? 'No audit logs yet. Actions like uploads, edits, and exports will appear here.' : 'No logs matching your criteria'}</p>
            </div>
          )}
          {filteredLogs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/5 text-xs text-white/25">
              {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}{levelFilter !== 'all' ? ` (filtered from ${logs.length})` : ''}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
