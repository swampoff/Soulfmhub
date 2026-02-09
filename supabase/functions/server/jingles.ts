// Jingles and Jingle Rules endpoints
import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { parseBuffer } from "npm:music-metadata@10";

export function setupJinglesRoutes(app: Hono, supabase: any, requireAuth: any) {
  
  // ==================== JINGLES ====================

  // Get all jingles
  app.get("/make-server-06086aa3/jingles", async (c) => {
    try {
      const category = c.req.query('category');
      const active = c.req.query('active');
      const jingles = await kv.getByPrefix('jingle:');
      
      let filteredJingles = jingles.map(item => item.value);
      
      if (category) {
        filteredJingles = filteredJingles.filter(jingle => 
          jingle.category === category
        );
      }
      
      if (active !== undefined) {
        const isActive = active === 'true';
        filteredJingles = filteredJingles.filter(jingle => 
          jingle.active === isActive
        );
      }

      // Sort by priority (highest first), then by title
      filteredJingles.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return (a.title || '').localeCompare(b.title || '');
      });

      return c.json({ jingles: filteredJingles });
    } catch (error: any) {
      console.error('Get jingles error:', error);
      return c.json({ error: `Get jingles error: ${error.message}` }, 500);
    }
  });

  // Get single jingle
  app.get("/make-server-06086aa3/jingles/:id", async (c) => {
    try {
      const id = c.req.param('id');
      const jingle = await kv.get(`jingle:${id}`);
      
      if (!jingle) {
        return c.json({ error: 'Jingle not found' }, 404);
      }

      return c.json({ jingle });
    } catch (error: any) {
      console.error('Get jingle error:', error);
      return c.json({ error: `Get jingle error: ${error.message}` }, 500);
    }
  });

  // Create jingle (metadata only - file upload is separate)
  app.post("/make-server-06086aa3/jingles", requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const jingleId = crypto.randomUUID();
      
      const jingle = {
        id: jingleId,
        title: body.title || 'Untitled Jingle',
        description: body.description || '',
        fileUrl: body.fileUrl || null,
        storageFilename: body.storageFilename || null,
        storageBucket: 'make-06086aa3-jingles',
        duration: body.duration || 0,
        category: body.category || 'other', // station_id, transition, time_announcement, show_intro, show_outro, commercial, other
        priority: body.priority || 5, // 1-10, where 10 is highest
        active: body.active !== undefined ? body.active : true,
        playCount: 0,
        lastPlayed: null,
        tags: body.tags || [],
        createdAt: new Date().toISOString(),
        createdBy: c.get('userId')
      };

      await kv.set(`jingle:${jingleId}`, jingle);

      console.log(`✅ Jingle created: ${jingle.title} (${jingleId})`);
      return c.json({ jingle }, 201);
    } catch (error: any) {
      console.error('Create jingle error:', error);
      return c.json({ error: `Create jingle error: ${error.message}` }, 500);
    }
  });

  // Update jingle
  app.put("/make-server-06086aa3/jingles/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      
      const jingle = await kv.get(`jingle:${id}`);
      if (!jingle) {
        return c.json({ error: 'Jingle not found' }, 404);
      }

      const updatedJingle = { 
        ...jingle, 
        ...body, 
        id: jingle.id, // Don't allow ID change
        playCount: jingle.playCount, // Don't allow manual playCount change
        lastPlayed: jingle.lastPlayed, // Don't allow manual lastPlayed change
        updatedAt: new Date().toISOString() 
      };
      
      await kv.set(`jingle:${id}`, updatedJingle);

      console.log(`✅ Jingle updated: ${id}`);
      return c.json({ jingle: updatedJingle });
    } catch (error: any) {
      console.error('Update jingle error:', error);
      return c.json({ error: `Update jingle error: ${error.message}` }, 500);
    }
  });

  // Delete jingle
  app.delete("/make-server-06086aa3/jingles/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      
      const jingle = await kv.get(`jingle:${id}`);
      if (!jingle) {
        return c.json({ error: 'Jingle not found' }, 404);
      }

      // Delete file from storage if exists
      if (jingle.storageFilename) {
        try {
          await supabase.storage
            .from('make-06086aa3-jingles')
            .remove([jingle.storageFilename]);
          console.log(`🗑️  Deleted jingle file: ${jingle.storageFilename}`);
        } catch (storageError) {
          console.error('Storage delete error:', storageError);
        }
      }

      // Delete jingle record
      await kv.del(`jingle:${id}`);

      // Delete associated rules
      const rules = await kv.getByPrefix('jingle-rule:');
      for (const rule of rules) {
        if (rule.value.jingleId === id) {
          await kv.del(rule.key);
          console.log(`🗑️  Deleted rule: ${rule.key}`);
        }
      }

      console.log(`✅ Jingle deleted: ${id}`);
      return c.json({ message: 'Jingle deleted successfully' });
    } catch (error: any) {
      console.error('Delete jingle error:', error);
      return c.json({ error: `Delete jingle error: ${error.message}` }, 500);
    }
  });

  // Upload jingle audio file
  app.post("/make-server-06086aa3/jingles/:id/upload", requireAuth, async (c) => {
    try {
      const jingleId = c.req.param('id');
      const formData = await c.req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a'];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
        return c.json({ error: 'Invalid file type. Only MP3, WAV, and M4A are supported.' }, 400);
      }

      // Validate file size (10MB max for jingles)
      if (file.size > 10485760) {
        return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400);
      }

      // Get jingle to verify it exists
      const jingle = await kv.get(`jingle:${jingleId}`);
      if (!jingle) {
        return c.json({ error: 'Jingle not found' }, 404);
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'mp3';
      const fileName = `${jingleId}-${Date.now()}.${fileExt}`;
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Extract metadata using music-metadata
      let duration = 0;
      try {
        const metadata = await parseBuffer(uint8Array, file.type || 'audio/mpeg');
        duration = Math.round(metadata.format.duration || 0);
        console.log(`📊 Jingle metadata extracted: duration=${duration}s`);
      } catch (metadataError) {
        console.error('Metadata extraction error:', metadataError);
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('make-06086aa3-jingles')
        .upload(fileName, uint8Array, {
          contentType: file.type || 'audio/mpeg',
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        return c.json({ error: `Failed to upload file: ${error.message}` }, 500);
      }

      // Update jingle with file info
      const updatedJingle = {
        ...jingle,
        storageFilename: fileName,
        storageBucket: 'make-06086aa3-jingles',
        duration: duration,
        fileUrl: fileName, // Will use storage path
        updatedAt: new Date().toISOString()
      };
      await kv.set(`jingle:${jingleId}`, updatedJingle);

      console.log(`✅ Jingle file uploaded: ${jingleId} (${fileName})`);

      return c.json({ 
        message: 'Jingle file uploaded successfully',
        jingle: updatedJingle
      });
    } catch (error: any) {
      console.error('Upload jingle error:', error);
      return c.json({ error: `Upload jingle error: ${error.message}` }, 500);
    }
  });

  // Get jingle audio file signed URL (for preview playback)
  app.get("/make-server-06086aa3/jingles/:id/audio", async (c) => {
    try {
      const jingleId = c.req.param('id');
      const jingle = await kv.get(`jingle:${jingleId}`);
      
      if (!jingle) {
        return c.json({ error: 'Jingle not found' }, 404);
      }
      
      if (!jingle.storageFilename) {
        return c.json({ error: 'Jingle file not uploaded yet' }, 404);
      }

      // Create signed URL for temporary access (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from('make-06086aa3-jingles')
        .createSignedUrl(jingle.storageFilename, 3600); // 1 hour
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return c.json({ error: 'Failed to generate audio URL' }, 500);
      }

      return c.json({ 
        audioUrl: data.signedUrl,
        expiresIn: 3600
      });
    } catch (error: any) {
      console.error('Get jingle audio error:', error);
      return c.json({ error: `Get jingle audio error: ${error.message}` }, 500);
    }
  });

  // ==================== JINGLE RULES ====================

  // Get all jingle rules
  app.get("/make-server-06086aa3/jingle-rules", async (c) => {
    try {
      const jingleId = c.req.query('jingleId');
      const active = c.req.query('active');
      const rules = await kv.getByPrefix('jingle-rule:');
      
      let filteredRules = rules.map(item => item.value);
      
      if (jingleId) {
        filteredRules = filteredRules.filter(rule => rule.jingleId === jingleId);
      }
      
      if (active !== undefined) {
        const isActive = active === 'true';
        filteredRules = filteredRules.filter(rule => rule.active === isActive);
      }

      return c.json({ rules: filteredRules });
    } catch (error: any) {
      console.error('Get jingle rules error:', error);
      return c.json({ error: `Get jingle rules error: ${error.message}` }, 500);
    }
  });

  // Get single jingle rule
  app.get("/make-server-06086aa3/jingle-rules/:id", async (c) => {
    try {
      const id = c.req.param('id');
      const rule = await kv.get(`jingle-rule:${id}`);
      
      if (!rule) {
        return c.json({ error: 'Jingle rule not found' }, 404);
      }

      return c.json({ rule });
    } catch (error: any) {
      console.error('Get jingle rule error:', error);
      return c.json({ error: `Get jingle rule error: ${error.message}` }, 500);
    }
  });

  // Create jingle rule
  app.post("/make-server-06086aa3/jingle-rules", requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const ruleId = crypto.randomUUID();
      
      // Validate jingle exists
      const jingle = await kv.get(`jingle:${body.jingleId}`);
      if (!jingle) {
        return c.json({ error: 'Jingle not found' }, 400);
      }
      
      const rule = {
        id: ruleId,
        jingleId: body.jingleId,
        ruleType: body.ruleType || 'interval', // interval, time_based, track_count, show_based, schedule_based
        intervalMinutes: body.intervalMinutes || null, // For interval type
        specificTimes: body.specificTimes || [], // For time_based type, e.g., ["09:00", "12:00"]
        daysOfWeek: body.daysOfWeek || null, // null = all days, or array [0-6] where 0=Sunday
        trackInterval: body.trackInterval || null, // For track_count type
        showId: body.showId || null, // For show_based type
        // Schedule-based fields
        scheduleId: body.scheduleId || null, // For schedule_based type — specific schedule slot
        schedulePosition: body.schedulePosition || null, // 'intro' | 'outro' | 'during'
        playlistId: body.playlistId || null, // For schedule_based — match by playlist
        position: body.position || 'before_track', // before_track, after_track, between_tracks
        minGapMinutes: body.minGapMinutes || 15, // Minimum gap between plays of this jingle
        active: body.active !== undefined ? body.active : true,
        createdAt: new Date().toISOString(),
        createdBy: c.get('userId')
      };

      await kv.set(`jingle-rule:${ruleId}`, rule);

      console.log(`✅ Jingle rule created: ${ruleId} (type: ${rule.ruleType})`);
      return c.json({ rule }, 201);
    } catch (error: any) {
      console.error('Create jingle rule error:', error);
      return c.json({ error: `Create jingle rule error: ${error.message}` }, 500);
    }
  });

  // Update jingle rule
  app.put("/make-server-06086aa3/jingle-rules/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      
      const rule = await kv.get(`jingle-rule:${id}`);
      if (!rule) {
        return c.json({ error: 'Jingle rule not found' }, 404);
      }

      const updatedRule = { 
        ...rule, 
        ...body, 
        id: rule.id,
        updatedAt: new Date().toISOString() 
      };
      
      await kv.set(`jingle-rule:${id}`, updatedRule);

      console.log(`✅ Jingle rule updated: ${id}`);
      return c.json({ rule: updatedRule });
    } catch (error: any) {
      console.error('Update jingle rule error:', error);
      return c.json({ error: `Update jingle rule error: ${error.message}` }, 500);
    }
  });

  // Delete jingle rule
  app.delete("/make-server-06086aa3/jingle-rules/:id", requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      await kv.del(`jingle-rule:${id}`);
      
      console.log(`✅ Jingle rule deleted: ${id}`);
      return c.json({ message: 'Jingle rule deleted successfully' });
    } catch (error: any) {
      console.error('Delete jingle rule error:', error);
      return c.json({ error: `Delete jingle rule error: ${error.message}` }, 500);
    }
  });
}