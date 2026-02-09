import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { projectId } from '/utils/supabase/info';
import { getAccessToken } from '../../../lib/api';
import { getCategoryInfo } from './jingle-categories';

interface JingleRule {
  id: string;
  jingleId: string;
  ruleType: string;
  specificTimes: string[];
  intervalMinutes: number | null;
  trackInterval: number | null;
  daysOfWeek: number[] | null;
  active: boolean;
}

interface Jingle {
  id: string;
  title: string;
  category: string;
  duration: number;
  priority: number;
}

interface TimelineEvent {
  time: string; // HH:MM
  jingleId: string;
  jingleTitle: string;
  category: string;
  priority: number;
  ruleId: string;
  ruleType: string;
  days?: number[];
}

export function JingleTimeline() {
  const [rules, setRules] = useState<JingleRule[]>([]);
  const [jingles, setJingles] = useState<Jingle[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (rules.length > 0 && jingles.length > 0) {
      generateTimeline();
    }
  }, [rules, jingles, selectedDay, showInactive]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadRules(), loadJingles()]);
    setLoading(false);
  }

  async function loadRules() {
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingle-rules`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to load rules');
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    }
  }

  async function loadJingles() {
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingles`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to load jingles');
      const data = await response.json();
      setJingles(data.jingles || []);
    } catch (error) {
      console.error('Error loading jingles:', error);
    }
  }

  function generateTimeline() {
    const events: TimelineEvent[] = [];

    // Filter rules based on showInactive
    const activeRules = showInactive ? rules : rules.filter(r => r.active);

    for (const rule of activeRules) {
      // Check if rule applies to selected day
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        if (!rule.daysOfWeek.includes(selectedDay)) {
          continue; // Skip this rule for this day
        }
      }

      const jingle = jingles.find(j => j.id === rule.jingleId);
      if (!jingle) continue;

      // Process time-based rules
      if (rule.ruleType === 'time_based' && rule.specificTimes) {
        for (const time of rule.specificTimes) {
          events.push({
            time,
            jingleId: jingle.id,
            jingleTitle: jingle.title,
            category: jingle.category,
            priority: jingle.priority,
            ruleId: rule.id,
            ruleType: 'time_based',
            days: rule.daysOfWeek || undefined
          });
        }
      }

      // Process interval-based rules (estimate times)
      if (rule.ruleType === 'interval' && rule.intervalMinutes) {
        const intervalMinutes = rule.intervalMinutes;
        let currentMinutes = 0;
        while (currentMinutes < 1440) { // 24 hours
          const hours = Math.floor(currentMinutes / 60);
          const mins = currentMinutes % 60;
          const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          
          events.push({
            time: timeStr,
            jingleId: jingle.id,
            jingleTitle: jingle.title,
            category: jingle.category,
            priority: jingle.priority,
            ruleId: rule.id,
            ruleType: 'interval',
            days: rule.daysOfWeek || undefined
          });

          currentMinutes += intervalMinutes;
        }
      }

      // Note: track_count and show_based rules can't be easily visualized on timeline
      // as they depend on runtime conditions
    }

    // Sort by time
    events.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    setTimelineEvents(events);
  }

  function getEventsForHour(hour: number): TimelineEvent[] {
    return timelineEvents.filter(event => {
      const [h] = event.time.split(':').map(Number);
      return h === hour;
    });
  }

  function formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const totalEvents = timelineEvents.length;
  const categoryBreakdown = timelineEvents.reduce((acc, event) => {
    acc[event.category] = (acc[event.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">24-Hour Jingle Schedule</h2>
        <p className="text-gray-400">
          Visual timeline showing when jingles will play based on automation rules
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-3xl font-bold text-cyan-400 mb-1">{totalEvents}</div>
          <div className="text-sm text-gray-400">Scheduled Events</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-3xl font-bold text-purple-400 mb-1">{Object.keys(categoryBreakdown).length}</div>
          <div className="text-sm text-gray-400">Categories Used</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-3xl font-bold text-green-400 mb-1">
            {rules.filter(r => r.active).length}
          </div>
          <div className="text-sm text-gray-400">Active Rules</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-3xl font-bold text-yellow-400 mb-1">
            {totalEvents > 0 ? Math.round(1440 / totalEvents) : 0}
          </div>
          <div className="text-sm text-gray-400">Avg Minutes Between</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Day Selector */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {DAYS.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDay(idx)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedDay === idx
                  ? 'bg-gradient-to-r from-cyan-500 to-[#00ffaa] text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Show Inactive Toggle */}
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
            showInactive
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showInactive ? 'Hide' : 'Show'} Inactive
        </button>
      </div>

      {/* Timeline */}
      {totalEvents === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No scheduled events</h3>
          <p className="text-gray-500">
            Create time-based or interval automation rules to see the schedule
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {HOURS.map(hour => {
            const events = getEventsForHour(hour);
            if (events.length === 0) return null;

            return (
              <div key={hour} className="bg-white/5 border border-white/10 rounded-xl p-4">
                {/* Hour Header */}
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {(hour % 12 || 12).toString().padStart(2, '0')}
                      </div>
                      <div className="text-xs text-white/80">{hour >= 12 ? 'PM' : 'AM'}</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-400">
                      {hour}:00 - {hour}:59
                    </div>
                    <div className="text-xs text-gray-500">
                      {events.length} event{events.length !== 1 ? 's' : ''} scheduled
                    </div>
                  </div>
                </div>

                {/* Events */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {events.map((event, idx) => {
                    const categoryInfo = getCategoryInfo(event.category);
                    return (
                      <div
                        key={`${event.ruleId}-${idx}`}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-cyan-500/50 transition-all"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <div className="text-lg font-bold text-cyan-400">{formatTime(event.time)}</div>
                          <span className={`${categoryInfo.color} text-white text-xs font-semibold px-2 py-0.5 rounded ml-auto`}>
                            {categoryInfo.icon}
                          </span>
                        </div>
                        <div className="font-semibold text-white text-sm mb-1 truncate">
                          {event.jingleTitle}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 capitalize">
                            {event.category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-yellow-400 flex items-center gap-1">
                            <span>{event.priority}</span>
                            <span>★</span>
                          </span>
                        </div>
                        {event.ruleType === 'interval' && (
                          <div className="mt-2 text-xs text-gray-500 italic">
                            ~Estimated (interval-based)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Category Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(categoryBreakdown).map(([category, count]) => {
              const categoryInfo = getCategoryInfo(category);
              return (
                <div key={category} className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">{categoryInfo.icon}</div>
                  <div className="text-lg font-bold text-white">{count}</div>
                  <div className="text-xs text-gray-400 capitalize">
                    {category.replace(/_/g, ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}