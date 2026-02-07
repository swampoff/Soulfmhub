// Auto DJ Helper functions with Jingle integration
import * as kv from "./kv_store.tsx";
import * as jingleRotation from "./jingle-rotation.ts";

/**
 * Check if a jingle should be inserted and play it
 * Returns the jingle if one should be played, null otherwise
 */
export async function checkAndPlayJingle(
  autoDJState: any
): Promise<any | null> {
  try {
    // Don't check for jingles if already playing one
    if (autoDJState.isPlayingJingle) {
      return null;
    }
    
    // Check jingle rules
    const jingleToPlay = await jingleRotation.checkJingleRules();
    
    if (jingleToPlay) {
      console.log(`🔔 Jingle matched rules: "${jingleToPlay.title}"`);
      
      // Mark jingle as played
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
