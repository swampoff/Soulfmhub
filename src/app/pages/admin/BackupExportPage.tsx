import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Download,
  Database,
  Archive,
  Shield,
  CheckCircle,
  Clock,
  HardDrive,
  FileJson,
  FileAudio,
  Image,
  Loader2,
  FolderArchive,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';

interface ExportHistoryItem {
  id: string;
  timestamp: string;
  message: string;
  level: string;
  userId?: string;
}

const EXPORT_OPTIONS = [
  {
    id: 'tracks',
    label: 'Track Library',
    description: 'Export all track metadata, tags, and genre info as JSON',
    icon: FileAudio,
    color: '#00d9ff',
  },
  {
    id: 'playlists',
    label: 'Playlists',
    description: 'Export all playlists with track references',
    icon: FileJson,
    color: '#00ffaa',
  },
  {
    id: 'schedule',
    label: 'Schedule Data',
    description: 'Export schedule blocks and time slots',
    icon: Clock,
    color: '#FF8C42',
  },
  {
    id: 'shows',
    label: 'Shows & Podcasts',
    description: 'Export show info, episodes, and descriptions',
    icon: Database,
    color: '#E91E63',
  },
  {
    id: 'settings',
    label: 'Station Settings',
    description: 'Export all configuration and branding settings',
    icon: Shield,
    color: '#9C27B0',
  },
  {
    id: 'news',
    label: 'News Articles',
    description: 'Export all news and blog articles as JSON',
    icon: FileJson,
    color: '#FFD700',
  },
];

function formatBackupDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function downloadJson(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BackupExportPage() {
  const [exporting, setExporting] = useState<Set<string>>(new Set());
  const [backupRunning, setBackupRunning] = useState(false);
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const result = await api.getExportHistory();
      setHistory(result.history || []);
    } catch (error) {
      console.error('[Backup] Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExport = async (id: string) => {
    setExporting((prev) => new Set(prev).add(id));
    try {
      const data = await api.exportData(id);
      if (data.error) {
        throw new Error(data.error);
      }
      const filename = `soulfm-${id}-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(data, filename);
      toast.success(`${EXPORT_OPTIONS.find((o) => o.id === id)?.label} exported successfully!`);
      loadHistory(); // refresh history
    } catch (error: any) {
      console.error('[Backup] Export error:', error);
      toast.error(`Export failed: ${error.message || 'Unknown error'}`);
    } finally {
      setExporting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleFullBackup = async () => {
    setBackupRunning(true);
    try {
      const data = await api.exportData('full');
      if (data.error) {
        throw new Error(data.error);
      }
      const filename = `soulfm-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(data, filename);
      toast.success('Full backup completed and downloaded!');
      loadHistory();
    } catch (error: any) {
      console.error('[Backup] Full backup error:', error);
      toast.error(`Full backup failed: ${error.message || 'Unknown error'}`);
    } finally {
      setBackupRunning(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Archive className="w-6 h-6 text-[#00d9ff]" />
              Backup & Export
            </h1>
            <p className="text-sm text-white/40 mt-1">Export and download station data as JSON</p>
          </div>
          <Button
            onClick={handleFullBackup}
            disabled={backupRunning}
            className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold gap-2"
          >
            {backupRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Preparing Backup...</>
            ) : (
              <><FolderArchive className="w-4 h-4" /> Full Backup Now</>
            )}
          </Button>
        </div>

        {/* Storage Summary */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00d9ff]/10 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-[#00d9ff]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">{EXPORT_OPTIONS.length}</div>
                <div className="text-xs text-white/40">Export Types</div>
              </div>
            </div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00ffaa]/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00ffaa]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">{history.length}</div>
                <div className="text-xs text-white/40">Total Exports</div>
              </div>
            </div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#FFD700]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">
                  {history.length > 0 ? formatBackupDate(history[0].timestamp).split(',')[0] : 'Never'}
                </div>
                <div className="text-xs text-white/40">Last Export</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Export Options */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-[#00d9ff]" />
            Export Data
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isExporting = exporting.has(opt.id);
              return (
                <motion.div
                  key={opt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-white/5 border-white/10 p-4 hover:bg-white/[0.07] transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${opt.color}15` }}>
                        <Icon className="w-5 h-5" style={{ color: opt.color }} />
                      </div>
                      <Badge variant="outline" className="text-[10px] text-white/40 border-white/10">JSON</Badge>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{opt.label}</h3>
                    <p className="text-xs text-white/40 mb-3">{opt.description}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(opt.id)}
                      disabled={isExporting}
                      className="w-full border-white/10 text-white/60 hover:text-white gap-1"
                    >
                      {isExporting ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Exporting...</>
                      ) : (
                        <><Download className="w-3 h-3" /> Export</>
                      )}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Export History */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00ffaa]" />
            Export History
          </h2>
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#00d9ff] mx-auto mb-2" />
                <p className="text-xs text-white/30">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-xs text-white/30">No exports yet. Use the buttons above to export data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-white/40 font-medium">Export</th>
                      <th className="text-left p-3 text-white/40 font-medium">Date</th>
                      <th className="text-left p-3 text-white/40 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Archive className="w-4 h-4 text-white/30" />
                            <span className="text-white/70">{item.message}</span>
                          </div>
                        </td>
                        <td className="p-3 text-white/50 text-xs">{formatBackupDate(item.timestamp)}</td>
                        <td className="p-3">
                          <Badge className="bg-[#00ffaa]/10 text-[#00ffaa] border-0 gap-1 text-[10px]">
                            <CheckCircle className="w-3 h-3" /> Completed
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
