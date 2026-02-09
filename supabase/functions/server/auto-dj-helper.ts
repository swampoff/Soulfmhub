// Auto DJ Helper functions with Jingle ↔ Schedule integration
import * as kv from "./kv_store.tsx";
import * as jingleRotation from "./jingle-rotation.ts";
import type { ScheduleContext, JingleConfig } from "./jingle-rotation.ts";

// Cache for schedule context to avoid redundant lookups
let cachedScheduleContext: ScheduleContext | null = null;

/**
 * Build schedule context from the current schedule (if any)
 * and detect transitions (schedule started/ended/switched)
 */
export async function updateScheduleContext(
  currentSchedule: { id: string; playlistId: string; jingleConfig?: JingleConfig; title?: string } | null
): Promise<ScheduleContext> {
  cachedScheduleContext = await jingleRotation.detectScheduleTransition(currentSchedule);
  return cachedScheduleContext;
}

/**
 * Check for transition jingles first (intro/outro), then regular jingle rules.
 * Returns the jingle if one should be played, null otherwise.
 */
export async function checkAndPlayJingle(
  autoDJState: any,
  currentSchedule?: { id: string; playlistId: string; jingleConfig?: JingleConfig } | null
): Promise<any | null> {
  try {
    // Don't check for jingles if already playing one
    if (autoDJState.isPlayingJingle) {
      return null;
    }

    // Build schedule context
    const context = await updateScheduleContext(currentSchedule || null);

    // PRIORITY A: Transition jingles (intro/outro when schedule changes)
    if (context.isTransition) {
      const transitionJingle = await jingleRotation.checkTransitionJingle(context);
      if (transitionJingle) {
        console.log(`🔔 Transition jingle: "${transitionJingle.title}" (${context.transitionType})`);
        await jingleRotation.markJinglePlayed(transitionJingle.id);
        return transitionJingle;
      }
    }

    // PRIORITY B: Regular jingle rules (now schedule-aware)
    const jingleToPlay = await jingleRotation.checkJingleRules(undefined, context);
    
    if (jingleToPlay) {
      console.log(`🔔 Jingle matched rules: "${jingleToPlay.title}"`);
      await jingleRotation.markJinglePlayed(jingleToPlay.id);
      return jingleToPlay;
    }
    
    return null;
  } catch (error) {
    console.error('Error checking jingle:', error);
    return null;
  }
}

/**
 * Update Now Playing with jingle info
 */
export async function updateNowPlayingWithJingle(jingle: any): Promise<void> {
  await kv.set('stream:nowplaying', {
    track: {
      id: jingle.id,
      title: `🔔 ${jingle.title}`,
      artist: 'Soul FM Hub',
      album: `Jingle - ${jingle.category}`,
      duration: jingle.duration,
      cover: null
    },
    isJingle: true,
    startTime: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

/**
 * Increment track count after a music track finishes
 */
export function incrementMusicTrackCount(): void {
  jingleRotation.incrementTrackCount();
}

/**
 * Get schedule integration state for introspection
 */
export function getIntegrationState() {
  return {
    ...jingleRotation.getScheduleIntegrationState(),
    cachedContext: cachedScheduleContext,
  };
}
