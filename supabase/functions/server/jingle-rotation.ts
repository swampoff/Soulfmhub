// Jingle Rotation Engine - automatically inserts jingles based on rules
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
  ruleType: 'interval' | 'time_based' | 'track_count' | 'show_based';
  intervalMinutes: number | null;
  specificTimes: string[] | null;
  daysOfWeek: number[] | null;
  trackInterval: number | null;
  showId: string | null;
  position: 'before_track' | 'after_track' | 'between_tracks';
  minGapMinutes: number;
  active: boolean;
}

// Track jingle state
let lastJinglePlayedTime: Record<string, Date> = {};
let trackCountSinceJingle: number = 0;

/**
 * Check if a jingle should be played based on active rules
 * @param currentShowId - ID of current show (if any)
 * @returns Jingle to play, or null if none should be played
 */
export async function checkJingleRules(currentShowId?: string): Promise<Jingle | null> {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDay = now.getDay(); // 0=Sunday, 6=Saturday
    
    // Get all active rules
    const allRules = await kv.getByPrefix('jingle-rule:');
    const activeRules = allRules
      .map(item => item.value as JingleRule)
      .filter(rule => rule.active);
    
    if (activeRules.length === 0) {
      return null;
    }
    
    // Collect matching jingles with their priority
    const matchingJingles: Array<{ jingle: Jingle; rule: JingleRule; priority: number }> = [];
    
    for (const rule of activeRules) {
      // Check if day of week matches (if specified)
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        if (!rule.daysOfWeek.includes(currentDay)) {
          continue; // Skip this rule, day doesn't match
        }
      }
      
      let shouldPlay = false;
      let calculatedPriority = 5; // Default priority
      
      // Check rule type
      switch (rule.ruleType) {
        case 'time_based':
          // Check if current time matches any specific times
          if (rule.specificTimes && rule.specificTimes.includes(currentTime)) {
            shouldPlay = true;
            calculatedPriority = 10; // Time-based rules have highest priority
          }
          break;
          
        case 'interval':
          // Check if enough time has passed since last play
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
          
        case 'track_count':
          // Check if enough tracks have played since last jingle
          if (rule.trackInterval && rule.trackInterval > 0) {
            if (trackCountSinceJingle >= rule.trackInterval) {
              shouldPlay = true;
              calculatedPriority = 6;
            }
          }
          break;
          
        case 'show_based':
          // Check if this is the specified show
          if (rule.showId && currentShowId && rule.showId === currentShowId) {
            shouldPlay = true;
            calculatedPriority = 9; // Show-based rules have high priority
          }
          break;
      }
      
      if (!shouldPlay) {
        continue;
      }
      
      // Check minimum gap requirement
      const jingleLastPlayed = lastJinglePlayedTime[rule.jingleId];
      if (jingleLastPlayed) {
        const minutesSinceLastPlay = (now.getTime() - jingleLastPlayed.getTime()) / (1000 * 60);
        if (minutesSinceLastPlay < rule.minGapMinutes) {
          continue; // Too soon to play this jingle again
        }
      }
      
      // Get jingle
      const jingle = await kv.get(`jingle:${rule.jingleId}`) as Jingle | null;
      if (!jingle || !jingle.active || !jingle.storageFilename) {
        continue; // Jingle not found or not ready
      }
      
      // Add to matching jingles with combined priority
      const combinedPriority = calculatedPriority + (jingle.priority || 5);
      matchingJingles.push({ jingle, rule, priority: combinedPriority });
    }
    
    if (matchingJingles.length === 0) {
      return null;
    }
    
    // Sort by priority (highest first)
    matchingJingles.sort((a, b) => b.priority - a.priority);
    
    // Return highest priority jingle
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
    trackCountSinceJingle = 0; // Reset track counter
    
    // Update jingle play count
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
 * Increment track counter (call this every time a track finishes)
 */
export function incrementTrackCount(): void {
  trackCountSinceJingle++;
}

/**
 * Reset jingle rotation state (useful for testing)
 */
export function resetJingleRotation(): void {
  lastJinglePlayedTime = {};
  trackCountSinceJingle = 0;
  console.log('🔄 Jingle rotation state reset');
}
