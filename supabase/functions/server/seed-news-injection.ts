/**
 * Soul FM - News Injection Seed Data
 * Uses KV store for all data storage.
 */

import * as kv from './kv_store.tsx';

// ==================== SAMPLE NEWS ARTICLES ====================

const sampleNews = [
  {
    id: 'news_breaking_001',
    title: 'Miami Beach Announces New Music Festival',
    content: 'Miami Beach is set to host its largest music festival this summer. The Soul FM Festival will feature over 50 artists performing across three days, bringing together jazz, soul, and R&B legends. Tickets go on sale next week, with early bird discounts available for the first 1000 buyers.',
    category: 'music',
    is_published: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'news_music_002',
    title: 'Local Artist Wins Grammy Award',
    content: 'Soul FM is proud to announce that Miami-based artist Marcus Jones has won a Grammy Award for Best R&B Album. Marcus, who started his career performing at local venues, thanked Soul FM listeners for their continued support throughout his journey.',
    category: 'music',
    is_published: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'news_tech_003',
    title: 'New Streaming Technology Enhances Audio Quality',
    content: 'Soul FM has upgraded its streaming infrastructure to deliver crystal-clear audio quality. Listeners can now enjoy their favorite tracks in high-definition audio, providing a premium listening experience. The upgrade is available to all users at no additional cost.',
    category: 'technology',
    is_published: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'news_local_004',
    title: 'Community Fundraiser Supports Local Musicians',
    content: 'This weekend, Soul FM is hosting a community fundraiser to support emerging local musicians. The event will feature live performances, silent auctions, and meet-and-greets with established artists. All proceeds will go towards music education programs in Miami schools.',
    category: 'local',
    is_published: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'news_breaking_005',
    title: 'Soul FM Reaches One Million Listeners',
    content: 'We are thrilled to announce that Soul FM has reached a major milestone of one million monthly listeners. This achievement is a testament to our amazing community and our commitment to bringing you the best in soul, jazz, and R&B music. Thank you for making us your radio station of choice.',
    category: 'breaking',
    is_published: true,
    created_at: new Date().toISOString()
  }
];

// ==================== SAMPLE VOICES ====================

const sampleVoices = [
  {
    id: 'voice_news_001',
    hostName: 'Professional News Anchor',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.4,
      useSpeakerBoost: true
    },
    isActive: true
  },
  {
    id: 'voice_casual_002',
    hostName: 'Casual Morning Host',
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
    voiceSettings: {
      stability: 0.6,
      similarityBoost: 0.8,
      style: 0.6,
      useSpeakerBoost: true
    },
    isActive: true
  },
  {
    id: 'voice_smooth_003',
    hostName: 'Smooth Evening Voice',
    elevenLabsVoiceId: 'ErXwobaYiN019PkySvjV',
    voiceSettings: {
      stability: 0.7,
      similarityBoost: 0.85,
      style: 0.5,
      useSpeakerBoost: true
    },
    isActive: true
  }
];

// ==================== SEED FUNCTION ====================

export async function seedNewsInjectionData() {
  console.log('📰 Seeding News Injection test data...');

  try {
    // Seed news articles
    console.log('📝 Creating sample news articles...');
    for (const news of sampleNews) {
      await kv.set(`news_${news.id}`, news);
      console.log(`✅ Created: ${news.title}`);
    }

    // Seed voices (also via KV)
    console.log('🎙️ Creating sample voices...');
    for (const voice of sampleVoices) {
      await kv.set(`automation_voice:${voice.id}`, {
        id: voice.id,
        host_name: voice.hostName,
        elevenlabs_voice_id: voice.elevenLabsVoiceId,
        voice_settings: voice.voiceSettings,
        is_active: voice.isActive,
        created_at: new Date().toISOString()
      });
      console.log(`✅ Created voice: ${voice.hostName}`);
    }

    console.log('');
    console.log('🎉 Seed data created successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - News articles: ${sampleNews.length}`);
    console.log(`   - Voices: ${sampleVoices.length}`);
    console.log('');
    console.log('🚀 Ready to test News Injection!');
    console.log('   Visit: /admin/news-injection');
    console.log('');

    return {
      success: true,
      news: sampleNews.length,
      voices: sampleVoices.length
    };
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// ==================== SAMPLE INJECTION RULES ====================

export const sampleInjectionRules = [
  {
    name: 'Hourly News Updates (Test)',
    frequency: 'hourly',
    days_of_week: [1, 2, 3, 4, 5],
    max_news_per_slot: 1,
    priority_order: 'latest',
    is_active: false
  },
  {
    name: 'Morning & Evening News (Test)',
    frequency: 'custom',
    custom_times: ['08:00', '12:00', '18:00', '22:00'],
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    max_news_per_slot: 2,
    priority_order: 'latest',
    is_active: false
  }
];

export async function createSampleRules() {
  console.log('⏰ Creating sample injection rules...');

  for (const rule of sampleInjectionRules) {
    const ruleId = crypto.randomUUID();
    const existing = (await kv.getByPrefix('news_rule:')).find((r: any) => r.name === rule.name);

    if (!existing) {
      await kv.set(`news_rule:${ruleId}`, {
        id: ruleId,
        ...rule,
        created_at: new Date().toISOString()
      });
      console.log(`✅ Created rule: ${rule.name}`);
    } else {
      console.log(`✅ Rule already exists: ${rule.name}`);
    }
  }

  console.log('✅ Sample rules created!');
}
