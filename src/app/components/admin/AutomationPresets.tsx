import React, { useState } from 'react';
import { Clock, Radio, Calendar, Zap, Settings, Check, Download, Play } from 'lucide-react';

interface AutomationPreset {
  id: string;
  name: string;
  description: string;
  icon: any;
  format: string;
  rules: PresetRule[];
  color: string;
}

interface PresetRule {
  category: string;
  ruleType: string;
  config: any;
  description: string;
}

const AUTOMATION_PRESETS: AutomationPreset[] = [
  {
    id: 'hot_clock_standard',
    name: 'Hot Clock Standard',
    description: 'Classic radio hot clock - Station ID every hour, sweepers every 15 min',
    icon: Clock,
    format: 'Universal',
    color: 'from-cyan-500 to-blue-500',
    rules: [
      {
        category: 'station_id',
        ruleType: 'time_based',
        config: { specificTimes: ['00:00'], intervalHours: 1 },
        description: 'Station ID at top of every hour (00:00, 01:00, 02:00...)'
      },
      {
        category: 'sweeper',
        ruleType: 'time_based',
        config: { specificTimes: ['00:15', '00:30', '00:45'] },
        description: 'Sweepers at :15, :30, :45 past each hour'
      },
      {
        category: 'liner',
        ruleType: 'track_count',
        config: { trackInterval: 8 },
        description: 'Station liner every 8 songs'
      }
    ]
  },
  {
    id: 'top_40_aggressive',
    name: 'Top 40 High Energy',
    description: 'Fast-paced CHR format with frequent imaging',
    icon: Zap,
    format: 'Top 40/CHR',
    color: 'from-pink-500 to-purple-500',
    rules: [
      {
        category: 'station_id',
        ruleType: 'time_based',
        config: { specificTimes: ['00:00'], intervalHours: 1 },
        description: 'Station ID every hour'
      },
      {
        category: 'sweeper',
        ruleType: 'track_count',
        config: { trackInterval: 3 },
        description: 'Sweeper every 3 songs (high rotation)'
      },
      {
        category: 'stinger',
        ruleType: 'track_count',
        config: { trackInterval: 2 },
        description: 'Quick stinger every 2 songs'
      },
      {
        category: 'drop_in',
        ruleType: 'track_count',
        config: { trackInterval: 5 },
        description: 'Drop-in voice over intro every 5 songs'
      }
    ]
  },
  {
    id: 'morning_drive',
    name: 'Morning Drive Time',
    description: 'Weekday morning show automation (6 AM - 10 AM)',
    icon: Radio,
    format: 'Daypart Specific',
    color: 'from-yellow-500 to-orange-500',
    rules: [
      {
        category: 'show_intro',
        ruleType: 'time_based',
        config: { specificTimes: ['06:00'], daysOfWeek: [1,2,3,4,5] },
        description: 'Show intro at 6 AM (weekdays only)'
      },
      {
        category: 'time_check',
        ruleType: 'time_based',
        config: { specificTimes: ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30'] },
        description: 'Time checks every 30 minutes'
      },
      {
        category: 'traffic_bumper',
        ruleType: 'time_based',
        config: { specificTimes: ['07:15', '07:45', '08:15', '08:45'] },
        description: 'Traffic reports during rush hour'
      },
      {
        category: 'weather_bumper',
        ruleType: 'time_based',
        config: { specificTimes: ['06:45', '07:45', '08:45'] },
        description: 'Weather updates in morning'
      },
      {
        category: 'show_outro',
        ruleType: 'time_based',
        config: { specificTimes: ['09:59'], daysOfWeek: [1,2,3,4,5] },
        description: 'Show outro at 10 AM'
      }
    ]
  },
  {
    id: 'smooth_minimal',
    name: 'Smooth & Minimal',
    description: 'Low-intrusion automation for jazz/chill formats',
    icon: Settings,
    format: 'Smooth Jazz/Chill',
    color: 'from-indigo-500 to-purple-500',
    rules: [
      {
        category: 'station_id',
        ruleType: 'time_based',
        config: { specificTimes: ['00:00'], intervalHours: 2 },
        description: 'Station ID every 2 hours only'
      },
      {
        category: 'bumper',
        ruleType: 'track_count',
        config: { trackInterval: 10 },
        description: 'Subtle bumper every 10 songs'
      },
      {
        category: 'liner',
        ruleType: 'interval',
        config: { intervalMinutes: 45 },
        description: 'Station liner every 45 minutes'
      }
    ]
  },
  {
    id: 'commercial_breaks',
    name: 'Commercial Automation',
    description: 'Standard commercial break structure',
    icon: Calendar,
    format: 'Universal',
    color: 'from-red-500 to-orange-500',
    rules: [
      {
        category: 'commercial_intro',
        ruleType: 'time_based',
        config: { specificTimes: ['00:20', '00:50'] },
        description: 'Lead into commercial at :20 and :50'
      },
      {
        category: 'commercial_outro',
        ruleType: 'time_based',
        config: { specificTimes: ['00:24', '00:54'] },
        description: 'Return from commercial at :24 and :54'
      }
    ]
  },
  {
    id: 'weekend_special',
    name: 'Weekend Programming',
    description: 'Relaxed weekend automation (Saturday & Sunday)',
    icon: Play,
    format: 'Daypart Specific',
    color: 'from-green-500 to-emerald-500',
    rules: [
      {
        category: 'station_id',
        ruleType: 'time_based',
        config: { specificTimes: ['00:00'], intervalHours: 1, daysOfWeek: [0,6] },
        description: 'Station ID every hour (weekends only)'
      },
      {
        category: 'sweeper',
        ruleType: 'track_count',
        config: { trackInterval: 6, daysOfWeek: [0,6] },
        description: 'Sweeper every 6 songs (relaxed pace)'
      },
      {
        category: 'contest',
        ruleType: 'time_based',
        config: { specificTimes: ['12:00', '15:00', '18:00'], daysOfWeek: [0,6] },
        description: 'Contest promos at noon, 3 PM, 6 PM'
      }
    ]
  }
];

interface AutomationPresetsProps {
  onApplyPreset: (preset: AutomationPreset) => void;
}

export function AutomationPresets({ onApplyPreset }: AutomationPresetsProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);

  function handleApply(preset: AutomationPreset) {
    if (confirm(`Apply "${preset.name}" preset?\n\nThis will create ${preset.rules.length} automation rules.`)) {
      onApplyPreset(preset);
      setSelectedPreset(preset.id);
      setTimeout(() => setSelectedPreset(null), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Automation Presets</h2>
        <p className="text-gray-400">
          Quick-start templates for professional radio automation. Select a preset to instantly configure jingle rotation.
        </p>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AUTOMATION_PRESETS.map(preset => {
          const Icon = preset.icon;
          const isExpanded = expandedPreset === preset.id;
          const isApplied = selectedPreset === preset.id;

          return (
            <div
              key={preset.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all"
            >
              {/* Preset Header */}
              <div className={`bg-gradient-to-r ${preset.color} p-6`}>
                <div className="flex items-start justify-between mb-3">
                  <Icon className="w-8 h-8 text-white" />
                  <span className="text-xs font-semibold text-white/80 bg-white/20 px-2 py-1 rounded">
                    {preset.format}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{preset.name}</h3>
                <p className="text-white/80 text-sm">{preset.description}</p>
              </div>

              {/* Preset Content */}
              <div className="p-5 space-y-4">
                {/* Rules Count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{preset.rules.length} automation rules</span>
                  <button
                    onClick={() => setExpandedPreset(isExpanded ? null : preset.id)}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {isExpanded ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {/* Expanded Rules */}
                {isExpanded && (
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    {preset.rules.map((rule, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-cyan-400 text-xs font-bold mt-0.5">#{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white mb-1 capitalize">
                              {rule.category.replace(/_/g, ' ')}
                            </div>
                            <p className="text-xs text-gray-400">{rule.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Apply Button */}
                <button
                  onClick={() => handleApply(preset)}
                  disabled={isApplied}
                  className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    isApplied
                      ? 'bg-green-500/20 text-green-400 cursor-default'
                      : 'bg-gradient-to-r ' + preset.color + ' text-white hover:opacity-90'
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Applied!
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Apply Preset
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Settings className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">How Presets Work</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Presets create multiple automation rules based on professional radio standards</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>You need to have jingles uploaded in matching categories for rules to work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Rules can be edited or deleted individually after applying a preset</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Multiple presets can be combined - rules won't conflict if properly configured</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
