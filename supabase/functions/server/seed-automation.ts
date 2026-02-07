/**
 * Soul FM - Seed Automation Data
 * Инициализация базовых данных для системы автоматизации
 */

import * as db from './content-automation-db.ts';

export async function seedAutomationData() {
  console.log('🌱 Seeding automation data...');

  try {
    // Check if data already exists
    const existingSchedule = await db.getAllScheduleItems();
    if (existingSchedule.length > 0) {
      console.log('✅ Automation data already seeded');
      return { success: true, message: 'Data already exists' };
    }

    // ==================== SEED VOICES ====================
    console.log('🎙️ Creating voices...');

    const voices = [
      {
        hostName: 'Лина',
        elevenLabsVoiceId: 'VOICE_ID_LINA', // Replace with actual ElevenLabs voice ID
        voiceSettings: { stability: 0.5, similarityBoost: 0.75, style: 0.5 },
        backgroundMusic: 'morning_affirmation.mp3',
        isActive: true
      },
      {
        hostName: 'Тони',
        elevenLabsVoiceId: 'VOICE_ID_TONY',
        voiceSettings: { stability: 0.6, similarityBoost: 0.8, style: 0.6 },
        backgroundMusic: 'music_news_bg.mp3',
        isActive: true
      },
      {
        hostName: 'Макс',
        elevenLabsVoiceId: 'VOICE_ID_MAX',
        voiceSettings: { stability: 0.55, similarityBoost: 0.75, style: 0.5 },
        backgroundMusic: 'tech_news_bg.mp3',
        isActive: true
      },
      {
        hostName: 'Стелла',
        elevenLabsVoiceId: 'VOICE_ID_STELLA',
        voiceSettings: { stability: 0.5, similarityBoost: 0.8, style: 0.6 },
        backgroundMusic: 'culture_news_bg.mp3',
        isActive: true
      },
      {
        hostName: 'Дайм',
        elevenLabsVoiceId: 'VOICE_ID_DIME',
        voiceSettings: { stability: 0.5, similarityBoost: 0.75, style: 0.5 },
        backgroundMusic: 'cinema_news_bg.mp3',
        isActive: true
      },
      {
        hostName: 'Радистка Кэт',
        elevenLabsVoiceId: 'VOICE_ID_KAT',
        voiceSettings: { stability: 0.6, similarityBoost: 0.8, style: 0.7 },
        backgroundMusic: 'city_rhythm_bg.mp3',
        isActive: true
      },
      {
        hostName: 'Нико',
        elevenLabsVoiceId: 'VOICE_ID_NIKO',
        voiceSettings: { stability: 0.5, similarityBoost: 0.75, style: 0.5 },
        backgroundMusic: 'literature_bg.mp3',
        isActive: true
      },
      {
        hostName: 'Пабло',
        elevenLabsVoiceId: 'VOICE_ID_PABLO',
        voiceSettings: { stability: 0.4, similarityBoost: 0.7, style: 0.3 },
        backgroundMusic: 'breathing_meditation.mp3',
        isActive: true
      }
    ];

    const createdVoices = [];
    for (const voice of voices) {
      const created = await db.createVoice(voice);
      createdVoices.push(created);
      console.log(`   ✓ Created voice: ${voice.hostName}`);
    }

    // ==================== SEED SCHEDULE ====================
    console.log('📅 Creating schedule items...');

    const scheduleItems = [
      {
        time: '07:00',
        hostName: 'Лина',
        showType: 'affirmation' as const,
        topic: 'Утро нового дня',
        introText: 'Доброе утро, меня зовут Лина и это «Утро нового дня». Сегодня мы вместе будем делать нашу ежедневную аффирмацию.',
        outroText: 'Пусть ваш день будет прекрасен, оставайтесь с нами на Soul FM, на волнах твоей души.',
        durationMinutes: 2,
        voiceId: createdVoices.find(v => v.hostName === 'Лина')!.elevenLabsVoiceId,
        isActive: true
      },
      {
        time: '09:00',
        hostName: 'Тони',
        showType: 'news' as const,
        topic: 'Новости музыки',
        introText: 'Привет! Это Тони и сегодня я расскажу вам все новости из мира музыки, на Soul FM.',
        outroText: 'Серфите с нами на волнах души, на Soul FM.',
        durationMinutes: 2,
        voiceId: createdVoices.find(v => v.hostName === 'Тони')!.elevenLabsVoiceId,
        perplexityQuery: 'latest music news, new album releases, music industry updates today in Russian',
        isActive: true
      },
      {
        time: '11:00',
        hostName: 'Макс',
        showType: 'news' as const,
        topic: 'Игры и технологии',
        introText: 'Это Макс на Soul FM — мир игр, гаджетов и цифровых новинок.',
        outroText: 'Будущее звучит уже сегодня. Soul FM.',
        durationMinutes: 2,
        voiceId: createdVoices.find(v => v.hostName === 'Макс')!.elevenLabsVoiceId,
        perplexityQuery: 'latest gaming news, new technology releases, gadget updates in Russian',
        isActive: true
      },
      {
        time: '13:00',
        hostName: 'Стелла',
        showType: 'news' as const,
        topic: 'Новости культуры',
        introText: 'Вы слушаете Soul FM, с вами Стелла. Главные события культуры прямо сейчас.',
        outroText: 'Оставайтесь с нами — дальше больше.',
        durationMinutes: 2,
        voiceId: createdVoices.find(v => v.hostName === 'Стелла')!.elevenLabsVoiceId,
        perplexityQuery: 'latest culture news, art exhibitions, theater events, cultural events in Russian',
        isActive: true
      },
      {
        time: '15:00',
        hostName: 'Дайм',
        showType: 'news' as const,
        topic: 'Мир кино',
        introText: 'Это Дайм, и сейчас — всё о кино на Soul FM.',
        outroText: 'Смотрите глубже. Soul FM.',
        durationMinutes: 2,
        voiceId: createdVoices.find(v => v.hostName === 'Дайм')!.elevenLabsVoiceId,
        perplexityQuery: 'latest movie news, film releases, cinema industry updates in Russian',
        isActive: true
      },
      {
        time: '17:00',
        hostName: 'Радистка Кэт',
        showType: 'news' as const,
        topic: 'Город в ритме',
        introText: 'Хей, это Радистка Кэт на Soul FM! Сейчас расскажу, где звучит музыка, где вкусно, где красиво и куда стоит идти сегодня.',
        outroText: 'Будьте в ритме. Живите ярко. И оставайтесь на волнах души - Soul FM.',
        durationMinutes: 2,
        voiceId: createdVoices.find(v => v.hostName === 'Радистка Кэт')!.elevenLabsVoiceId,
        perplexityQuery: 'events in Gelendzhik, Anapa, Sochi today, restaurants, parties, trends, lifestyle south Russia',
        isActive: true
      },
      {
        time: '18:00',
        hostName: 'Тони',
        showType: 'news' as const,
        topic: 'Тоник (электроника, винил, сцена)',
        introText: 'Это „Тоник" на Soul FM. Включаем чистый ритм.',
        outroText: 'Держим частоту. Soul FM.',
        durationMinutes: 2,
        voiceId: createdVoices.find(v => v.hostName === 'Тони')!.elevenLabsVoiceId,
        perplexityQuery: 'electronic music news, vinyl releases, DJ scene updates, club culture in Russian',
        isActive: true
      },
      {
        time: '19:00',
        hostName: 'Нико',
        showType: 'news' as const,
        topic: 'Новости литературы и искусства',
        introText: 'Это Нико. Время новостей культуры и искусства на Soul FM.',
        outroText: 'Вдохновение рядом. Soul FM.',
        durationMinutes: 2,
        voiceId: createdVoices.find(v => v.hostName === 'Нико')!.elevenLabsVoiceId,
        perplexityQuery: 'latest literature news, book releases, art news, literary events in Russian',
        isActive: true
      },
      {
        time: '23:00',
        hostName: 'Пабло',
        showType: 'breathing' as const,
        topic: 'Практика дыхания',
        introText: 'Это Пабло. Замедляемся…',
        outroText: 'Спокойной ночи. Soul FM.',
        durationMinutes: 2,
        voiceId: createdVoices.find(v => v.hostName === 'Пабло')!.elevenLabsVoiceId,
        isActive: true
      }
    ];

    for (const item of scheduleItems) {
      await db.createScheduleItem(item);
      console.log(`   ✓ Created schedule: ${item.time} - ${item.hostName} - ${item.topic}`);
    }

    // ==================== SEED PROMPTS ====================
    console.log('📝 Creating automation prompts...');

    const prompts = [
      {
        promptType: 'affirmation' as const,
        promptTemplate: `Создай краткую позитивную аффирмацию на 1-1.5 минуты чтения. 
Тема: вдохновение, уверенность, новый день, возможности. 
Стиль: теплый, мотивирующий, спокойный. 
Без заголовков, только текст для озвучки на русском языке.
Используй "ты" обращение к слушателю.`,
        isActive: true
      },
      {
        promptType: 'breathing' as const,
        promptTemplate: `Создай короткую практику осознанного дыхания на 1-1.5 минуты. 
Включи простые инструкции для дыхательных упражнений. 
Стиль: очень спокойный, медитативный, с паузами. 
Без заголовков, только текст для озвучки на русском языке.
Используй "ты" обращение к слушателю.
Добавь указания для пауз, например: [пауза 3 секунды]`,
        isActive: true
      }
    ];

    for (const prompt of prompts) {
      await db.createAutomationPrompt(prompt);
      console.log(`   ✓ Created prompt: ${prompt.promptType}`);
    }

    console.log('\n✅ Automation data seeded successfully!');
    console.log(`   📊 Created ${createdVoices.length} voices`);
    console.log(`   📅 Created ${scheduleItems.length} schedule items`);
    console.log(`   📝 Created ${prompts.length} prompts`);

    return {
      success: true,
      message: 'Automation data seeded',
      data: {
        voices: createdVoices.length,
        schedules: scheduleItems.length,
        prompts: prompts.length
      }
    };
  } catch (error) {
    console.error('❌ Error seeding automation data:', error);
    throw error;
  }
}
