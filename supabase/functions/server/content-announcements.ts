/**
 * Soul FM - Content Announcements System
 * Weather, Traffic, Time announcements with TTS generation
 * Uses KV store instead of direct table queries.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateAudioWithElevenLabs } from './content-automation-api.ts';
import * as kv from './kv_store.tsx';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ==================== TYPES ====================

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

export interface TimeAnnouncement {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
  dayOfWeek: string;
  message: string;
}

export interface ContentAnnouncement {
  id: string;
  type: 'weather' | 'traffic' | 'time' | 'station_id' | 'promo';
  content: string;
  audio_url?: string;
  voice_id: string;
  voice_name: string;
  duration?: number;
  is_active: boolean;
  schedule_pattern?: string;
  last_played?: string;
  play_count?: number;
  created_at: string;
}

// ==================== WEATHER ANNOUNCEMENTS ====================

export async function getWeatherData(
  location: string,
  apiKey?: string
): Promise<WeatherData> {
  console.log(`🌤️  Fetching weather for: ${location}`);

  if (!apiKey) {
    console.log('⚠️  No weather API key, using mock data');
    return {
      location,
      temperature: 75,
      condition: 'Partly Cloudy',
      humidity: 65,
      windSpeed: 10,
      feelsLike: 73
    };
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=imperial`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      location: data.name,
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      feelsLike: Math.round(data.main.feels_like)
    };
  } catch (error: any) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

export function generateWeatherScript(weather: WeatherData): string {
  const scripts = [
    `Here's your weather update. It's currently ${weather.temperature} degrees and ${weather.condition.toLowerCase()} in ${weather.location}. Humidity is at ${weather.humidity} percent, with winds around ${weather.windSpeed} miles per hour.`,
    `Good news from the weather desk! We've got ${weather.condition.toLowerCase()} skies and ${weather.temperature} degrees here in ${weather.location}. It feels like ${weather.feelsLike} degrees outside.`,
    `Time for your weather check. ${weather.location} is experiencing ${weather.condition.toLowerCase()} conditions with a temperature of ${weather.temperature} degrees. Perfect weather to tune into Soul FM!`
  ];

  return scripts[Math.floor(Math.random() * scripts.length)];
}

// ==================== TIME ANNOUNCEMENTS ====================

export function generateTimeAnnouncement(date: Date = new Date()): TimeAnnouncement {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const hour12 = hour % 12 || 12;
  const period = hour >= 12 ? 'PM' : 'AM';

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[date.getDay()];

  return {
    hour: hour12,
    minute,
    period,
    dayOfWeek,
    message: generateTimeScript(hour12, minute, period, dayOfWeek)
  };
}

function generateTimeScript(hour: number, minute: number, period: string, day: string): string {
  const timeStr = minute === 0
    ? `${hour} ${period}`
    : `${hour}:${minute.toString().padStart(2, '0')} ${period}`;

  const scripts = [
    `It's ${timeStr} on this ${day}, and you're listening to Soul FM, your home for the best in soul, jazz, and R&B.`,
    `The time is ${timeStr}. Stay tuned to Soul FM for non-stop music and great vibes.`,
    `${timeStr} here on Soul FM. Thanks for making us part of your ${day}.`,
    `Soul FM time check: ${timeStr} on your ${day}. More music coming right up.`
  ];

  return scripts[Math.floor(Math.random() * scripts.length)];
}

// ==================== TRAFFIC ANNOUNCEMENTS ====================

export function generateTrafficScript(location: string): string {
  const conditions = [
    'light traffic',
    'moderate traffic',
    'heavy traffic on the main routes',
    'smooth sailing'
  ];

  const condition = conditions[Math.floor(Math.random() * conditions.length)];

  const scripts = [
    `Here's your traffic update for ${location}. We're seeing ${condition} at this hour. Drive safe and keep it tuned to Soul FM.`,
    `Traffic check: ${location} area is experiencing ${condition}. Plan your routes accordingly and enjoy the ride with Soul FM.`,
    `Quick traffic update - ${condition} reported in ${location}. Stay safe out there, and we'll keep the music flowing.`
  ];

  return scripts[Math.floor(Math.random() * scripts.length)];
}

// ==================== STATION ID ====================

export function generateStationId(): string {
  const scripts = [
    "This is Soul FM, bringing you the finest in soul, jazz, and R&B music.",
    "You're listening to Soul FM, your station for smooth sounds and great vibes.",
    "Soul FM - where the music never stops and the groove keeps going.",
    "This is Soul FM, streaming live from Miami with love for soul music.",
    "Soul FM - keeping the spirit of soul alive, 24 hours a day.",
    "You're tuned to Soul FM, your home for authentic soul and R&B."
  ];

  return scripts[Math.floor(Math.random() * scripts.length)];
}

// ==================== PROMOTIONAL ANNOUNCEMENTS ====================

export function generatePromoScript(eventName: string, date: string, details: string): string {
  return `Coming up ${date}, ${eventName}. ${details}. Mark your calendars and stay tuned to Soul FM for more information.`;
}

// ==================== GENERATE ANNOUNCEMENT AUDIO ====================

export async function generateAnnouncementAudio(
  content: string,
  voiceId: string,
  elevenLabsApiKey: string
): Promise<{ audioUrl: string; duration: number }> {
  console.log('🎙️  Generating announcement audio...');

  const audioData = await generateAudioWithElevenLabs(content, voiceId, elevenLabsApiKey);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const fileName = `announcement_${Date.now()}.mp3`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('make-06086aa3-announcements')
    .upload(fileName, audioData, {
      contentType: 'audio/mpeg',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Failed to upload audio: ${uploadError.message}`);
  }

  const { data: urlData } = await supabase.storage
    .from('make-06086aa3-announcements')
    .createSignedUrl(fileName, 365 * 24 * 60 * 60);

  const wordCount = content.split(/\s+/).length;
  const duration = Math.ceil((wordCount / 150) * 60);

  return {
    audioUrl: urlData!.signedUrl,
    duration
  };
}

// ==================== AUTO-GENERATE ANNOUNCEMENTS (KV Store) ====================

async function saveAnnouncement(announcement: Omit<ContentAnnouncement, 'id'>): Promise<ContentAnnouncement> {
  const id = crypto.randomUUID();
  const full: ContentAnnouncement = { id, ...announcement };
  await kv.set(`announcement:${id}`, full);
  return full;
}

export async function autoGenerateWeatherAnnouncement(
  location: string,
  voiceId: string,
  voiceName: string,
  weatherApiKey?: string,
  elevenLabsApiKey?: string
): Promise<ContentAnnouncement> {
  console.log('🌤️  Auto-generating weather announcement...');

  const weather = await getWeatherData(location, weatherApiKey);
  const script = generateWeatherScript(weather);

  let audioUrl: string | undefined;
  let duration: number | undefined;

  if (elevenLabsApiKey) {
    const audio = await generateAnnouncementAudio(script, voiceId, elevenLabsApiKey);
    audioUrl = audio.audioUrl;
    duration = audio.duration;
  }

  const data = await saveAnnouncement({
    type: 'weather',
    content: script,
    audio_url: audioUrl,
    voice_id: voiceId,
    voice_name: voiceName,
    duration,
    is_active: true,
    schedule_pattern: '0 * * * *',
    created_at: new Date().toISOString()
  });

  console.log('✅ Weather announcement generated');
  return data;
}

export async function autoGenerateTimeAnnouncement(
  voiceId: string,
  voiceName: string,
  elevenLabsApiKey?: string
): Promise<ContentAnnouncement> {
  console.log('⏰ Auto-generating time announcement...');

  const timeInfo = generateTimeAnnouncement();
  const script = timeInfo.message;

  let audioUrl: string | undefined;
  let duration: number | undefined;

  if (elevenLabsApiKey) {
    const audio = await generateAnnouncementAudio(script, voiceId, elevenLabsApiKey);
    audioUrl = audio.audioUrl;
    duration = audio.duration;
  }

  const data = await saveAnnouncement({
    type: 'time',
    content: script,
    audio_url: audioUrl,
    voice_id: voiceId,
    voice_name: voiceName,
    duration,
    is_active: true,
    schedule_pattern: '0 * * * *',
    created_at: new Date().toISOString()
  });

  console.log('✅ Time announcement generated');
  return data;
}

export async function autoGenerateStationId(
  voiceId: string,
  voiceName: string,
  elevenLabsApiKey?: string
): Promise<ContentAnnouncement> {
  console.log('📻 Auto-generating station ID...');

  const script = generateStationId();

  let audioUrl: string | undefined;
  let duration: number | undefined;

  if (elevenLabsApiKey) {
    const audio = await generateAnnouncementAudio(script, voiceId, elevenLabsApiKey);
    audioUrl = audio.audioUrl;
    duration = audio.duration;
  }

  const data = await saveAnnouncement({
    type: 'station_id',
    content: script,
    audio_url: audioUrl,
    voice_id: voiceId,
    voice_name: voiceName,
    duration,
    is_active: true,
    schedule_pattern: '0 */2 * * *',
    created_at: new Date().toISOString()
  });

  console.log('✅ Station ID generated');
  return data;
}

// ==================== GET NEXT ANNOUNCEMENT ====================

export async function getNextAnnouncement(
  type?: 'weather' | 'traffic' | 'time' | 'station_id' | 'promo'
): Promise<ContentAnnouncement | null> {
  let announcements = await kv.getByPrefix('announcement:');
  announcements = announcements.filter((a: any) => a.is_active);

  if (type) {
    announcements = announcements.filter((a: any) => a.type === type);
  }

  if (announcements.length === 0) return null;

  return announcements[Math.floor(Math.random() * announcements.length)];
}
