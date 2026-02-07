import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Loader2,
  Music,
  Radio
} from 'lucide-react';

interface Schedule {
  id: string;
  playlistId: string;
  playlistName?: string;
  playlistColor?: string;
  dayOfWeek: number | null; // 0=Sun, 1=Mon, ... 6=Sat, null=every day
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  title: string;
  isActive: boolean;
  repeatWeekly: boolean;
  createdAt: string;
}

interface Playlist {
  id: string;
  name: string;
  color: string;
  trackIds: string[];
}

const DAYS_OF_WEEK = [
  { value: null, label: 'Every Day', short: 'All' },
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export function ScheduleManagement() {
  const { user } = useApp();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  const [newSchedule, setNewSchedule] = useState({
    playlistId: '',
    dayOfWeek: null as number | null,
    startTime: '00:00',
    endTime: '00:00',
    title: '',
    isActive: true,
    repeatWeekly: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedulesData, playlistsData] = await Promise.all([
        api.getAllSchedules(),
        api.getAllPlaylists()
      ]);
      setSchedules(schedulesData.schedules || []);
      setPlaylists(playlistsData.playlists || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.playlistId) {
      toast.error('Please select a playlist');
      return;
    }

    if (!newSchedule.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      await api.createSchedule(newSchedule);
      toast.success('Schedule created successfully!');
      setIsCreateDialogOpen(false);
      setNewSchedule({
        playlistId: '',
        dayOfWeek: null,
        startTime: '00:00',
        endTime: '00:00',
        title: '',
        isActive: true,
        repeatWeekly: true
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create schedule');
    }
  };

  const handleUpdateSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      await api.updateSchedule(selectedSchedule.id, {
        playlistId: selectedSchedule.playlistId,
        dayOfWeek: selectedSchedule.dayOfWeek,
        startTime: selectedSchedule.startTime,
        endTime: selectedSchedule.endTime,
        title: selectedSchedule.title,
        isActive: selectedSchedule.isActive,
        repeatWeekly: selectedSchedule.repeatWeekly
      });
      toast.success('Schedule updated successfully!');
      setIsEditDialogOpen(false);
      setSelectedSchedule(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      await api.deleteSchedule(scheduleId);
      toast.success('Schedule deleted');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete schedule');
    }
  };

  const toggleScheduleActive = async (schedule: Schedule) => {
    try {
      await api.updateSchedule(schedule.id, {
        ...schedule,
        isActive: !schedule.isActive
      });
      toast.success(`Schedule ${!schedule.isActive ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update schedule');
    }
  };

  const getDayLabel = (dayOfWeek: number | null) => {
    const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek);
    return day?.short || 'All';
  };

  const getPlaylistInfo = (playlistId: string) => {
    return playlists.find(p => p.id === playlistId);
  };

  // Sort schedules by day and time
  const sortedSchedules = [...schedules].sort((a, b) => {
    if (a.dayOfWeek === null && b.dayOfWeek !== null) return -1;
    if (a.dayOfWeek !== null && b.dayOfWeek === null) return 1;
    if (a.dayOfWeek !== b.dayOfWeek) return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
    return a.startTime.localeCompare(b.startTime);
  });

  if (loading && schedules.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#00d9ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-[#00d9ff]" />
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              Schedule Management
            </h2>
            <p className="text-white/70 text-sm">Program your radio station with time-based playlists</p>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]">
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white">Create Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="playlist">Playlist *</Label>
                <Select
                  value={newSchedule.playlistId}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, playlistId: value })}
                >
                  <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    <SelectValue placeholder="Select a playlist" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    {playlists.map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: playlist.color }}
                          />
                          {playlist.name} ({playlist.trackIds?.length || 0} tracks)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Program Title *</Label>
                <Input
                  id="title"
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  placeholder="e.g., Morning Funk, Weekend Vibes"
                  className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                />
              </div>

              <div>
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={newSchedule.dayOfWeek === null ? 'all' : String(newSchedule.dayOfWeek)}
                  onValueChange={(value) =>
                    setNewSchedule({ ...newSchedule, dayOfWeek: value === 'all' ? null : parseInt(value) })
                  }
                >
                  <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value === null ? 'all' : day.value} value={day.value === null ? 'all' : String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time *</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateSchedule}
                  className="flex-1 bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
                >
                  Create Schedule
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-[#00d9ff]/30"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#00d9ff]/20 rounded-lg">
              <Calendar className="w-6 h-6 text-[#00d9ff]" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Total Schedules</p>
              <p className="text-2xl font-bold text-white">{schedules.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00ffaa]/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#00ffaa]/20 rounded-lg">
              <Radio className="w-6 h-6 text-[#00ffaa]" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Active Now</p>
              <p className="text-2xl font-bold text-white">
                {schedules.filter(s => s.isActive).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#FF8C42]/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#FF8C42]/20 rounded-lg">
              <Music className="w-6 h-6 text-[#FF8C42]" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Available Playlists</p>
              <p className="text-2xl font-bold text-white">{playlists.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Schedules List */}
      <Card className="bg-[#0f1c2e]/90 backdrop-blur-sm border-[#00d9ff]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">Program</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">Playlist</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">Day</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">Time</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sortedSchedules.map((schedule) => {
                  const playlist = getPlaylistInfo(schedule.playlistId);
                  return (
                    <motion.tr
                      key={schedule.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleScheduleActive(schedule)}
                          className={`${
                            schedule.isActive ? 'text-[#00ffaa]' : 'text-white/30'
                          } hover:bg-transparent`}
                        >
                          <div className={`w-3 h-3 rounded-full ${
                            schedule.isActive ? 'bg-[#00ffaa]' : 'bg-white/30'
                          }`} />
                        </Button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{schedule.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        {playlist && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: playlist.color }}
                            />
                            <span className="text-white/90">{playlist.name}</span>
                            <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                              {playlist.trackIds?.length || 0}
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="border-[#00d9ff]/30 text-[#00d9ff]">
                          {getDayLabel(schedule.dayOfWeek)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-white/90">
                          <Clock className="w-4 h-4" />
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setIsEditDialogOpen(true);
                            }}
                            className="hover:bg-[#00d9ff]/10"
                          >
                            <Edit className="w-4 h-4 text-[#00d9ff]" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="hover:bg-[#FF8C42]/10"
                          >
                            <Trash2 className="w-4 h-4 text-[#FF8C42]" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {schedules.length === 0 && (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-white/30" />
              <h3 className="text-xl font-semibold text-white mb-2">No Schedules Yet</h3>
              <p className="text-white/70 mb-6">Create your first broadcast schedule</p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">Edit Schedule</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Playlist *</Label>
                <Select
                  value={selectedSchedule.playlistId}
                  onValueChange={(value) => setSelectedSchedule({ ...selectedSchedule, playlistId: value })}
                >
                  <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    {playlists.map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: playlist.color }}
                          />
                          {playlist.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Program Title *</Label>
                <Input
                  value={selectedSchedule.title}
                  onChange={(e) => setSelectedSchedule({ ...selectedSchedule, title: e.target.value })}
                  className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                />
              </div>

              <div>
                <Label>Day of Week</Label>
                <Select
                  value={selectedSchedule.dayOfWeek === null ? 'all' : String(selectedSchedule.dayOfWeek)}
                  onValueChange={(value) =>
                    setSelectedSchedule({ ...selectedSchedule, dayOfWeek: value === 'all' ? null : parseInt(value) })
                  }
                >
                  <SelectTrigger className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1628] border-[#00d9ff]/30 text-white">
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value === null ? 'all' : day.value} value={day.value === null ? 'all' : String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={selectedSchedule.startTime}
                    onChange={(e) => setSelectedSchedule({ ...selectedSchedule, startTime: e.target.value })}
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                  />
                </div>
                <div>
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={selectedSchedule.endTime}
                    onChange={(e) => setSelectedSchedule({ ...selectedSchedule, endTime: e.target.value })}
                    className="bg-[#0a1628] border-[#00d9ff]/30 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdateSchedule}
                  className="flex-1 bg-[#00d9ff] hover:bg-[#00b8dd] text-[#0a1628]"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedSchedule(null);
                  }}
                  className="border-[#00d9ff]/30"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
