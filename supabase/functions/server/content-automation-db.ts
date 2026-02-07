/**
 * Soul FM - Content Automation Database Utilities
 * Управление расписанием, голосами, сгенерированным контентом
 */

import * as kv from './kv_store.tsx';

// ==================== TYPES ====================

export type ShowType = 'affirmation' | 'news' | 'breathing' | 'custom';

export interface ScheduleItem {
  id: string;
  time: string; // HH:MM format
  hostName: string;
  showType: ShowType;
  topic?: string;
  introText: string;
  outroText: string;
  durationMinutes: number;
  voiceId: string;
  backgroundMusic?: string;
  perplexityQuery?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Voice {
  id: string;
  hostName: string;
  elevenLabsVoiceId: string;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  };
  backgroundMusic?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedContent {
  id: string;
  scheduleId: string;
  broadcastDate: string; // YYYY-MM-DD
  broadcastTime: string; // HH:MM
  contentType: ShowType;
  rawNewsText?: string;
  scriptText: string;
  audioStoragePath?: string;
  status: 'pending' | 'generating' | 'generated' | 'broadcast' | 'failed';
  perplexityResponse?: string;
  claudeResponse?: string;
  elevenLabsResponse?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastLog {
  id: string;
  contentId: string;
  broadcastTimestamp: string;
  success: boolean;
  fileDurationSeconds?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface AutomationPrompt {
  id: string;
  promptType: ShowType;
  promptTemplate: string;
  exampleOutput?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== SCHEDULE MANAGEMENT ====================

export async function createScheduleItem(item: Omit<ScheduleItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleItem> {
  const id = `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const scheduleItem: ScheduleItem = {
    ...item,
    id,
    createdAt: now,
    updatedAt: now
  };
  
  await kv.set(`automation-schedule:${id}`, scheduleItem);
  console.log(`✅ Created schedule item: ${id} (${item.hostName} - ${item.time})`);
  
  return scheduleItem;
}

export async function updateScheduleItem(id: string, updates: Partial<ScheduleItem>): Promise<ScheduleItem> {
  const existing = await kv.get(`automation-schedule:${id}`);
  if (!existing) {
    throw new Error(`Schedule item not found: ${id}`);
  }
  
  const updated: ScheduleItem = {
    ...existing,
    ...updates,
    id, // Don't allow ID changes
    updatedAt: new Date().toISOString()
  };
  
  await kv.set(`automation-schedule:${id}`, updated);
  console.log(`✅ Updated schedule item: ${id}`);
  
  return updated;
}

export async function deleteScheduleItem(id: string): Promise<void> {
  await kv.del(`automation-schedule:${id}`);
  console.log(`🗑️ Deleted schedule item: ${id}`);
}

export async function getScheduleItem(id: string): Promise<ScheduleItem | null> {
  return await kv.get(`automation-schedule:${id}`);
}

export async function getAllScheduleItems(): Promise<ScheduleItem[]> {
  const items = await kv.getByPrefix('automation-schedule:');
  return items.sort((a, b) => {
    // Sort by time
    if (a.time < b.time) return -1;
    if (a.time > b.time) return 1;
    return 0;
  });
}

export async function getActiveScheduleItems(): Promise<ScheduleItem[]> {
  const all = await getAllScheduleItems();
  return all.filter(item => item.isActive);
}

export async function getScheduleForTime(time: string): Promise<ScheduleItem | null> {
  const active = await getActiveScheduleItems();
  return active.find(item => item.time === time) || null;
}

// ==================== VOICE MANAGEMENT ====================

export async function createVoice(voice: Omit<Voice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Voice> {
  const id = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const voiceItem: Voice = {
    ...voice,
    id,
    createdAt: now,
    updatedAt: now
  };
  
  await kv.set(`automation-voice:${id}`, voiceItem);
  console.log(`✅ Created voice: ${id} (${voice.hostName})`);
  
  return voiceItem;
}

export async function updateVoice(id: string, updates: Partial<Voice>): Promise<Voice> {
  const existing = await kv.get(`automation-voice:${id}`);
  if (!existing) {
    throw new Error(`Voice not found: ${id}`);
  }
  
  const updated: Voice = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString()
  };
  
  await kv.set(`automation-voice:${id}`, updated);
  console.log(`✅ Updated voice: ${id}`);
  
  return updated;
}

export async function deleteVoice(id: string): Promise<void> {
  await kv.del(`automation-voice:${id}`);
  console.log(`🗑️ Deleted voice: ${id}`);
}

export async function getVoice(id: string): Promise<Voice | null> {
  return await kv.get(`automation-voice:${id}`);
}

export async function getAllVoices(): Promise<Voice[]> {
  return await kv.getByPrefix('automation-voice:');
}

export async function getVoiceByHostName(hostName: string): Promise<Voice | null> {
  const voices = await getAllVoices();
  return voices.find(v => v.hostName === hostName && v.isActive) || null;
}

// ==================== GENERATED CONTENT ====================

export async function createGeneratedContent(content: Omit<GeneratedContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeneratedContent> {
  const id = `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const contentItem: GeneratedContent = {
    ...content,
    id,
    createdAt: now,
    updatedAt: now
  };
  
  await kv.set(`automation-content:${id}`, contentItem);
  console.log(`✅ Created generated content: ${id}`);
  
  return contentItem;
}

export async function updateGeneratedContent(id: string, updates: Partial<GeneratedContent>): Promise<GeneratedContent> {
  const existing = await kv.get(`automation-content:${id}`);
  if (!existing) {
    throw new Error(`Generated content not found: ${id}`);
  }
  
  const updated: GeneratedContent = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString()
  };
  
  await kv.set(`automation-content:${id}`, updated);
  
  return updated;
}

export async function getGeneratedContent(id: string): Promise<GeneratedContent | null> {
  return await kv.get(`automation-content:${id}`);
}

export async function getAllGeneratedContent(limit: number = 100): Promise<GeneratedContent[]> {
  const items = await kv.getByPrefix('automation-content:');
  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getContentByStatus(status: GeneratedContent['status']): Promise<GeneratedContent[]> {
  const all = await getAllGeneratedContent();
  return all.filter(item => item.status === status);
}

export async function getContentByDate(date: string): Promise<GeneratedContent[]> {
  const all = await getAllGeneratedContent();
  return all.filter(item => item.broadcastDate === date);
}

// ==================== BROADCAST LOG ====================

export async function createBroadcastLog(log: Omit<BroadcastLog, 'id' | 'createdAt'>): Promise<BroadcastLog> {
  const id = `broadcast-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const logItem: BroadcastLog = {
    ...log,
    id,
    createdAt: new Date().toISOString()
  };
  
  await kv.set(`automation-broadcast-log:${id}`, logItem);
  console.log(`✅ Created broadcast log: ${id}`);
  
  return logItem;
}

export async function getAllBroadcastLogs(limit: number = 50): Promise<BroadcastLog[]> {
  const items = await kv.getByPrefix('automation-broadcast-log:');
  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// ==================== AUTOMATION PROMPTS ====================

export async function createAutomationPrompt(prompt: Omit<AutomationPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutomationPrompt> {
  const id = `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const promptItem: AutomationPrompt = {
    ...prompt,
    id,
    createdAt: now,
    updatedAt: now
  };
  
  await kv.set(`automation-prompt:${id}`, promptItem);
  console.log(`✅ Created automation prompt: ${id} (${prompt.promptType})`);
  
  return promptItem;
}

export async function updateAutomationPrompt(id: string, updates: Partial<AutomationPrompt>): Promise<AutomationPrompt> {
  const existing = await kv.get(`automation-prompt:${id}`);
  if (!existing) {
    throw new Error(`Automation prompt not found: ${id}`);
  }
  
  const updated: AutomationPrompt = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString()
  };
  
  await kv.set(`automation-prompt:${id}`, updated);
  
  return updated;
}

export async function getAllAutomationPrompts(): Promise<AutomationPrompt[]> {
  return await kv.getByPrefix('automation-prompt:');
}

export async function getPromptByType(promptType: ShowType): Promise<AutomationPrompt | null> {
  const prompts = await getAllAutomationPrompts();
  return prompts.find(p => p.promptType === promptType && p.isActive) || null;
}

// ==================== STATISTICS ====================

export async function getAutomationStats() {
  const allContent = await getAllGeneratedContent();
  const today = new Date().toISOString().split('T')[0];
  const todayContent = allContent.filter(c => c.broadcastDate === today);
  
  return {
    total: allContent.length,
    today: todayContent.length,
    pending: allContent.filter(c => c.status === 'pending').length,
    generating: allContent.filter(c => c.status === 'generating').length,
    generated: allContent.filter(c => c.status === 'generated').length,
    broadcast: allContent.filter(c => c.status === 'broadcast').length,
    failed: allContent.filter(c => c.status === 'failed').length,
    successRate: allContent.length > 0 
      ? Math.round((allContent.filter(c => c.status === 'broadcast').length / allContent.length) * 100)
      : 0
  };
}
