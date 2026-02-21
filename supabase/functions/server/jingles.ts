// Jingles and Jingle Rules endpoints
// Uses signed-URL upload pattern (same as tracks) to bypass Edge Function body size limits
import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";

const JINGLE_BUCKET = 'make-06086aa3-jingles';
const MAX_JINGLE_SIZE = 15 * 1024 * 1024; // 15 MB

export function setupJinglesRoutes(app: Hono, supabase: any, requireAuth: any) {
  
  // ==================== JINGLES ====================

  // Get all jingles
  app.get("/make-server-06086aa3/jingles", async (c) => {
    try {
      const category = c.req.query('category');
      const active = c.req.query('active');
      const jingles = await kv.getByPrefix('jingle:');
      
      let filteredJingles = jingles;
      
      if (category) {
        filteredJingles = filteredJingles.filter((jingle: any) => 
          jingle.category === category
        );
      }
      
      if (active !== undefined) {
        const isActive = active === 'true';
        filteredJingles = filteredJingles.filter((jingle: any) => 
          jingle.active === isActive
        );
      }

      // Sort by priority (highest first), then by title
      filteredJingles.sort((a: any, b: any) => {
        if ((a.priority || 0) !== (b.priority || 0)) {
          return (b.priority || 0) - (a.priority || 0);
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

  // Create jingle (metadata only)
  app.post("/make-server-06086aa3/jingles", requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const jingleId = crypto.randomUUID();
      
      const jingle = {
        id: jingleId,
        title: body.title || 'Untitled Jingle',
        description: body.description || '',
        fileUrl: null as string | null,
        storageFilename: null as string | null,
        storageBucket: JINGLE_BUCKET,
        duration: body.duration || 0,
        category: body.category || 'other',
        priority: body.priority || 5,
        active: body.active !== undefined ? body.active : true,
        playCount: 0,
        lastPlayed: null as string | null,
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
        id: jingle.id,
        playCount: jingle.playCount,
        lastPlayed: jingle.lastPlayed,
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
            .from(JINGLE_BUCKET)
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
        if (rule.jingleId === id && rule.id) {
          await kv.del(`jingle-rule:${rule.id}`);
          console.log(`🗑️  Deleted rule: jingle-rule:${rule.id}`);
        }
      }

      console.log(`✅ Jingle deleted: ${id}`);
      return c.json({ message: 'Jingle deleted successfully' });
    } catch (error: any) {
      console.error('Delete jingle error:', error);
      return c.json({ error: `Delete jingle error: ${error.message}` }, 500);
    }
  });

  // ─── SIGNED-URL UPLOAD FLOW (bypasses Edge Function body limit) ───

  // Step 1: Get a signed upload URL for direct-to-Storage upload
  app.post("/make-server-06086aa3/jingles/get-upload-url", requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const { jingleId, originalFilename, contentType } = body;
      console.log(`📤 [jingle-upload-url] jingleId=${jingleId}, file=${originalFilename}, type=${contentType}`);

      if (!jingleId) {
        return c.json({ error: 'jingleId is required' }, 400);
      }
      if (!originalFilename) {
        return c.json({ error: 'originalFilename is required' }, 400);
      }

      // Verify jingle exists
      const jingle = await kv.get(`jingle:${jingleId}`);
      if (!jingle) {
        return c.json({ error: 'Jingle not found' }, 404);
      }

      // Generate storage filename
      const extension = (originalFilename.split('.').pop() || 'mp3').toLowerCase();
      const filename = `${jingleId}-${Date.now()}.${extension}`;

      // Create signed upload URL (valid 10 minutes)
      console.log(`📤 [jingle-upload-url] Creating signed URL: bucket=${JINGLE_BUCKET}, file=${filename}`);
      const { data, error } = await supabase.storage
        .from(JINGLE_BUCKET)
        .createSignedUploadUrl(filename);

      if (error) {
        console.error('❌ [jingle-upload-url] Signed URL creation failed:', error);
        return c.json({ error: `Failed to create upload URL: ${error.message}` }, 500);
      }

      if (!data?.signedUrl) {
        console.error('❌ [jingle-upload-url] No signedUrl in response:', JSON.stringify(data));
        return c.json({ error: 'No signed URL returned from storage' }, 500);
      }

      console.log(`✅ [jingle-upload-url] Signed URL created for: ${filename}`);

      return c.json({
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path,
        filename,
        bucket: JINGLE_BUCKET,
      });
    } catch (error: any) {
      console.error('❌ [jingle-upload-url] Error:', error);
      return c.json({ error: `Failed to create upload URL: ${error.message}` }, 500);
    }
  });

  // Step 2: Process an already-uploaded jingle file (extract duration, update record)
  app.post("/make-server-06086aa3/jingles/process-upload", requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const { jingleId, filename, bucket } = body;
      console.log(`🔧 [jingle-process] jingleId=${jingleId}, filename=${filename}`);

      if (!jingleId || !filename) {
        return c.json({ error: 'jingleId and filename are required' }, 400);
      }

      const jingle = await kv.get(`jingle:${jingleId}`);
      if (!jingle) {
        return c.json({ error: 'Jingle not found' }, 404);
      }

      const useBucket = bucket || JINGLE_BUCKET;

      // Try to extract duration from the uploaded file
      let duration = jingle.duration || 0;
      try {
        console.log(`📊 [jingle-process] Downloading file for metadata extraction...`);
        const { data: fileData, error: dlError } = await supabase.storage
          .from(useBucket)
          .download(filename);

        if (dlError) {
          console.error('❌ [jingle-process] Download for metadata failed:', dlError.message);
        } else if (fileData) {
          const arrayBuf = await fileData.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuf);

          // Try music-metadata
          try {
            const { parseBuffer } = await import("npm:music-metadata@10");
            const metadata = await parseBuffer(uint8);
            if (metadata?.format?.duration) {
              duration = Math.round(metadata.format.duration);
              console.log(`📊 [jingle-process] Duration extracted: ${duration}s`);
            }
          } catch (mmErr: any) {
            console.warn(`⚠️ [jingle-process] music-metadata failed: ${mmErr?.message || mmErr}`);
            // Fallback: estimate from file size (very rough: mp3 ~128kbps)
            const fileSizeBytes = uint8.length;
            const estimatedDuration = Math.round(fileSizeBytes / (128 * 1024 / 8));
            if (estimatedDuration > 0 && estimatedDuration < 600) {
              duration = estimatedDuration;
              console.log(`📊 [jingle-process] Duration estimated from filesize: ~${duration}s`);
            }
          }
        }
      } catch (metaErr: any) {
        console.warn(`⚠️ [jingle-process] Metadata extraction skipped: ${metaErr?.message || metaErr}`);
      }

      // Delete old file if replacing
      if (jingle.storageFilename && jingle.storageFilename !== filename) {
        try {
          await supabase.storage.from(useBucket).remove([jingle.storageFilename]);
          console.log(`🗑️  Deleted old jingle file: ${jingle.storageFilename}`);
        } catch (_) { /* ignore */ }
      }

      // Update jingle record
      const updatedJingle = {
        ...jingle,
        storageFilename: filename,
        storageBucket: useBucket,
        duration,
        fileUrl: filename,
        updatedAt: new Date().toISOString(),
      };
      await kv.set(`jingle:${jingleId}`, updatedJingle);

      console.log(`✅ [jingle-process] Jingle processed: "${updatedJingle.title}" (${filename}, ${duration}s)`);

      return c.json({
        message: 'Jingle file processed successfully',
        jingle: updatedJingle,
      });
    } catch (error: any) {
      console.error('❌ [jingle-process] Error:', error);
      return c.json({ error: `Process jingle upload error: ${error.message}` }, 500);
    }
  });

  // Legacy: Upload jingle audio file via FormData (kept for backward compat, but signed URL is preferred)
  app.post("/make-server-06086aa3/jingles/:id/upload", requireAuth, async (c) => {
    try {
      const jingleId = c.req.param('id');
      console.log(`📤 [jingle-legacy-upload] jingleId=${jingleId} — WARNING: prefer /jingles/get-upload-url flow`);

      const formData = await c.req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/ogg', 'audio/aac'];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|aac)$/i)) {
        return c.json({ error: 'Invalid file type. Only MP3, WAV, M4A, OGG, AAC are supported.' }, 400);
      }

      if (file.size > MAX_JINGLE_SIZE) {
        return c.json({ error: `File too large. Maximum size is ${MAX_JINGLE_SIZE / 1024 / 1024}MB.` }, 400);
      }

      const jingle = await kv.get(`jingle:${jingleId}`);
      if (!jingle) {
        return c.json({ error: 'Jingle not found' }, 404);
      }

      const fileExt = (file.name.split('.').pop() || 'mp3').toLowerCase();
      const fileName = `${jingleId}-${Date.now()}.${fileExt}`;
      
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Extract metadata
      let duration = 0;
      try {
        const { parseBuffer } = await import("npm:music-metadata@10");
        const metadata = await parseBuffer(uint8Array);
        duration = Math.round(metadata?.format?.duration || 0);
        console.log(`📊 Jingle metadata extracted: duration=${duration}s`);
      } catch (metadataError: any) {
        console.warn('⚠️ Metadata extraction failed:', metadataError?.message);
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(JINGLE_BUCKET)
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
        storageBucket: JINGLE_BUCKET,
        duration: duration,
        fileUrl: fileName,
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

      const bucket = jingle.storageBucket || JINGLE_BUCKET;

      // Create signed URL for temporary access (valid for 2 hours)
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(jingle.storageFilename, 7200);
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return c.json({ error: `Failed to generate audio URL: ${error.message}` }, 500);
      }

      return c.json({ 
        audioUrl: data.signedUrl,
        expiresIn: 7200
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
      
      let filteredRules = rules;
      
      if (jingleId) {
        filteredRules = filteredRules.filter((rule: any) => rule.jingleId === jingleId);
      }
      
      if (active !== undefined) {
        const isActive = active === 'true';
        filteredRules = filteredRules.filter((rule: any) => rule.active === isActive);
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
        ruleType: body.ruleType || 'interval',
        intervalMinutes: body.intervalMinutes || null,
        specificTimes: body.specificTimes || [],
        daysOfWeek: body.daysOfWeek || null,
        trackInterval: body.trackInterval || null,
        showId: body.showId || null,
        scheduleId: body.scheduleId || null,
        schedulePosition: body.schedulePosition || null,
        playlistId: body.playlistId || null,
        position: body.position || 'before_track',
        minGapMinutes: body.minGapMinutes || 15,
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
