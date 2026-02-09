import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';

// GET /profiles - Get all profiles
export async function getProfiles(c: Context) {
  try {
    const profiles = await kv.getByPrefix('profile:');
    
    // Filter active profiles only
    const activeProfiles = profiles
      .filter((p: any) => p.active !== false);
    
    // Sort: featured first, then by name
    const sorted = activeProfiles.sort((a: any, b: any) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.name.localeCompare(b.name);
    });

    return c.json({ profiles: sorted });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return c.json({ error: 'Failed to fetch profiles' }, 500);
  }
}

// GET /profiles/:slug - Get profile by slug
export async function getProfileBySlug(c: Context) {
  try {
    const slug = c.req.param('slug');
    const profile = await kv.get(`profile:${slug}`);

    if (!profile || profile.active === false) {
      console.error('Profile not found:', slug);
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.error('Error in getProfileBySlug:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

// POST /profiles - Create new profile (admin only)
export async function createProfile(c: Context) {
  try {
    const body = await c.req.json();

    // TODO: Add auth check here
    // const accessToken = c.req.header('Authorization')?.split(' ')[1];
    // Verify user is admin...

    const slug = body.slug;
    if (!slug) {
      return c.json({ error: 'Slug is required' }, 400);
    }

    // Check if profile already exists
    const existing = await kv.get(`profile:${slug}`);
    if (existing) {
      return c.json({ error: 'Profile with this slug already exists' }, 409);
    }

    const profile = {
      id: crypto.randomUUID(),
      ...body,
      active: body.active !== undefined ? body.active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(`profile:${slug}`, profile);

    return c.json({ profile }, 201);
  } catch (error) {
    console.error('Error in createProfile:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

// PUT /profiles/:slug - Update profile (admin only)
export async function updateProfile(c: Context) {
  try {
    const slug = c.req.param('slug');
    const body = await c.req.json();

    // TODO: Add auth check here

    const existing = await kv.get(`profile:${slug}`);
    if (!existing) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const profile = {
      ...existing,
      ...body,
      slug, // Don't allow slug changes
      id: existing.id, // Don't allow ID changes
      created_at: existing.created_at, // Keep original creation date
      updated_at: new Date().toISOString(),
    };

    await kv.set(`profile:${slug}`, profile);

    return c.json({ profile });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

// DELETE /profiles/:slug - Delete profile (admin only)
export async function deleteProfile(c: Context) {
  try {
    const slug = c.req.param('slug');

    // TODO: Add auth check here

    const existing = await kv.get(`profile:${slug}`);
    if (!existing) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Soft delete by setting active to false
    const profile = {
      ...existing,
      active: false,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`profile:${slug}`, profile);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error in deleteProfile:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

// GET /profiles/featured - Get featured profiles only
export async function getFeaturedProfiles(c: Context) {
  try {
    const profiles = await kv.getByPrefix('profile:');
    
    const featured = profiles
      .filter((p: any) => p.active !== false && p.featured === true)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return c.json({ profiles: featured });
  } catch (error) {
    console.error('Error in getFeaturedProfiles:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

// GET /profiles/role/:role - Get profiles by role
export async function getProfilesByRole(c: Context) {
  try {
    const role = c.req.param('role');
    const profiles = await kv.getByPrefix('profile:');
    
    const filtered = profiles
      .filter((p: any) => p.active !== false && p.role === role)
      .sort((a: any, b: any) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.name.localeCompare(b.name);
      });

    return c.json({ profiles: filtered });
  } catch (error) {
    console.error('Error in getProfilesByRole:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}