// Jingle Rotation Engine - automatically inserts jingles based on rules
// Now with Schedule-aware integration
import * as kv from "./kv_store.tsx";

interface Jingle {
  id: string;
  title: string;
  duration: number;
  category: string;
  priority: number;
  active: boolean;
  playCount: number;
  lastPlayed: string | null;
  storageFilename: string;
  storageBucket: string;
}

interface JingleRule {
  id: string;
  jingleId: string;
  ruleType: 'interval' | 'time_based' | 'track_count' | 'show_based' | 'schedule_based';
  intervalMinutes: number | null;
  specificTimes: string[] | null;
  daysOfWeek: number[] | null;
  trackInterval: number | null;
  showId: string | null;
  // Schedule-based fields
  scheduleId: string | null;         // Specific schedule slot ID
  schedulePosition: 'intro' | 'outro' | 'during' | null; // When to trigger within schedule
  playlistId: string | null;         // Match any slot with this playlist
  position: 'before_track' | 'after_track' | 'between_tracks';
  minGapMinutes: number;
  active: boolean;
}

// Context passed from Auto DJ about the current schedule state
export interface ScheduleContext {
  currentScheduleId: string | null;
  currentPlaylistId: string | null;
  previousScheduleId: string | null;
  isTransition: boolean;          // True when schedule just changed
  transitionType: 'start' | 'end' | 'switch' | null;
  scheduleJingleConfig: JingleConfig | null;
}

// Per-slot jingle configuration stored on schedule slots
export interface JingleConfig {
  introJingleId: string | null;
  outroJingleId: string | null;
  jingleFrequencyOverride: number | null; // Override track interval, null = use global
  disableJingles: boolean;                 // Completely disable jingles during this slot
  jingleCategoryFilter: string[] | null;   // Only play jingles from these categories
}

// Track jingle state
let lastJinglePlayedTime: Record<string, Date> = {};
let trackCountSinceJingle: number = 0;

// Track schedule transitions
let lastActiveScheduleId: string | null = null;
let transitionJinglePlayed: Record<string, boolean> = {}; // Prevent duplicate transition jingles

/**
 * Detect schedule transition and return context
 */
export async function detectScheduleTransition(
  currentSchedule: { id: string; playlistId: string; jingleConfig?: JingleConfig } | null
): Promise<ScheduleContext> {
  const previousId = lastActiveScheduleId;
  const currentId = currentSchedule?.id || null;

  let transitionType: 'start' | 'end' | 'switch' | null = null;
  let isTransition = false;

  if (previousId !== currentId) {
    isTransition = true;
    if (!previousId && currentId) {
      transitionType = 'start';   // No schedule -> schedule started
    } else if (previousId && !currentId) {
      transitionType = 'end';     // Schedule ended -> no schedule
    } else if (previousId && currentId) {
      transitionType = 'switch';  // One schedule -> another schedule
    }
    lastActiveScheduleId = currentId;
    console.log(`📅 Schedule transition detected: ${transitionType} (${previousId} → ${currentId})`);
  }

  return {
    currentScheduleId: currentId,
    currentPlaylistId: currentSchedule?.playlistId || null,
    previousScheduleId: previousId,
    isTransition,
    transitionType,
    scheduleJingleConfig: currentSchedule?.jingleConfig || null,
  };
}

/**
 * Check for a transition jingle (intro/outro) when schedule changes
 * This is called with high priority before regular jingle rules
 */
export async function checkTransitionJingle(
  context: ScheduleContext
): Promise<Jingle | null> {
  if (!context.isTransition) return null;

  try {
    // OUTRO: The previous schedule ended or switched away
    if (context.previousScheduleId && (context.transitionType === 'end' || context.transitionType === 'switch')) {
      const prevSchedule = await kv.get(`schedule:${context.previousScheduleId}`);
      if (prevSchedule?.jingleConfig?.outroJingleId) {
        const transKey = `outro:${context.previousScheduleId}`;
        if (!transitionJinglePlayed[transKey]) {
          const jingle = await kv.get(`jingle:${prevSchedule.jingleConfig.outroJingleId}`) as Jingle | null;
          if (jingle && jingle.active && jingle.storageFilename) {
            transitionJinglePlayed[transKey] = true;
            // Clear after 5 minutes to allow re-triggering next day
            setTimeout(() => { delete transitionJinglePlayed[transKey]; }, 300000);
            console.log(`🔔 Outro jingle for schedule "${prevSchedule.title}": "${jingle.title}"`);
            return jingle;
          }
        }
      }
    }

    // INTRO: A new schedule started or switched in
    if (context.currentScheduleId && (context.transitionType === 'start' || context.transitionType === 'switch')) {
      const config = context.scheduleJingleConfig;
      if (config?.introJingleId) {
        const transKey = `intro:${context.currentScheduleId}`;
        if (!transitionJinglePlayed[transKey]) {
          const jingle = await kv.get(`jingle:${config.introJingleId}`) as Jingle | null;
          if (jingle && jingle.active && jingle.storageFilename) {
            transitionJinglePlayed[transKey] = true;
            setTimeout(() => { delete transitionJinglePlayed[transKey]; }, 300000);
            console.log(`🔔 Intro jingle for schedule "${context.currentScheduleId}": "${jingle.title}"`);
            return jingle;
          }
        }
      }
    }

    // Fallback: Check schedule_based rules for transitions
    const allRules = await kv.getByPrefix('jingle-rule:') as JingleRule[];
    const matchingRules = allRules
      .filter(rule => rule.active && rule.ruleType === 'schedule_based');

    for (const rule of matchingRules) {
      let matches = false;

      if (rule.schedulePosition === 'intro' && (context.transitionType === 'start' || context.transitionType === 'switch')) {
        // Match by specific scheduleId or by playlistId
        if (rule.scheduleId && rule.scheduleId === context.currentScheduleId) matches = true;
        if (rule.playlistId && rule.playlistId === context.currentPlaylistId) matches = true;
        if (!rule.scheduleId && !rule.playlistId) matches = true; // Global intro
      }

      if (rule.schedulePosition === 'outro' && (context.transitionType === 'end' || context.transitionType === 'switch')) {
        if (rule.scheduleId && rule.scheduleId === context.previousScheduleId) matches = true;
        // For outro, check against previous schedule's playlist
        if (rule.playlistId && context.previousScheduleId) {
          const prevSched = await kv.get(`schedule:${context.previousScheduleId}`);
          if (prevSched && prevSched.playlistId === rule.playlistId) matches = true;
        }
        if (!rule.scheduleId && !rule.playlistId) matches = true; // Global outro
      }

      if (matches) {
        const transKey = `rule:${rule.id}:${context.currentScheduleId || context.previousScheduleId}`;
        if (transitionJinglePlayed[transKey]) continue;

        const jingle = await kv.get(`jingle:${rule.jingleId}`) as Jingle | null;
        if (jingle && jingle.active && jingle.storageFilename) {
          transitionJinglePlayed[transKey] = true;
          setTimeout(() => { delete transitionJinglePlayed[transKey]; }, 300000);
          console.log(`🔔 Schedule-based jingle rule matched: "${jingle.title}" (${rule.schedulePosition})`);
          return jingle;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking transition jingle:', error);
    return null;
  }
}

/**
 * Check if a jingle should be played based on active rules
 * Now accepts ScheduleContext for schedule-aware filtering
 */
export async function checkJingleRules(
  currentShowId?: string,
  scheduleContext?: ScheduleContext
): Promise<Jingle | null> {
  try {
    // If current schedule has jingles disabled, skip
    if (scheduleContext?.scheduleJingleConfig?.disableJingles) {
      console.log('🔇 Jingles disabled for current schedule slot');
      return null;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDay = now.getDay();
    
    // Get all active rules
    const allRules = await kv.getByPrefix('jingle-rule:') as JingleRule[];
    const activeRules = allRules
      .filter(rule => rule.active && rule.ruleType !== 'schedule_based'); // schedule_based handled separately
    
    if (activeRules.length === 0) {
      return null;
    }

    // Schedule-aware frequency override
    const frequencyOverride = scheduleContext?.scheduleJingleConfig?.jingleFrequencyOverride;
    const categoryFilter = scheduleContext?.scheduleJingleConfig?.jingleCategoryFilter;
    
    // Collect matching jingles with their priority
    const matchingJingles: Array<{ jingle: Jingle; rule: JingleRule; priority: number }> = [];
    
    for (const rule of activeRules) {
      // Check if day of week matches (if specified)
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        if (!rule.daysOfWeek.includes(currentDay)) {
          continue;
        }
      }
      
      let shouldPlay = false;
      let calculatedPriority = 5;
      
      switch (rule.ruleType) {
        case 'time_based':
          if (rule.specificTimes && rule.specificTimes.includes(currentTime)) {
            shouldPlay = true;
            calculatedPriority = 10;
          }
          break;
          
        case 'interval':
          if (rule.intervalMinutes && rule.intervalMinutes > 0) {
            const lastPlayedTime = lastJinglePlayedTime[rule.jingleId];
            if (!lastPlayedTime) {
              shouldPlay = true;
              calculatedPriority = 7;
            } else {
              const minutesSinceLastPlay = (now.getTime() - lastPlayedTime.getTime()) / (1000 * 60);
              if (minutesSinceLastPlay >= rule.intervalMinutes) {
                shouldPlay = true;
                calculatedPriority = 7;
              }
            }
          }
          break;
          
        case 'track_count': {
          const interval = frequencyOverride ?? rule.trackInterval;
          if (interval && interval > 0) {
            if (trackCountSinceJingle >= interval) {
              shouldPlay = true;
              calculatedPriority = 6;
              // Boost priority if schedule override is active
              if (frequencyOverride !== null && frequencyOverride !== undefined) {
                calculatedPriority = 8;
                console.log(`🔔 Schedule frequency override active: every ${frequencyOverride} tracks`);
              }
            }
          }
          break;
        }
          
        case 'show_based':
          if (rule.showId && currentShowId && rule.showId === currentShowId) {
            shouldPlay = true;
            calculatedPriority = 9;
          }
          break;
      }
      
      if (!shouldPlay) continue;
      
      // Check minimum gap
      const jingleLastPlayed = lastJinglePlayedTime[rule.jingleId];
      if (jingleLastPlayed) {
        const minutesSinceLastPlay = (now.getTime() - jingleLastPlayed.getTime()) / (1000 * 60);
        if (minutesSinceLastPlay < rule.minGapMinutes) {
          continue;
        }
      }
      
      // Get jingle
      const jingle = await kv.get(`jingle:${rule.jingleId}`) as Jingle | null;
      if (!jingle || !jingle.active || !jingle.storageFilename) {
        continue;
      }

      // Apply category filter from schedule config
      if (categoryFilter && categoryFilter.length > 0) {
        if (!categoryFilter.includes(jingle.category)) {
          continue; // Skip jingles not matching the schedule's category filter
        }
      }
      
      const combinedPriority = calculatedPriority + (jingle.priority || 5);
      matchingJingles.push({ jingle, rule, priority: combinedPriority });
    }
    
    if (matchingJingles.length === 0) {
      return null;
    }
    
    matchingJingles.sort((a, b) => b.priority - a.priority);
    
    const selectedJingle = matchingJingles[0].jingle;
    console.log(`🔔 Jingle selected: "${selectedJingle.title}" (priority: ${matchingJingles[0].priority})`);
    
    return selectedJingle;
  } catch (error) {
    console.error('Error checking jingle rules:', error);
    return null;
  }
}

/**
 * Mark a jingle as played and update stats
 */
export async function markJinglePlayed(jingleId: string): Promise<void> {
  try {
    lastJinglePlayedTime[jingleId] = new Date();
    trackCountSinceJingle = 0;
    
    const jingle = await kv.get(`jingle:${jingleId}`) as Jingle | null;
    if (jingle) {
      jingle.playCount = (jingle.playCount || 0) + 1;
      jingle.lastPlayed = new Date().toISOString();
      await kv.set(`jingle:${jingleId}`, jingle);
      console.log(`✅ Jingle played: "${jingle.title}" (total plays: ${jingle.playCount})`);
    }
  } catch (error) {
    console.error('Error marking jingle as played:', error);
  }
}

/**
 * Increment track counter
 */
export function incrementTrackCount(): void {
  trackCountSinceJingle++;
}

/**
 * Get current schedule context state (for API introspection)
 */
export function getScheduleIntegrationState(): {
  lastActiveScheduleId: string | null;
  trackCountSinceJingle: number;
  lastJinglePlayedTimes: Record<string, string>;
} {
  const times: Record<string, string> = {};
  for (const [k, v] of Object.entries(lastJinglePlayedTime)) {
    times[k] = v.toISOString();
  }
  return {
    lastActiveScheduleId,
    trackCountSinceJingle,
    lastJinglePlayedTimes: times,
  };
}

/**
 * Reset jingle rotation state
 */
export function resetJingleRotation(): void {
  lastJinglePlayedTime = {};
  trackCountSinceJingle = 0;
  lastActiveScheduleId = null;
  transitionJinglePlayed = {};
  console.log('🔄 Jingle rotation state reset');
}