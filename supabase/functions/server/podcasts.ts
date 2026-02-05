import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';

// GET /podcasts - Get all podcasts
export async function getPodcasts(c: Context) {
  try {
    const category = c.req.query('category');
    const podcasts = await kv.getByPrefix('podcast:');
    
    let filtered = podcasts
      .map(item => item.value)
      .filter((p: any) => p.active !== false);
    
    if (category) {
      filtered = filtered.filter((p: any) => p.category === category);
    }
    
    // Sort: featured first, then by total listeners
    const sorted = filtered.sort((a: any, b: any) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.totalListeners - a.totalListeners;
    });

    return c.json({ podcasts: sorted });
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    return c.json({ error: 'Failed to fetch podcasts' }, 500);
  }
}

// GET /podcasts/:slug - Get podcast by slug with episodes
export async function getPodcastBySlug(c: Context) {
  try {
    const slug = c.req.param('slug');
    const podcast = await kv.get(`podcast:${slug}`);

    if (!podcast || podcast.active === false) {
      console.error('Podcast not found:', slug);
      return c.json({ error: 'Podcast not found' }, 404);
    }

    // Get episodes for this podcast
    const episodes = await kv.getByPrefix(`podcast:${slug}:episode:`);
    const sortedEpisodes = episodes
      .map(item => item.value)
      .filter((ep: any) => ep.active !== false)
      .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const podcastWithEpisodes = {
      ...podcast,
      episodes: sortedEpisodes,
      episodeCount: sortedEpisodes.length,
    };

    return c.json({ podcast: podcastWithEpisodes });
  } catch (error) {
    console.error('Error in getPodcastBySlug:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

// POST /podcasts - Create new podcast (admin only)
export async function createPodcast(c: Context) {
  try {
    const body = await c.req.json();

    // TODO: Add auth check here
    const slug = body.slug;
    if (!slug) {
      return c.json({ error: 'Slug is required' }, 400);
    }

    const existing = await kv.get(`podcast:${slug}`);
    if (existing) {
      return c.json({ error: 'Podcast with this slug already exists' }, 409);
    }

    const podcast = {
      id: crypto.randomUUID(),
      ...body,
      active: body.active !== undefined ? body.active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(`podcast:${slug}`, podcast);

    return c.json({ podcast }, 201);
  } catch (error) {
    console.error('Error in createPodcast:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

// PUT /podcasts/:slug - Update podcast (admin only)
export async function updatePodcast(c: Context) {
  try {
    const slug = c.req.param('slug');
    const body = await c.req.json();

    // TODO: Add auth check here

    const existing = await kv.get(`podcast:${slug}`);
    if (!existing) {
      return c.json({ error: 'Podcast not found' }, 404);
    }

    const podcast = {
      ...existing,
      ...body,
      slug,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`podcast:${slug}`, podcast);

    return c.json({ podcast });
  } catch (error) {
    console.error('Error in updatePodcast:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

// POST /podcasts/:id/subscribe - Toggle subscription
export async function toggleSubscription(c: Context) {
  try {
    const podcastId = c.req.param('id');
    
    // TODO: Get user ID from auth
    const userId = 'mock-user-id';
    
    const subscriptionKey = `subscription:${userId}:podcast:${podcastId}`;
    const existing = await kv.get(subscriptionKey);
    
    if (existing) {
      await kv.del(subscriptionKey);
      return c.json({ subscribed: false });
    } else {
      await kv.set(subscriptionKey, {
        userId,
        podcastId,
        subscribedAt: new Date().toISOString(),
      });
      return c.json({ subscribed: true });
    }
  } catch (error) {
    console.error('Error in toggleSubscription:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

// POST /podcasts/episodes/:id/like - Toggle episode like
export async function toggleEpisodeLike(c: Context) {
  try {
    const episodeId = c.req.param('id');
    
    // TODO: Get user ID from auth
    const userId = 'mock-user-id';
    
    const likeKey = `like:${userId}:episode:${episodeId}`;
    const existing = await kv.get(likeKey);
    
    if (existing) {
      await kv.del(likeKey);
      return c.json({ liked: false });
    } else {
      await kv.set(likeKey, {
        userId,
        episodeId,
        likedAt: new Date().toISOString(),
      });
      return c.json({ liked: true });
    }
  } catch (error) {
    console.error('Error in toggleEpisodeLike:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
