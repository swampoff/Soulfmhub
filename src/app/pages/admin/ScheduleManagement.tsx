import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Save,
  ChevronLeft,
  ChevronRight,
  Radio,
  Music,
  Mic2,
  Loader2,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { format, addDays, startOfWeek, addWeeks, isSameDay } from 'date-fns';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface ScheduleBlock {
  id: string;
  type: 'playlist' | 'show' | 'podcast';
  title: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  genre?: string;
  color?: string;
  recurring?: boolean;
  resourceId?: string; // ID of playlist, show, or podcast
}

interface DraggableItem {
  id: string;
  type: 'playlist' | 'show' | 'podcast';
  title: string;
  genre?: string;
  duration?: number;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

const TYPE_COLORS = {
  playlist: { bg: '#00d9ff', text: '#0a1628' },
  show: { bg: '#00ffaa', text: '#0a1628' },
  podcast: { bg: '#ff6b9d', text: '#0a1628' },
};

function DraggableScheduleItem({ item }: { item: DraggableItem }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'schedule-item',
    item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const color = TYPE_COLORS[item.type];

  return (
    <motion.div
      ref={drag}
      whileHover={{ scale: 1.02 }}
      className={`p-3 rounded-lg cursor-move transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{
        backgroundColor: `${color.bg}20`,
        borderLeft: `3px solid ${color.bg}`,
      }}
    >
      <div className="flex items-center gap-2">
        {item.type === 'playlist' && <Music className="size-4" style={{ color: color.bg }} />}
        {item.type === 'show' && <Radio className="size-4" style={{ color: color.bg }} />}
        {item.type === 'podcast' && <Mic2 className="size-4" style={{ color: color.bg }} />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-cyan-100 truncate">{item.title}</p>
          {item.genre && (
            <p className="text-xs text-cyan-100/50">{item.genre}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TimeSlotCell({ 
  day, 
  hour, 
  onDrop,
  blocks,
}: { 
  day: number; 
  hour: number;
  onDrop: (item: DraggableItem, day: number, hour: number) => void;
  blocks: ScheduleBlock[];
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'schedule-item',
    drop: (item: DraggableItem) => onDrop(item, day, hour),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  // Find blocks that occupy this cell
  const cellBlocks = blocks.filter(block => {
    if (block.dayOfWeek !== day) return false;
    const blockStartHour = parseInt(block.startTime.split(':')[0]);
    const blockEndHour = parseInt(block.endTime.split(':')[0]);
    return hour >= blockStartHour && hour < blockEndHour;
  });

  return (
    <div
      ref={drop}
      className={`relative border border-cyan-500/10 min-h-[60px] transition-colors ${
        isOver ? 'bg-cyan-500/10 border-cyan-500/30' : 'hover:bg-cyan-500/5'
      }`}
    >
      {cellBlocks.map(block => {
        const blockStartHour = parseInt(block.startTime.split(':')[0]);
        const blockDuration = parseInt(block.endTime.split(':')[0]) - blockStartHour;
        const isFirstCell = hour === blockStartHour;
        
        if (!isFirstCell) return null;

        const color = TYPE_COLORS[block.type];

        return (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 p-2 rounded"
            style={{
              backgroundColor: `${color.bg}30`,
              borderLeft: `3px solid ${color.bg}`,
              height: `${blockDuration * 60}px`,
              zIndex: 10,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cyan-100 truncate">{block.title}</p>
                <p className="text-xs text-cyan-100/60">
                  {block.startTime} - {block.endTime}
                </p>
                {block.recurring && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                    Recurring
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-cyan-500/20"
                >
                  <Edit2 className="size-3 text-cyan-400" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-red-500/20"
                >
                  <Trash2 className="size-3 text-red-400" />
                </Button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ScheduleManagement() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [availableItems, setAvailableItems] = useState<DraggableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    loadScheduleData();
    loadAvailableItems();
  }, [currentWeek]);

  const loadScheduleData = async () => {
    setLoading(true);
    try {
      // Load schedule for the week
      const { schedule } = await api.getSchedule(format(currentWeek, 'yyyy-MM-dd'));
      
      // Convert to blocks
      const blocks: ScheduleBlock[] = (schedule || []).map((item: any) => ({
        id: item.id,
        type: item.type || 'playlist',
        title: item.title,
        startTime: item.start_time,
        endTime: item.end_time,
        dayOfWeek: new Date(item.date || currentWeek).getDay(),
        genre: item.genre,
        recurring: item.recurring,
        resourceId: item.resource_id,
      }));
      
      setScheduleBlocks(blocks);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableItems = async () => {
    try {
      // Load playlists
      const { playlists } = await api.getPlaylists();
      const playlistItems: DraggableItem[] = (playlists || []).map((p: any) => ({
        id: p.id,
        type: 'playlist',
        title: p.name,
        genre: p.genre,
      }));

      // Load shows
      const { shows } = await api.getShows();
      const showItems: DraggableItem[] = (shows || []).map((s: any) => ({
        id: s.id,
        type: 'show',
        title: s.title,
        genre: s.genre,
      }));

      // Load podcasts
      const { podcasts } = await api.getPodcasts();
      const podcastItems: DraggableItem[] = (podcasts || []).map((p: any) => ({
        id: p.id,
        type: 'podcast',
        title: p.title,
      }));

      setAvailableItems([...playlistItems, ...showItems, ...podcastItems]);
    } catch (error) {
      console.error('Error loading available items:', error);
    }
  };

  const handleDrop = async (item: DraggableItem, day: number, hour: number) => {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

    const newBlock: ScheduleBlock = {
      id: `temp-${Date.now()}`,
      type: item.type,
      title: item.title,
      startTime,
      endTime,
      dayOfWeek: day,
      genre: item.genre,
      resourceId: item.id,
      recurring: false,
    };

    // Check for conflicts
    const hasConflict = scheduleBlocks.some(block => {
      if (block.dayOfWeek !== day) return false;
      const blockStart = parseInt(block.startTime.split(':')[0]);
      const blockEnd = parseInt(block.endTime.split(':')[0]);
      return hour >= blockStart && hour < blockEnd;
    });

    if (hasConflict) {
      alert('Time slot already occupied! Please choose another time or remove the existing block.');
      return;
    }

    try {
      // Save to backend
      const scheduleDate = addDays(currentWeek, day);
      await api.createScheduleSlot({
        date: format(scheduleDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        type: item.type,
        resource_id: item.id,
        title: item.title,
        genre: item.genre,
      });

      // Add to local state
      setScheduleBlocks(prev => [...prev, newBlock]);
    } catch (error) {
      console.error('Error creating schedule slot:', error);
      alert('Failed to create schedule slot. Please try again.');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Delete this schedule block?')) return;

    try {
      await api.deleteScheduleSlot(blockId);
      setScheduleBlocks(prev => prev.filter(b => b.id !== blockId));
    } catch (error) {
      console.error('Error deleting schedule block:', error);
    }
  };

  const handleCopyWeek = () => {
    // TODO: Implement copy week functionality
    alert('Copy week functionality coming soon!');
  };

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(startOfWeek(new Date()));
  };

  return (
    <AdminLayout maxWidth="wide">
      <DndProvider backend={HTML5Backend}>
        <div className="w-full max-w-full overflow-x-hidden">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 lg:mb-8 w-full"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-righteous text-white mb-1 sm:mb-2 truncate">
                  Schedule Management
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-white/60">
                  Drag & drop to organize your broadcast schedule
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <Button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="xl:hidden bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm"
                  size="sm"
                >
                  <Settings className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                  Content
                </Button>
                <Button
                  onClick={handleCopyWeek}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm hidden sm:flex"
                >
                  <Copy className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                  <span className="hidden lg:inline">Copy Week</span>
                </Button>
                <Button
                  onClick={loadScheduleData}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10 flex-shrink-0"
                >
                  <RefreshCw className="size-3 sm:size-4" />
                </Button>
              </div>
            </div>

            {/* Week Navigation */}
            <Card className="p-3 sm:p-4 bg-[#141414] border-white/10 w-full">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <Button
                  onClick={goToPreviousWeek}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 w-full sm:w-auto text-xs sm:text-sm"
                >
                  <ChevronLeft className="size-4 sm:size-5" />
                  <span className="hidden sm:inline ml-1">Previous</span>
                </Button>

                <div className="text-center min-w-0 flex-1">
                  <p className="text-sm sm:text-base lg:text-xl font-semibold text-white truncate">
                    Week of {format(currentWeek, 'MMM d, yyyy')}
                  </p>
                  <Button
                    onClick={goToCurrentWeek}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10 mt-1 text-[10px] sm:text-xs"
                  >
                    Current Week
                  </Button>
                </div>

                <Button
                  onClick={goToNextWeek}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 w-full sm:w-auto text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="size-4 sm:size-5" />
                </Button>
              </div>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4 sm:gap-6 w-full">
            {/* Sidebar - Available Items */}
            <AnimatePresence>
              {(showSidebar || typeof window !== 'undefined' && window.innerWidth >= 1280) && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="xl:block"
                >
                  <Card className="p-4 sm:p-6 bg-[#141414] border-white/10 h-fit max-h-[400px] sm:max-h-[500px] xl:max-h-[calc(100vh-300px)] overflow-y-auto xl:sticky xl:top-6 w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white flex items-center gap-2">
                        <Settings className="size-4 sm:size-5" />
                        Available Content
                      </h2>
                      <Button
                        onClick={() => setShowSidebar(false)}
                        variant="ghost"
                        size="sm"
                        className="xl:hidden text-white/60 hover:text-white"
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {availableItems.length === 0 ? (
                        <div className="text-center py-6 sm:py-8 text-white/40">
                          <Music className="size-10 sm:size-12 mx-auto mb-2 opacity-20" />
                          <p className="text-xs sm:text-sm">No content available</p>
                        </div>
                      ) : (
                        availableItems.map(item => (
                          <DraggableScheduleItem key={item.id} item={item} />
                        ))
                      )}
                    </div>

                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
                      <h3 className="text-xs sm:text-sm font-semibold text-white mb-3">Legend</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: TYPE_COLORS.playlist.bg }} />
                          <span className="text-xs sm:text-sm text-white/70">Playlists</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: TYPE_COLORS.show.bg }} />
                          <span className="text-xs sm:text-sm text-white/70">Live Shows</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: TYPE_COLORS.podcast.bg }} />
                          <span className="text-xs sm:text-sm text-white/70">Podcasts</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Schedule Grid */}
            <Card className="bg-[#141414] border-white/10 overflow-hidden w-full">
              {loading ? (
                <div className="flex items-center justify-center h-[400px] sm:h-[600px]">
                  <Loader2 className="size-6 sm:size-8 text-[#00d9ff] animate-spin" />
                </div>
              ) : (
                <div className="overflow-auto w-full">
                  <div className="min-w-[800px]">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-[#1a1a1a]/95 backdrop-blur-sm z-20">
                        <tr>
                          <th className="p-2 sm:p-3 text-left text-white font-semibold border border-white/10 min-w-[60px] sm:min-w-[80px] text-xs sm:text-sm">
                            Time
                          </th>
                          {DAYS_OF_WEEK.map((day, index) => (
                            <th
                              key={day}
                              className="p-2 sm:p-3 text-center text-white font-semibold border border-white/10 min-w-[100px] sm:min-w-[120px] lg:min-w-[140px]"
                            >
                              <div className="text-xs sm:text-sm lg:text-base">{day.slice(0, 3)}</div>
                              <div className="text-[10px] sm:text-xs text-white/40 font-normal">
                                {format(addDays(currentWeek, index), 'MMM d')}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TIME_SLOTS.map((time, hourIndex) => (
                          <tr key={time}>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm text-white/70 font-mono border border-white/10 bg-[#1a1a1a]/50">
                              {time}
                            </td>
                            {DAYS_OF_WEEK.map((_, dayIndex) => (
                              <td key={dayIndex} className="border border-white/10 p-0">
                                <TimeSlotCell
                                  day={dayIndex}
                                  hour={hourIndex}
                                  onDrop={handleDrop}
                                  blocks={scheduleBlocks}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </DndProvider>
    </AdminLayout>
  );
}