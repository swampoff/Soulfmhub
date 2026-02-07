/**
 * Soul FM - Content Automation API Utilities
 * Интеграция с Perplexity, Claude, ElevenLabs для автоматической генерации контента
 */

// ==================== PERPLEXITY API ====================

export async function fetchNewsFromPerplexity(
  query: string,
  apiKey: string
): Promise<string> {
  console.log(`📰 Perplexity: Fetching news for query: "${query}"`);
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Ты - помощник для сбора актуальных новостей. Предоставляй только факты и новости за последние 24 часа на русском языке.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const newsText = data.choices?.[0]?.message?.content || '';

    console.log(`✅ Perplexity: News fetched (${newsText.length} chars)`);
    return newsText;
  } catch (error) {
    console.error('❌ Perplexity API error:', error);
    throw new Error(`Failed to fetch news: ${error.message}`);
  }
}

// ==================== CLAUDE API ====================

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function generateScriptWithClaude(
  prompt: string,
  apiKey: string,
  maxTokens: number = 1000
): Promise<string> {
  console.log(`🤖 Claude: Generating script...`);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const scriptText = data.content?.[0]?.text || '';

    console.log(`✅ Claude: Script generated (${scriptText.length} chars)`);
    return scriptText;
  } catch (error) {
    console.error('❌ Claude API error:', error);
    throw new Error(`Failed to generate script: ${error.message}`);
  }
}

// ==================== ELEVENLABS API ====================

export async function generateAudioWithElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<Uint8Array> {
  console.log(`🎙️ ElevenLabs: Generating audio for voice: ${voiceId}`);
  console.log(`📝 Text length: ${text.length} chars`);
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);

    console.log(`✅ ElevenLabs: Audio generated (${audioData.length} bytes)`);
    return audioData;
  } catch (error) {
    console.error('❌ ElevenLabs API error:', error);
    throw new Error(`Failed to generate audio: ${error.message}`);
  }
}

export async function listElevenLabsVoices(apiKey: string): Promise<any[]> {
  console.log('🎙️ ElevenLabs: Fetching available voices...');
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const voices = data.voices || [];

    console.log(`✅ ElevenLabs: Found ${voices.length} voices`);
    return voices;
  } catch (error) {
    console.error('❌ ElevenLabs voices error:', error);
    throw new Error(`Failed to fetch voices: ${error.message}`);
  }
}

// ==================== PROMPT TEMPLATES ====================

export const PROMPT_TEMPLATES = {
  affirmation: `Создай краткую позитивную аффирмацию на 1-1.5 минуты чтения. 
Тема: вдохновение, уверенность, новый день, возможности. 
Стиль: теплый, мотивирующий, спокойный. 
Без заголовков, только текст для озвучки на русском языке.
Используй "ты" обращение к слушателю.`,

  news: (topic: string, newsData: string) => `На основе следующей информации создай короткий новостной текст для радио на 1-1.5 минуты чтения.

Тема: ${topic}
Стиль: живой, информативный, радиоформат
Язык: русский

Требования:
- Только самые интересные новости
- Короткие предложения для радио
- Естественная разговорная речь
- Без заголовков
- 2-3 новости максимум

Информация для обработки:
${newsData}`,

  breathing: `Создай короткую практику осознанного дыхания на 1-1.5 минуты. 
Включи простые инструкции для дыхательных упражнений. 
Стиль: очень спокойный, медитативный, с паузами. 
Без заголовков, только текст для озвучки на русском языке.
Используй "ты" обращение к слушателю.
Добавь указания для пауз, например: [пауза 3 секунды]`
};

// ==================== HELPER FUNCTIONS ====================

export function buildFullScript(intro: string, mainContent: string, outro: string): string {
  return `${intro}\n\n${mainContent}\n\n${outro}`;
}

export function estimateSpeechDuration(text: string): number {
  // Средняя скорость речи: ~150 слов в минуту
  // Или ~2.5 слова в секунду
  const words = text.split(/\s+/).length;
  const durationSeconds = Math.ceil(words / 2.5);
  return durationSeconds;
}

export function validateVoiceId(voiceId: string): boolean {
  // ElevenLabs voice IDs are typically 20-21 characters
  return voiceId && voiceId.length >= 15 && voiceId.length <= 30;
}
