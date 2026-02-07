import React, { useState } from 'react';
import { Settings, Zap, Calendar, List } from 'lucide-react';
import { JingleRuleEditor } from './JingleRuleEditor';
import { AutomationPresets } from './AutomationPresets';
import { JingleTimeline } from './JingleTimeline';
import { projectId } from '/utils/supabase/info';

type TabView = 'rules' | 'presets' | 'timeline';

export function JingleAutomation() {
  const [activeTab, setActiveTab] = useState<TabView>('presets');

  async function handleApplyPreset(preset: any) {
    try {
      const token = localStorage.getItem('access_token');
      
      // Create rules from preset
      for (const presetRule of preset.rules) {
        // Find jingles matching this category
        const jinglesResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingles?category=${presetRule.category}&active=true`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!jinglesResponse.ok) continue;

        const jinglesData = await jinglesResponse.json();
        const jingles = jinglesData.jingles || [];

        if (jingles.length === 0) {
          console.warn(`No jingles found for category: ${presetRule.category}`);
          continue;
        }

        // Use the highest priority jingle in this category
        const jingle = jingles.sort((a: any, b: any) => b.priority - a.priority)[0];

        // Create the rule
        const rulePayload: any = {
          jingleId: jingle.id,
          ruleType: presetRule.ruleType,
          position: 'before_track',
          minGapMinutes: presetRule.config.minGapMinutes || 15,
          active: true,
        };

        // Add rule-specific config
        if (presetRule.ruleType === 'interval') {
          rulePayload.intervalMinutes = presetRule.config.intervalMinutes || 30;
        } else if (presetRule.ruleType === 'time_based') {
          rulePayload.specificTimes = presetRule.config.specificTimes || [];
        } else if (presetRule.ruleType === 'track_count') {
          rulePayload.trackInterval = presetRule.config.trackInterval || 5;
        }

        // Add days of week if specified
        if (presetRule.config.daysOfWeek) {
          rulePayload.daysOfWeek = presetRule.config.daysOfWeek;
        }

        const createResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingle-rules`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(rulePayload),
          }
        );

        if (!createResponse.ok) {
          console.error(`Failed to create rule for ${presetRule.category}`);
        }
      }

      alert(`✅ Preset "${preset.name}" applied successfully!\n\nCreated ${preset.rules.length} automation rules.`);
      
      // Switch to rules tab to see results
      setActiveTab('rules');
    } catch (error) {
      console.error('Error applying preset:', error);
      alert('Failed to apply preset. Please try again.');
    }
  }

  const tabs = [
    {
      id: 'presets' as TabView,
      label: 'Quick Presets',
      icon: Zap,
      description: 'Professional templates'
    },
    {
      id: 'rules' as TabView,
      label: 'Rules Editor',
      icon: Settings,
      description: 'Custom automation'
    },
    {
      id: 'timeline' as TabView,
      label: '24-Hour Timeline',
      icon: Calendar,
      description: 'Visual schedule'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-2 overflow-x-auto pb-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 rounded-t-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500/20 to-[#00ffaa]/20 border-t-2 border-x-2 border-cyan-500'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-cyan-400' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className={`font-semibold ${activeTab === tab.id ? 'text-white' : 'text-gray-300'}`}>
                    {tab.label}
                  </div>
                  <div className="text-xs text-gray-500">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-screen">
        {activeTab === 'presets' && (
          <AutomationPresets onApplyPreset={handleApplyPreset} />
        )}
        {activeTab === 'rules' && (
          <JingleRuleEditor />
        )}
        {activeTab === 'timeline' && (
          <JingleTimeline />
        )}
      </div>
    </div>
  );
}
