/**
 * Soul FM - Content Automation Engine
 * Основная логика автоматической генерации контента
 */

import * as db from './content-automation-db.ts';
import * as api from './content-automation-api.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==================== API KEYS MANAGEMENT ====================

let cachedApiKeys: { [key: string]: string } = {};

async function getApiKey(service: 'perplexity' | 'claude' | 'elevenlabs'): Promise<string> {
  // Check cache first
  if (cachedApiKeys[service]) {
    return cachedApiKeys[service];
  }

  // Try environment variables
  const envKey = Deno.env.get(`${service.toUpperCase()}_API_KEY`);
  if (envKey) {
    cachedApiKeys[service] = envKey;
    return envKey;
  }

  throw new Error(`API key not found for ${service}. Please set ${service.toUpperCase()}_API_KEY environment variable.`);
}

export function setApiKey(service: string, key: string) {
  cachedApiKeys[service] = key;
  console.log(`🔑 API key set for ${service}`);
}

// ==================== CONTENT GENERATION ====================

export async function generateContentForScheduleItem(
  scheduleItem: db.ScheduleItem,
  broadcastDate: string
): Promise<db.GeneratedContent> {
  console.log(`\n🎬 Starting content generation for: ${scheduleItem.hostName} - ${scheduleItem.topic || scheduleItem.showType}`);
  console.log(`📅 Broadcast: ${broadcastDate} ${scheduleItem.time}`);

  // Create content record
  const content = await db.createGeneratedContent({
    scheduleId: scheduleItem.id,
    broadcastDate,
    broadcastTime: scheduleItem.time,
    contentType: scheduleItem.showType,
    scriptText: '',
    status: 'generating'
  });

  try {
    // Step 1: Fetch news if needed
    let newsData = '';
    if (scheduleItem.perplexityQuery && scheduleItem.showType === 'news') {
      console.log('📰 Step 1/4: Fetching news from Perplexity...');
      try {
        const perplexityKey = await getApiKey('perplexity');
        newsData = await api.fetchNewsFromPerplexity(scheduleItem.perplexityQuery, perplexityKey);
        
        await db.updateGeneratedContent(content.id, {
          rawNewsText: newsData,
          perplexityResponse: newsData
        });
      } catch (error) {
        console.warn('⚠️ Perplexity error:', error.message);
        newsData = 'Актуальные новости недоступны.';
      }
    } else {
      console.log('📰 Step 1/4: Skipping news fetch (not required)');
    }

    // Step 2: Generate script with Claude
    console.log('🤖 Step 2/4: Generating script with Claude...');
    const claudeKey = await getApiKey('claude');
    
    // Get custom prompt or use default
    let prompt = '';
    const customPrompt = await db.getPromptByType(scheduleItem.showType);
    
    if (customPrompt) {
      prompt = customPrompt.promptTemplate;
    } else if (scheduleItem.showType === 'affirmation') {
      prompt = api.PROMPT_TEMPLATES.affirmation;
    } else if (scheduleItem.showType === 'news') {
      prompt = api.PROMPT_TEMPLATES.news(scheduleItem.topic || 'общие новости', newsData);
    } else if (scheduleItem.showType === 'breathing') {
      prompt = api.PROMPT_TEMPLATES.breathing;
    } else {
      prompt = `Создай короткий радио-скрипт на тему "${scheduleItem.topic}" длительностью 1-1.5 минуты. Стиль: живой, разговорный, для радио на русском языке.`;
    }

    const mainScript = await api.generateScriptWithClaude(prompt, claudeKey);
    const fullScript = api.buildFullScript(scheduleItem.introText, mainScript, scheduleItem.outroText);

    await db.updateGeneratedContent(content.id, {
      scriptText: fullScript,
      claudeResponse: mainScript
    });

    console.log(`✅ Script generated (${fullScript.length} chars, ~${api.estimateSpeechDuration(fullScript)}s)`);

    // Step 3: Generate audio with ElevenLabs
    console.log('🎙️ Step 3/4: Generating audio with ElevenLabs...');
    const elevenLabsKey = await getApiKey('elevenlabs');
    
    if (!api.validateVoiceId(scheduleItem.voiceId)) {
      throw new Error(`Invalid ElevenLabs voice ID: ${scheduleItem.voiceId}`);
    }

    const audioData = await api.generateAudioWithElevenLabs(fullScript, scheduleItem.voiceId, elevenLabsKey);

    // Step 4: Upload audio to Supabase Storage
    console.log('☁️ Step 4/4: Uploading audio to storage...');
    const timestamp = Date.now();
    const filename = `automation/${broadcastDate}/${scheduleItem.hostName.replace(/\s+/g, '-')}-${scheduleItem.time.replace(':', '')}-${timestamp}.mp3`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('make-06086aa3-tracks')
      .upload(filename, audioData, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    console.log(`✅ Audio uploaded: ${filename}`);

    // Update content with success
    await db.updateGeneratedContent(content.id, {
      audioStoragePath: filename,
      status: 'generated',
      elevenLabsResponse: `Audio generated: ${audioData.length} bytes`
    });

    // Create broadcast log
    await db.createBroadcastLog({
      contentId: content.id,
      broadcastTimestamp: new Date().toISOString(),
      success: true,
      fileDurationSeconds: api.estimateSpeechDuration(fullScript)
    });

    console.log(`\n✅ Content generation complete: ${content.id}`);
    console.log(`   Host: ${scheduleItem.hostName}`);
    console.log(`   Topic: ${scheduleItem.topic || scheduleItem.showType}`);
    console.log(`   Storage: ${filename}`);

    return await db.getGeneratedContent(content.id) as db.GeneratedContent;

  } catch (error) {
    console.error('❌ Content generation failed:', error);

    // Update content with failure
    await db.updateGeneratedContent(content.id, {
      status: 'failed',
      errorMessage: error.message || String(error)
    });

    // Create failed broadcast log
    await db.createBroadcastLog({
      contentId: content.id,
      broadcastTimestamp: new Date().toISOString(),
      success: false,
      errorMessage: error.message || String(error)
    });

    throw error;
  }
}

// ==================== SCHEDULED GENERATION ====================

export async function checkAndGenerateScheduledContent(): Promise<db.GeneratedContent[]> {
  console.log('\n⏰ Checking for scheduled content generation...');
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];

  console.log(`   Current time: ${currentTime}`);
  console.log(`   Date: ${today}`);

  // Get schedule for current time
  const scheduleItem = await db.getScheduleForTime(currentTime);

  if (!scheduleItem) {
    console.log('   No scheduled content for this time');
    return [];
  }

  console.log(`   Found scheduled item: ${scheduleItem.hostName} - ${scheduleItem.topic || scheduleItem.showType}`);

  // Check if already generated today
  const existingContent = await db.getContentByDate(today);
  const alreadyGenerated = existingContent.some(
    c => c.scheduleId === scheduleItem.id && c.broadcastTime === currentTime
  );

  if (alreadyGenerated) {
    console.log('   Content already generated for this time slot today');
    return [];
  }

  // Generate content
  try {
    const content = await generateContentForScheduleItem(scheduleItem, today);
    return [content];
  } catch (error) {
    console.error('   Generation failed:', error.message);
    return [];
  }
}

// ==================== BATCH GENERATION ====================

export async function generateAllScheduledContentForDate(date: string): Promise<db.GeneratedContent[]> {
  console.log(`\n📅 Generating all scheduled content for ${date}...`);

  const allSchedule = await db.getActiveScheduleItems();
  console.log(`   Found ${allSchedule.length} active schedule items`);

  const results: db.GeneratedContent[] = [];

  for (const scheduleItem of allSchedule) {
    try {
      console.log(`\n   Generating for ${scheduleItem.time} - ${scheduleItem.hostName}...`);
      const content = await generateContentForScheduleItem(scheduleItem, date);
      results.push(content);
    } catch (error) {
      console.error(`   Failed to generate for ${scheduleItem.hostName}:`, error.message);
    }
  }

  console.log(`\n✅ Batch generation complete: ${results.length}/${allSchedule.length} succeeded`);
  return results;
}

// ==================== MANUAL GENERATION ====================

export async function generateCustomContent(params: {
  hostName: string;
  topic: string;
  showType: db.ShowType;
  voiceId: string;
  introText: string;
  outroText: string;
  perplexityQuery?: string;
}): Promise<db.GeneratedContent> {
  console.log(`\n🎨 Manual content generation: ${params.hostName} - ${params.topic}`);

  // Create temporary schedule item
  const tempScheduleItem: db.ScheduleItem = {
    id: `temp-${Date.now()}`,
    time: new Date().toTimeString().slice(0, 5),
    hostName: params.hostName,
    showType: params.showType,
    topic: params.topic,
    introText: params.introText,
    outroText: params.outroText,
    durationMinutes: 2,
    voiceId: params.voiceId,
    perplexityQuery: params.perplexityQuery,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const today = new Date().toISOString().split('T')[0];
  return await generateContentForScheduleItem(tempScheduleItem, today);
}
