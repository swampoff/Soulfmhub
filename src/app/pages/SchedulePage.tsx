import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { format, addDays, startOfDay } from 'date-fns';
import { motion } from 'motion/react';

const GENRE_COLORS: Record<string, string> = {
  disco: '#E91E63',
  soulful: '#00BCD4',
  reggae: '#4CAF50',
  'cafe jazz': '#607D8B',
  funk: '#FF5722',
  latin: '#9C27B0',
  afropop: '#FFC107',
  instrumental: '#00BCD4',
  experimental: '#9C27B0',
  dance: '#FF5722',
  dub: '#FF9800',
  lounge: '#607D8B',
  nudisco: '#9C27B0',
  'tropical vibes': '#00BCD4',
  caribbean: '#00BCD4',
  'sad piano': '#673AB7',
  cumbia: '#FFEB3B',
  sharn: '#E91E63',
  'trip-hop': '#9C27B0',
  'morning vibe': '#FFEB3B',
  latinchill: '#9C27B0',
  'african chill': '#4CAF50',
  afrohouse: '#FF9800',
  'latin house': '#9C27B0',
  dnb: '#FF5722',
  newfunk: '#00BCD4',
  soul: '#FF8C42',
  jazz: '#00CED1',
};

// Generate time slots from 04:00 to 23:00
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 4; hour < 24; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, [selectedDate]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const { schedule: data } = await api.getSchedule(format(selectedDate, 'yyyy-MM-dd'));
      setSchedule(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGenreColor = (genre: string) => {
    const key = genre?.toLowerCase() || '';
    return GENRE_COLORS[key] || '#6B7280';
  };

  const goToPreviousDay = () => {
    setSelectedDate(addDays(selectedDate, -1));
  };

  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getBlockPosition = (startTime: string, endTime: string) => {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const baseStartMinutes = parseTime('04:00');
    
    const totalMinutes = parseTime('23:00') - baseStartMinutes;
    const top = ((startMinutes - baseStartMinutes) / totalMinutes) * 100;
    const height = ((endMinutes - startMinutes) / totalMinutes) * 100;
    
    return { top: `${top}%`, height: `${height}%` };
  };

  // Organize schedule into non-overlapping columns
  const organizeScheduleColumns = () => {
    const columns: any[][] = [];
    const sortedSchedule = [...schedule].sort((a, b) => 
      parseTime(a.startTime) - parseTime(b.startTime)
    );

    sortedSchedule.forEach((item) => {
      const itemStart = parseTime(item.startTime);
      const itemEnd = parseTime(item.endTime);

      // Find first column where item fits without overlap
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const hasOverlap = column.some((existingItem) => {
          const existingStart = parseTime(existingItem.startTime);
          const existingEnd = parseTime(existingItem.endTime);
          return !(itemEnd <= existingStart || itemStart >= existingEnd);
        });

        if (!hasOverlap) {
          column.push(item);
          placed = true;
          break;
        }
      }

      // If no suitable column found, create new one
      if (!placed) {
        columns.push([item]);
      }
    });

    return columns;
  };

  const scheduleColumns = organizeScheduleColumns();

  return (
    <div className="min-h-screen bg-[#0f1419] py-8">
      <div className="container mx-auto px-4 max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent mb-2">
                Schedule
              </h1>
              <p className="text-white/70 text-lg">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            
            {/* Date Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousDay}
                className="bg-white/5 text-white border-white/20 hover:bg-white/10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                onClick={goToToday}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] hover:from-[#00b8dd] hover:to-[#00dd88] font-semibold"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextDay}
                className="bg-white/5 text-white border-white/20 hover:bg-white/10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-white text-center py-12">Loading schedule...</div>
        ) : (
          <>
            {/* Timeline Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative bg-[#1a1f2e] rounded-lg overflow-hidden"
              style={{ minHeight: '600px' }}
            >
              <div className="flex">
                {/* Time Column */}
                <div className="w-16 flex-shrink-0 relative" style={{ height: '600px' }}>
                  {TIME_SLOTS.map((time, index) => (
                    <div
                      key={time}
                      className="absolute left-0 right-0 text-white/50 text-sm px-2 -translate-y-2"
                      style={{ top: `${(index / (TIME_SLOTS.length - 1)) * 100}%` }}
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Schedule Columns */}
                <div className="flex-1 grid gap-2 p-4 relative" style={{ 
                  height: '600px',
                  gridTemplateColumns: `repeat(${Math.max(scheduleColumns.length, 8)}, minmax(120px, 1fr))`
                }}>
                  {/* Time Grid Lines */}
                  {TIME_SLOTS.map((time, index) => (
                    <div
                      key={`line-${time}`}
                      className="absolute left-0 right-0 border-t border-white/5"
                      style={{ top: `${(index / (TIME_SLOTS.length - 1)) * 100}%` }}
                    />
                  ))}

                  {/* Schedule Blocks */}
                  {scheduleColumns.map((column, colIndex) => (
                    <div key={colIndex} className="relative">
                      {column.map((item, itemIndex) => {
                        const position = getBlockPosition(item.startTime, item.endTime);
                        const color = getGenreColor(item.genre);
                        
                        return (
                          <motion.div
                            key={`${item.id}-${itemIndex}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: colIndex * 0.03 + itemIndex * 0.01 }}
                            className="absolute left-0 right-0 rounded-md p-2.5 cursor-pointer transition-all hover:scale-[1.02] hover:z-20 hover:shadow-xl group overflow-hidden"
                            style={{
                              top: position.top,
                              height: position.height,
                              backgroundColor: color,
                              minHeight: '50px',
                            }}
                            title={`${item.name} - ${item.startTime} to ${item.endTime}${item.host ? ` with ${item.host}` : ''}`}
                          >
                            {/* Subtle gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="relative z-10">
                              <div className="text-white font-bold text-xs mb-0.5 line-clamp-2 leading-tight">
                                {item.name}
                              </div>
                              <div className="text-white/90 text-[10px] font-medium">
                                {item.startTime} - {item.endTime}
                              </div>
                              {item.host && (
                                <div className="text-white/70 text-[10px] mt-0.5 line-clamp-1">
                                  {item.host}
                                </div>
                              )}
                              {item.genre && (
                                <div className="text-white/60 text-[9px] uppercase tracking-wide mt-1">
                                  {item.genre}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Genre Colors Legend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <Card className="p-6 bg-[#1a1f2e] border-white/10">
                <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                  Genre Colors
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GENRE_COLORS).map(([genre, color]) => (
                    <button
                      key={genre}
                      className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all hover:scale-105 hover:shadow-lg"
                      style={{ backgroundColor: color }}
                    >
                      {genre.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}