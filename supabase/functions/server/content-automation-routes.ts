/**
 * Soul FM - Content Automation Routes
 * API endpoints для системы автоматизации контента
 */

import { Hono } from 'npm:hono@4';
import * as db from './content-automation-db.ts';
import * as engine from './content-automation-engine.ts';
import * as api from './content-automation-api.ts';
import { seedAutomationData } from './seed-automation.ts';

export function setupAutomationRoutes(app: any, supabase: any, requireAuth: any) {
  console.log('🎬 Setting up Content Automation routes...');

  // ==================== API KEYS ====================

  // Set API keys
  app.post('/make-server-06086aa3/automation/api-keys', requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const { service, apiKey } = body;

      if (!service || !apiKey) {
        return c.json({ error: 'service and apiKey are required' }, 400);
      }

      engine.setApiKey(service, apiKey);

      return c.json({ 
        message: `API key set for ${service}`,
        service
      });
    } catch (error: any) {
      console.error('Set API key error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Test API connection
  app.post('/make-server-06086aa3/automation/test-api/:service', requireAuth, async (c: any) => {
    try {
      const service = c.req.param('service');
      const body = await c.req.json();
      const { apiKey } = body;

      if (!apiKey) {
        return c.json({ error: 'apiKey is required' }, 400);
      }

      let testResult;

      if (service === 'elevenlabs') {
        testResult = await api.listElevenLabsVoices(apiKey);
        return c.json({ 
          success: true, 
          message: 'ElevenLabs API connection successful',
          voicesCount: testResult.length,
          voices: testResult.slice(0, 10) // First 10 voices
        });
      } else if (service === 'claude') {
        testResult = await api.generateScriptWithClaude('Test prompt: Say hello', apiKey, 50);
        return c.json({ 
          success: true, 
          message: 'Claude API connection successful',
          testResponse: testResult
        });
      } else if (service === 'perplexity') {
        testResult = await api.fetchNewsFromPerplexity('Latest tech news', apiKey);
        return c.json({ 
          success: true, 
          message: 'Perplexity API connection successful',
          testResponse: testResult.substring(0, 200) + '...'
        });
      } else {
        return c.json({ error: 'Invalid service. Use: elevenlabs, claude, or perplexity' }, 400);
      }
    } catch (error: any) {
      console.error('Test API error:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
  });

  // Test ElevenLabs connection (GET with environment variable)
  app.get('/make-server-06086aa3/automation/test-elevenlabs', requireAuth, async (c: any) => {
    try {
      const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
      
      if (!apiKey) {
        return c.json({ 
          success: false,
          error: 'ELEVENLABS_API_KEY не настроен в переменных окружения' 
        }, 400);
      }

      const voices = await api.listElevenLabsVoices(apiKey);
      
      return c.json({ 
        success: true, 
        message: 'ElevenLabs API подключен успешно',
        voicesCount: voices.length,
        voices: voices
      });
    } catch (error: any) {
      console.error('Test ElevenLabs error:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
  });

  // Test voice generation
  app.post('/make-server-06086aa3/automation/test-voice', requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const { voiceId, text } = body;

      if (!voiceId || !text) {
        return c.json({ error: 'voiceId and text are required' }, 400);
      }

      const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
      
      if (!apiKey) {
        return c.json({ 
          success: false,
          error: 'ELEVENLABS_API_KEY не настроен в переменных окружения' 
        }, 400);
      }

      console.log(`🎙️ Testing voice generation: ${voiceId}`);
      const audioData = await api.generateAudioWithElevenLabs(text, voiceId, apiKey);
      
      // Save test audio to storage
      const filename = `test-voice-${voiceId}-${Date.now()}.mp3`;
      const bucketName = 'make-06086aa3-tracks';

      // Check if bucket exists, create if not
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((bucket: any) => bucket.name === bucketName);
      
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, { public: false });
      }

      // Upload audio
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filename, audioData, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload error: ${uploadError.message}`);
      }

      // Get signed URL
      const { data: signedUrlData } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filename, 3600); // 1 hour

      return c.json({ 
        success: true, 
        message: 'Тестовое аудио сгенерировано',
        audioUrl: signedUrlData?.signedUrl,
        audioSize: audioData.length
      });
    } catch (error: any) {
      console.error('Test voice error:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
  });

  // ==================== SCHEDULE MANAGEMENT ====================

  // Get all schedule items
  app.get('/make-server-06086aa3/automation/schedule', requireAuth, async (c: any) => {
    try {
      const items = await db.getAllScheduleItems();
      return c.json({ schedule: items, count: items.length });
    } catch (error: any) {
      console.error('Get schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Get single schedule item
  app.get('/make-server-06086aa3/automation/schedule/:id', requireAuth, async (c: any) => {
    try {
      const id = c.req.param('id');
      const item = await db.getScheduleItem(id);

      if (!item) {
        return c.json({ error: 'Schedule item not found' }, 404);
      }

      return c.json({ schedule: item });
    } catch (error: any) {
      console.error('Get schedule item error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Create schedule item
  app.post('/make-server-06086aa3/automation/schedule', requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const item = await db.createScheduleItem(body);

      return c.json({ 
        message: 'Schedule item created',
        schedule: item 
      }, 201);
    } catch (error: any) {
      console.error('Create schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Update schedule item
  app.put('/make-server-06086aa3/automation/schedule/:id', requireAuth, async (c: any) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const item = await db.updateScheduleItem(id, body);

      return c.json({ 
        message: 'Schedule item updated',
        schedule: item 
      });
    } catch (error: any) {
      console.error('Update schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Delete schedule item
  app.delete('/make-server-06086aa3/automation/schedule/:id', requireAuth, async (c: any) => {
    try {
      const id = c.req.param('id');
      await db.deleteScheduleItem(id);

      return c.json({ message: 'Schedule item deleted' });
    } catch (error: any) {
      console.error('Delete schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== VOICE MANAGEMENT ====================

  // Get all voices
  app.get('/make-server-06086aa3/automation/voices', requireAuth, async (c: any) => {
    try {
      const voices = await db.getAllVoices();
      return c.json({ voices, count: voices.length });
    } catch (error: any) {
      console.error('Get voices error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Create voice
  app.post('/make-server-06086aa3/automation/voices', requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const voice = await db.createVoice(body);

      return c.json({ 
        message: 'Voice created',
        voice 
      }, 201);
    } catch (error: any) {
      console.error('Create voice error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Update voice
  app.put('/make-server-06086aa3/automation/voices/:id', requireAuth, async (c: any) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const voice = await db.updateVoice(id, body);

      return c.json({ 
        message: 'Voice updated',
        voice 
      });
    } catch (error: any) {
      console.error('Update voice error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Delete voice
  app.delete('/make-server-06086aa3/automation/voices/:id', requireAuth, async (c: any) => {
    try {
      const id = c.req.param('id');
      await db.deleteVoice(id);

      return c.json({ message: 'Voice deleted' });
    } catch (error: any) {
      console.error('Delete voice error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== CONTENT GENERATION ====================

  // Generate content for specific schedule item
  app.post('/make-server-06086aa3/automation/generate/:scheduleId', requireAuth, async (c: any) => {
    try {
      const scheduleId = c.req.param('scheduleId');
      const body = await c.req.json();
      const { broadcastDate } = body;

      const scheduleItem = await db.getScheduleItem(scheduleId);
      if (!scheduleItem) {
        return c.json({ error: 'Schedule item not found' }, 404);
      }

      const date = broadcastDate || new Date().toISOString().split('T')[0];
      const content = await engine.generateContentForScheduleItem(scheduleItem, date);

      return c.json({ 
        message: 'Content generated successfully',
        content 
      });
    } catch (error: any) {
      console.error('Generate content error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Manual/custom content generation
  app.post('/make-server-06086aa3/automation/generate-custom', requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const content = await engine.generateCustomContent(body);

      return c.json({ 
        message: 'Custom content generated successfully',
        content 
      });
    } catch (error: any) {
      console.error('Generate custom content error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Generate all scheduled content for a date
  app.post('/make-server-06086aa3/automation/generate-all', requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const { date } = body;

      const targetDate = date || new Date().toISOString().split('T')[0];
      const results = await engine.generateAllScheduledContentForDate(targetDate);

      return c.json({ 
        message: `Generated ${results.length} content items for ${targetDate}`,
        content: results,
        count: results.length
      });
    } catch (error: any) {
      console.error('Generate all content error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== GENERATED CONTENT ====================

  // Get all generated content
  app.get('/make-server-06086aa3/automation/content', requireAuth, async (c: any) => {
    try {
      const limit = parseInt(c.req.query('limit') || '50');
      const content = await db.getAllGeneratedContent(limit);

      return c.json({ content, count: content.length });
    } catch (error: any) {
      console.error('Get content error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Get content by date
  app.get('/make-server-06086aa3/automation/content/date/:date', requireAuth, async (c: any) => {
    try {
      const date = c.req.param('date');
      const content = await db.getContentByDate(date);

      return c.json({ content, count: content.length, date });
    } catch (error: any) {
      console.error('Get content by date error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Get content by status
  app.get('/make-server-06086aa3/automation/content/status/:status', requireAuth, async (c: any) => {
    try {
      const status = c.req.param('status');
      const content = await db.getContentByStatus(status as any);

      return c.json({ content, count: content.length, status });
    } catch (error: any) {
      console.error('Get content by status error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Get single content item
  app.get('/make-server-06086aa3/automation/content/:id', requireAuth, async (c: any) => {
    try {
      const id = c.req.param('id');
      const content = await db.getGeneratedContent(id);

      if (!content) {
        return c.json({ error: 'Content not found' }, 404);
      }

      return c.json({ content });
    } catch (error: any) {
      console.error('Get content item error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== BROADCAST LOGS ====================

  // Get broadcast logs
  app.get('/make-server-06086aa3/automation/logs', requireAuth, async (c: any) => {
    try {
      const limit = parseInt(c.req.query('limit') || '50');
      const logs = await db.getAllBroadcastLogs(limit);

      return c.json({ logs, count: logs.length });
    } catch (error: any) {
      console.error('Get logs error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== AUTOMATION PROMPTS ====================

  // Get all prompts
  app.get('/make-server-06086aa3/automation/prompts', requireAuth, async (c: any) => {
    try {
      const prompts = await db.getAllAutomationPrompts();
      return c.json({ prompts, count: prompts.length });
    } catch (error: any) {
      console.error('Get prompts error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Create prompt
  app.post('/make-server-06086aa3/automation/prompts', requireAuth, async (c: any) => {
    try {
      const body = await c.req.json();
      const prompt = await db.createAutomationPrompt(body);

      return c.json({ 
        message: 'Prompt created',
        prompt 
      }, 201);
    } catch (error: any) {
      console.error('Create prompt error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Update prompt
  app.put('/make-server-06086aa3/automation/prompts/:id', requireAuth, async (c: any) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const prompt = await db.updateAutomationPrompt(id, body);

      return c.json({ 
        message: 'Prompt updated',
        prompt 
      });
    } catch (error: any) {
      console.error('Update prompt error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== STATISTICS ====================

  // Get automation stats
  app.get('/make-server-06086aa3/automation/stats', requireAuth, async (c: any) => {
    try {
      const stats = await db.getAutomationStats();
      const scheduleCount = (await db.getActiveScheduleItems()).length;
      const voicesCount = (await db.getAllVoices()).filter(v => v.isActive).length;

      return c.json({ 
        stats: {
          ...stats,
          activeScheduleItems: scheduleCount,
          activeVoices: voicesCount
        }
      });
    } catch (error: any) {
      console.error('Get stats error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== SCHEDULER (CRON-LIKE) ====================

  // Check and generate scheduled content (called by cron or manually)
  app.post('/make-server-06086aa3/automation/check-schedule', async (c: any) => {
    try {
      const results = await engine.checkAndGenerateScheduledContent();

      return c.json({ 
        message: results.length > 0 
          ? `Generated ${results.length} content items`
          : 'No scheduled content for this time',
        content: results,
        count: results.length
      });
    } catch (error: any) {
      console.error('Check schedule error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ==================== INITIALIZATION ====================

  // Seed automation data
  app.post('/make-server-06086aa3/automation/seed', requireAuth, async (c: any) => {
    try {
      const result = await seedAutomationData();
      return c.json(result);
    } catch (error: any) {
      console.error('Seed automation error:', error);
      return c.json({ 
        success: false,
        error: error.message 
      }, 500);
    }
  });

  console.log('✅ Content Automation routes configured');
}