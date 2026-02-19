import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Hash, Calendar, Radio, Save, X, Zap, Copy } from 'lucide-react';
import { projectId } from '../../../../utils/supabase/info';
import { getAccessToken } from '../../../lib/api';
import { JINGLE_CATEGORIES, getCategoryInfo } from './jingle-categories';
import { AutomationPresets } from './AutomationPresets';
import { JingleTimeline } from './JingleTimeline';

interface Jingle {
  id: string;
  title: string;
  category: string;
}

interface JingleRule {
  id: string;
  jingleId: string;
  ruleType: 'interval' | 'time_based' | 'track_count' | 'show_based';
  intervalMinutes: number | null;
  specificTimes: string[];
  daysOfWeek: number[] | null;
  trackInterval: number | null;
  showId: string | null;
  position: 'before_track' | 'after_track' | 'between_tracks';
  minGapMinutes: number;
  active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const RULE_TYPES = [
  { value: 'interval', label: 'Time Interval', icon: Clock, desc: 'Play every X minutes' },
  { value: 'time_based', label: 'Specific Times', icon: Calendar, desc: 'Play at specific times' },
  { value: 'track_count', label: 'Track Count', icon: Hash, desc: 'Play after X tracks' },
  { value: 'show_based', label: 'Show Based', icon: Radio, desc: 'Play during specific show' },
];

export function JingleRuleEditor() {
  const [jingles, setJingles] = useState<Jingle[]>([]);
  const [rules, setRules] = useState<JingleRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJingle, setSelectedJingle] = useState<string>('');
  const [ruleType, setRuleType] = useState<string>('interval');
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [specificTimes, setSpecificTimes] = useState<string[]>(['09:00']);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [trackInterval, setTrackInterval] = useState(5);
  const [minGapMinutes, setMinGapMinutes] = useState(15);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadJingles(), loadRules()]);
    setLoading(false);
  }

  async function loadJingles() {
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingles?active=true`,
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

  async function createRule() {
    if (!selectedJingle) {
      alert('Please select a jingle');
      return;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingle-rules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jingleId: selectedJingle,
            ruleType,
            intervalMinutes: ruleType === 'interval' ? intervalMinutes : null,
            specificTimes: ruleType === 'time_based' ? specificTimes : [],
            daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : null,
            trackInterval: ruleType === 'track_count' ? trackInterval : null,
            position: 'before_track',
            minGapMinutes,
            active: true,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to create rule');

      await loadRules();
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating rule:', error);
      alert('Failed to create rule');
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return;

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingle-rules/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete rule');

      await loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  }

  async function toggleRuleActive(rule: JingleRule) {
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingle-rules/${rule.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ active: !rule.active }),
        }
      );

      if (!response.ok) throw new Error('Failed to update rule');

      await loadRules();
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  }

  function resetForm() {
    setSelectedJingle('');
    setRuleType('interval');
    setIntervalMinutes(30);
    setSpecificTimes(['09:00']);
    setDaysOfWeek([]);
    setTrackInterval(5);
    setMinGapMinutes(15);
  }

  function addSpecificTime() {
    setSpecificTimes([...specificTimes, '12:00']);
  }

  function updateSpecificTime(index: number, value: string) {
    const newTimes = [...specificTimes];
    newTimes[index] = value;
    setSpecificTimes(newTimes);
  }

  function removeSpecificTime(index: number) {
    setSpecificTimes(specificTimes.filter((_, i) => i !== index));
  }

  function toggleDay(day: number) {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  }

  function getJingleTitle(jingleId: string): string {
    return jingles.find(j => j.id === jingleId)?.title || 'Unknown';
  }

  function getRuleDescription(rule: JingleRule): string {
    switch (rule.ruleType) {
      case 'interval':
        return `Every ${rule.intervalMinutes} minutes`;
      case 'time_based':
        return `At ${rule.specificTimes?.join(', ')}`;
      case 'track_count':
        return `Every ${rule.trackInterval} tracks`;
      case 'show_based':
        return `During show`;
      default:
        return 'Unknown rule';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-[#00ffaa] bg-clip-text text-transparent">
            Jingle Automation Rules
          </h1>
          <p className="text-gray-400 mt-1">
            {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
          </p>
        </div>

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-[#00ffaa] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          {showCreateForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showCreateForm ? 'Cancel' : 'New Rule'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white/5 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6 space-y-5">
          <h2 className="text-xl font-bold text-white">Create Automation Rule</h2>

          {/* Select Jingle */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Jingle *
            </label>
            <select
              value={selectedJingle}
              onChange={(e) => setSelectedJingle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select a jingle...</option>
              {jingles.map(jingle => (
                <option key={jingle.id} value={jingle.id}>
                  {jingle.title} ({jingle.category})
                </option>
              ))}
            </select>
          </div>

          {/* Rule Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Rule Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {RULE_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setRuleType(type.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      ruleType === type.value
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${ruleType === type.value ? 'text-cyan-400' : 'text-gray-400'}`} />
                    <div className="font-semibold text-white text-sm">{type.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{type.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rule-specific fields */}
          {ruleType === 'interval' && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

          {ruleType === 'time_based' && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Specific Times
              </label>
              <div className="space-y-2">
                {specificTimes.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => updateSpecificTime(index, e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {specificTimes.length > 1 && (
                      <button
                        onClick={() => removeSpecificTime(index)}
                        className="p-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addSpecificTime}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                >
                  + Add Time
                </button>
              </div>
            </div>
          )}

          {ruleType === 'track_count' && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Play after every X tracks
              </label>
              <input
                type="number"
                min="1"
                value={trackInterval}
                onChange={(e) => setTrackInterval(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

          {/* Days of Week */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Days of Week (optional - leave empty for all days)
            </label>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${
                    daysOfWeek.includes(day.value)
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min Gap */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Minimum Gap Between Plays (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={minGapMinutes}
              onChange={(e) => setMinGapMinutes(parseInt(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Create Button */}
          <button
            onClick={createRule}
            disabled={!selectedJingle}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-[#00ffaa] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Create Rule
          </button>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No automation rules yet</p>
          </div>
        ) : (
          rules.map(rule => (
            <div
              key={rule.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">
                    {getJingleTitle(rule.jingleId)}
                  </h3>
                  <p className="text-gray-400 text-sm mb-2">
                    {getRuleDescription(rule)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Min gap: {rule.minGapMinutes} min</span>
                    {rule.daysOfWeek && rule.daysOfWeek.length > 0 && (
                      <span>
                        Days: {rule.daysOfWeek.map(d => DAYS_OF_WEEK[d].label).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRuleActive(rule)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      rule.active
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    }`}
                  >
                    {rule.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}