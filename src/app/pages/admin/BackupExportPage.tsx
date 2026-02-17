import React, { useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Download,
  Upload,
  Database,
  Archive,
  Shield,
  RefreshCw,
  CheckCircle,
  Clock,
  HardDrive,
  FileJson,
  FileAudio,
  Image,
  Loader2,
  AlertCircle,
  FolderArchive,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface BackupItem {
  id: string;
  name: string;
  date: string;
  size: string;
  type: 'full' | 'data' | 'media';
  status: 'completed' | 'in-progress' | 'failed';
}

const RECENT_BACKUPS: BackupItem[] = [
  { id: '1', name: 'Full Backup — Feb 17, 2026', date: '2026-02-17T10:30:00Z', size: '2.4 GB', type: 'full', status: 'completed' },
  { id: '2', name: 'Data Export — Feb 15, 2026', date: '2026-02-15T14:00:00Z', size: '12 MB', type: 'data', status: 'completed' },
  { id: '3', name: 'Media Backup — Feb 14, 2026', date: '2026-02-14T08:00:00Z', size: '1.8 GB', type: 'media', status: 'completed' },
  { id: '4', name: 'Data Export — Feb 10, 2026', date: '2026-02-10T16:00:00Z', size: '11 MB', type: 'data', status: 'completed' },
];

const EXPORT_OPTIONS = [
  {
    id: 'tracks',
    label: 'Track Library',
    description: 'Export all track metadata, tags, and genre info as JSON',
    icon: FileAudio,
    color: '#00d9ff',
    format: 'JSON',
  },
  {
    id: 'playlists',
    label: 'Playlists',
    description: 'Export all playlists with track references',
    icon: FileJson,
    color: '#00ffaa',
    format: 'JSON',
  },
  {
    id: 'schedule',
    label: 'Schedule Data',
    description: 'Export schedule blocks and time slots',
    icon: Clock,
    color: '#FF8C42',
    format: 'JSON',
  },
  {
    id: 'shows',
    label: 'Shows & Podcasts',
    description: 'Export show info, episodes, and descriptions',
    icon: Database,
    color: '#E91E63',
    format: 'JSON',
  },
  {
    id: 'settings',
    label: 'Station Settings',
    description: 'Export all configuration and branding settings',
    icon: Shield,
    color: '#9C27B0',
    format: 'JSON',
  },
  {
    id: 'covers',
    label: 'Cover Art',
    description: 'Download all cover art images as a ZIP archive',
    icon: Image,
    color: '#FFD700',
    format: 'ZIP',
  },
];

function formatBackupDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function BackupExportPage() {
  const [exporting, setExporting] = useState<Set<string>>(new Set());
  const [backupRunning, setBackupRunning] = useState(false);

  const handleExport = async (id: string) => {
    setExporting((prev) => new Set(prev).add(id));
    await new Promise((r) => setTimeout(r, 2000));
    setExporting((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success(`${EXPORT_OPTIONS.find((o) => o.id === id)?.label} exported successfully!`);
  };

  const handleFullBackup = async () => {
    setBackupRunning(true);
    await new Promise((r) => setTimeout(r, 3000));
    setBackupRunning(false);
    toast.success('Full backup completed!');
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
            <p className="text-sm text-white/40 mt-1">Manage backups and export station data</p>
          </div>
          <Button
            onClick={handleFullBackup}
            disabled={backupRunning}
            className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold gap-2"
          >
            {backupRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running Backup...</>
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
                <div className="text-xl font-bold text-white">4.2 GB</div>
                <div className="text-xs text-white/40">Total Data Size</div>
              </div>
            </div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00ffaa]/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00ffaa]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">{RECENT_BACKUPS.length}</div>
                <div className="text-xs text-white/40">Total Backups</div>
              </div>
            </div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#FFD700]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">Today</div>
                <div className="text-xs text-white/40">Last Backup</div>
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
                      <Badge variant="outline" className="text-[10px] text-white/40 border-white/10">{opt.format}</Badge>
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

        {/* Recent Backups */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00ffaa]" />
            Recent Backups
          </h2>
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-white/40 font-medium">Backup</th>
                    <th className="text-left p-3 text-white/40 font-medium">Date</th>
                    <th className="text-left p-3 text-white/40 font-medium">Size</th>
                    <th className="text-left p-3 text-white/40 font-medium">Status</th>
                    <th className="text-right p-3 text-white/40 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_BACKUPS.map((backup) => (
                    <tr key={backup.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Archive className="w-4 h-4 text-white/30" />
                          <span className="text-white/70">{backup.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-white/50 text-xs">{formatBackupDate(backup.date)}</td>
                      <td className="p-3 text-white/50">{backup.size}</td>
                      <td className="p-3">
                        <Badge className="bg-[#00ffaa]/10 text-[#00ffaa] border-0 gap-1 text-[10px]">
                          <CheckCircle className="w-3 h-3" /> Completed
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/40 hover:text-white gap-1"
                          onClick={() => toast.info('Download started')}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
