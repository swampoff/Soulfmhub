/**
 * Soul FM Hub - Editorial Department (Эфирный Отдел)
 *
 * AI-agent system where broadcast team members autonomously interact,
 * brainstorm show ideas, create rubrics, write news drafts.
 *
 * Architecture (Multi-Provider):
 *   - Each agent has its OWN AI provider via ai-providers.ts:
 *     Anthropic (Claude), OpenRouter, Google Gemini, Mistral
 *   - Nico (Program Director) coordinates, synthesizes, writes reports.
 *   - All 6 team members contribute via their configured AI provider
 *     with template fallback when no API key is available.
 *   - Session flow: topic -> team contributions -> Nico synthesis -> deliverables
 *   - CRUD for provider configs at /editorial/ai-providers/*
 */

import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { callAI, getAgentAIConfig, type AIMessage } from "./ai-providers.ts";

// ── Types ──────────────────────────────────────────────────────────────

interface EditorialSession {
  id: string;
  type: "brainstorm" | "news" | "rubric" | "schedule" | "review";
  topic: string;
  status: "in-progress" | "synthesizing" | "completed" | "approved" | "rejected";
  participants: string[];
  messagesCount: number;
  deliverableIds: string[];
  nicoSummary: string | null;
  nicoReport: string | null;
  feedback: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface EditorialMessage {
  id: string;
  sessionId: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  agentColor: string;
  agentEmoji: string;
  text: string;
  isAI: boolean;
  timestamp: string;
}

interface EditorialDeliverable {
  id: string;
  sessionId: string;
  type: "idea" | "rubric" | "news-draft" | "schedule-proposal" | "script";
  title: string;
  content: string;
  status: "pending" | "approved" | "rejected" | "revised";
  authorId: string;
  authorName: string;
  priority: "low" | "medium" | "high";
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AutopilotConfig {
  enabled: boolean;
  intervalMinutes: number;
  typeRotation: string[];
  lastRunAt: string | null;
  nextRunAt: string | null;
  sessionsRun: number;
  currentTypeIndex: number;
}

interface ImplementationTask {
  id: string;
  sessionId: string;
  sessionTopic: string;
  title: string;
  implementationPlan: string;
  steps: Array<{
    step: string;
    assignee: string;
    deadline: string;
    status: "pending" | "in-progress" | "done";
  }>;
  status: "pending" | "in-progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

interface TelegramConfig {
  chatId: string;
  enabled: boolean;
  sendOnComplete: boolean;
  sendOnApprove: boolean;
  lastSentAt: string | null;
  messagesSent: number;
}

// ── Broadcast team role-specific contribution templates ────────────────

const SESSION_TYPE_LABELS: Record<string, string> = {
  brainstorm: "Brainstorm",
  news: "News Production",
  rubric: "Rubric Design",
  schedule: "Schedule Planning",
  review: "Content Review",
};

function getAgentContribution(
  agent: any,
  sessionType: string,
  topic: string
): string {
  const templates: Record<string, Record<string, string[]>> = {
    sandra: {
      brainstorm: [
        `Для темы "${topic}" я бы предложила музыкальный блок с live-вокалом. Могу записать интро-джингл с тёплым soul-звучанием. Представляю формат: моя вокальная подводка -> тематический плейлист -> outro с импровизацией.`,
        `Тема "${topic}" отлично ложится на формат acoustic session. Я могу подготовить вокальные версии 3-4 треков, которые зададут настроение блоку. Плюс запишу бамперы между сегментами.`,
        `Предлагаю для "${topic}" серию вокальных зарисовок — короткие 30-секундные a cappella фрагменты, которые будут звучать между рубриками. Это создаст узнаваемый звуковой почерк.`,
      ],
      news: [
        `Могу записать вокальные подложки для новостного блока — мелодичные переходы между сюжетами. Это смягчит подачу и сохранит фирменный soul-стиль станции.`,
        `Для новостного выпуска предлагаю формат "News & Groove" — между блоками новостей короткие музыкальные перебивки с моим вокалом. Уже есть наработки.`,
      ],
      rubric: [
        `Для новой рубрики могу записать signature-мелодию и вокальный ID. Предлагаю тёплый neo-soul стиль — это будет отличаться от стандартных радио-джинглов.`,
        `У меня идея для вокальной рубрики "Soul Kitchen" — каждый выпуск я исполняю фрагмент классического soul-трека и рассказываю его историю. 5 минут, душевно и познавательно.`,
      ],
      schedule: [
        `В утренний слот (07:00-10:00) я готова вести "Morning Vibes" с живым вокалом. Формат: wake-up мелодия -> позитивный плейлист -> интерактив со слушателями. По пятницам — расширенная acoustic session.`,
        `Предлагаю добавить в расписание еженедельную "Vocal Hour" — час живой музыки с моим участием. Лучшее время — воскресенье 19:00-20:00, когда аудитория расслаблена.`,
      ],
      review: [
        `Прослушала текущие джинглы — нужно обновить 3 из 7, звучат устаревше. Подготовлю новые версии к следующей неделе. Вокальные подводки к шоу в хорошем состоянии.`,
        `Аудит вокального контента: 80% материала актуально. Рекомендую перезаписать сезонные промо и добавить вечерний вокальный джингл — сейчас его не хватает.`,
      ],
    },

    liana: {
      brainstorm: [
        `Тема "${topic}" — отличная основа для интерактивного шоу! Предлагаю формат live-дискуссии со слушателями: я веду, принимаю звонки, модерирую чат. Можно добавить экспертного гостя.`,
        `Для "${topic}" вижу формат мини-сериала в эфире — 5 выпусков по 15 минут, каждый день новый аспект темы. Я могу вести с элементами сторителлинга.`,
        `"${topic}" — предлагаю street-формат: я выхожу на улицу (или имитирую), беру мини-интервью у "прохожих", создаю живую атмосферу. Между интервью — тематическая музыка.`,
      ],
      news: [
        `Для новостного блока предлагаю формат "3 минуты, 3 новости" — лаконично, динамично, с моими живыми комментариями. Между блоками — музыкальные перебивки.`,
        `Могу вести новостную рубрику в стиле "Good News" — только позитивные новости из мира музыки, культуры, технологий. 5 минут хорошего настроения каждый час.`,
      ],
      rubric: [
        `Идея рубрики "Голос улицы" — я "выхожу в народ" и собираю мнения на актуальную тему недели. Формат: 3-4 мини-интервью + мой вывод + тематический трек.`,
        `Предлагаю рубрику "За кулисами Soul FM" — я провожу слушателей по закулисью радиостанции, знакомлю с командой, показываю процесс. Аутентично и интересно.`,
      ],
      schedule: [
        `Мой слот 12:00-13:00 — "Soul FM News Hour". Предлагаю расширить до 12:00-14:00 по будням: первый час — новости, второй — интерактив со слушателями.`,
        `Готова взять дополнительный вечерний слот по выходным. Формат — непринуждённое talk-show "Вечерний Soul" с музыкой и гостями. 20:00-22:00.`,
      ],
      review: [
        `Оценила текущие шоу: "News Hour" работает стабильно, аудитория растёт. Но не хватает интерактива — предлагаю добавить блок звонков в конце каждого выпуска.`,
        `Провела анализ: наши анонсы звучат слишком формально. Предлагаю перейти на более живой, разговорный стиль. Могу подготовить новые шаблоны.`,
      ],
    },

    den: {
      brainstorm: [
        `"${topic}" — для этого нужен специальный микс. Предлагаю собрать тематический плейлист из 20-25 треков с плавными переходами. Deep house основа + элементы ${topic.toLowerCase().includes("вечер") ? "chillwave" : "nu-disco"}.`,
        `По теме "${topic}" — давайте сделаем DJ-сет в прямом эфире. Я подготовлю микс на 2 часа с тематическими вставками. Формат: музыка -> короткий комментарий -> музыка.`,
        `Для "${topic}" предлагаю формат "Discovery Mix" — каждый сет включает 3 новых трека, которые слушатели ещё не слышали. Расширяем музыкальный кругозор аудитории.`,
      ],
      news: [
        `Для новостного блока подготовлю музыкальные подложки — нейтральные, но стильные. Электронный ambient, чтобы не отвлекать от текста, но держать атмосферу.`,
        `Могу добавить "Music News" сегмент — новинки, релизы, фестивали. 3 минуты музыкальных новостей + сэмплы обсуждаемых треков.`,
      ],
      rubric: [
        `Рубрика "Vinyl Vault" — каждую неделю я достаю один классический альбом и разбираю его трек за треком. Формат для истинных ценителей, 30 минут.`,
        `Предлагаю рубрику "Mix Lab" — в прямом эфире собираю микс по заявкам слушателей. Они голосуют за жанр/настроение, я миксую в реальном времени.`,
      ],
      schedule: [
        `"Neon Nights" (Пт-Сб 22:00-02:00) — это наш флагман. Предлагаю добавить "Sunday Chill" — воскресный дневной сет 14:00-17:00, более спокойный формат.`,
        `В расписании не хватает утреннего DJ-сета. Предлагаю "Wake & Groove" 06:00-07:00 — лёгкий микс для пробуждения, до начала шоу Sandra.`,
      ],
      review: [
        `Проверил текущие плейлисты — 15% треков устарели (более 6 месяцев в ротации без обновления). Подготовлю список на замену и подберу свежий материал.`,
        `Аудит музыкального контента: баланс жанров хороший, но не хватает live-миксов в записи. Предлагаю записать серию pre-recorded сетов на случай технических проблем.`,
      ],
    },

    mark: {
      brainstorm: [
        `"${topic}" — отличный информационный повод! Предлагаю промо-кампанию: тизеры в соцсетях за 3 дня, анонс в эфире, пост-релиз с highlights. Могу подготовить контент-план.`,
        `По "${topic}" — вижу потенциал для спецпроекта. Формат: серия материалов (эфир + текст + соцсети). Привлечём рекламодателей, тема коммерчески привлекательная.`,
        `Предлагаю связать "${topic}" с нашей аудиторией через интерактивный опрос. Результаты озвучим в эфире. Это увеличит engagement и даст контент для соцсетей.`,
      ],
      news: [
        `Подготовлю новостной дайджест: 5 главных новостей дня из мира музыки и культуры. Формат: заголовок -> суть за 30 секунд -> переход. Плюс одна "новость дня" с расширенным комментарием.`,
        `Для новостного блока предлагаю рубрику "Тренды недели" — что обсуждают, что слушают, какие события. Подкреплю статистикой и фактами. 5 минут каждый понедельник.`,
      ],
      rubric: [
        `Рубрика "Soul FM Insider" — эксклюзивные новости из музыкальной индустрии. Инсайды, анонсы, интервью. Выходит 2 раза в неделю, 7 минут.`,
        `Предлагаю "Brand Stories" — рубрику о брендах, которые поддерживают Soul FM. Нативная интеграция + интересная история компании. Коммерческий потенциал.`,
      ],
      schedule: [
        `"News & Trends" (Пн-Пт 09:00-17:00) — мой основной слот. Предлагаю выделить отдельные 15-минутные новостные окна в 10:00, 14:00, 16:00 для чётких news-блоков.`,
        `Нужен выходной дайджест — "Week in Review", суббота 11:00-12:00. Собираем всё самое важное за неделю, добавляем аналитику и прогнозы.`,
      ],
      review: [
        `Анализ метрик за месяц: вовлечённость +12%, новые слушатели +8%. Слабое место — удержание в вечернем слоте. Предлагаю усилить контент 20:00-22:00.`,
        `Оценил наш маркетинг: соцсети активны, но не хватает cross-promotion между шоу. Подготовлю план перекрёстного промо на следующий месяц.`,
      ],
    },

    max: {
      brainstorm: [
        `Для "${topic}" предлагаю техническое решение: создам уникальный звуковой дизайн — фирменные звуки, переходы, атмосферные подложки. Это выделит блок в эфире.`,
        `По теме "${topic}" — могу сделать саунд-бед (фоновую музыкальную подложку), который будет звучать под разговорные блоки. Настрою уровни для идеального баланса речь/музыка.`,
        `"${topic}" — предлагаю применить spatial audio эффекты для иммерсивного опыта. Бинауральные переходы между сегментами создадут эффект присутствия.`,
      ],
      news: [
        `Для новостей подготовлю звуковое оформление: signature tune (7 сек), transition stinger (3 сек), bed music (loop). Всё в фирменном стиле Soul FM.`,
        `Сведу новостные аудио-материалы: нормализация громкости, компрессия для чёткости речи, де-эссинг. Финальный мастеринг под радио-стандарты.`,
      ],
      rubric: [
        `Рубрика "Sound Lab" — разбираю техническую сторону музыки: как записывались легендарные альбомы, какие эффекты используются, секреты продакшна. 10 минут для аудиофилов.`,
        `Предлагаю "Before/After" — демонстрирую как звучит трек до и после сведения/мастеринга. Образовательно и впечатляюще. 5-минутная рубрика.`,
      ],
      schedule: [
        `"Studio Sessions" (Пн-Пт 10:00-18:00) — мой рабочий слот. Предлагаю выделить пятницу для recording sessions: запись джинглов, промо, вокалов на следующую неделю.`,
        `Нужно техническое окно для maintenance: каждую среду 02:00-04:00 — проверка оборудования, обновление пресетов, тестирование новых эффектов.`,
      ],
      review: [
        `Технический аудит: качество звука в эфире стабильное (LUFS -14, True Peak -1dB). Но некоторые джинглы записаны в низком качестве — нужна перезапись.`,
        `Проверил все звуковые файлы: 5 треков с клиппингом, 3 джингла с фоновым шумом. Составил список для переобработки. Исправлю за 2 дня.`,
      ],
    },

    stella: {
      brainstorm: [
        `"${topic}" — я могу подготовить информационный скрипт для эфира. Предлагаю формат: вступление (30 сек) -> основной блок (3 мин) -> резюме (20 сек). Чёткая структура, фактура.`,
        `По теме "${topic}" — предлагаю серию коротких информационных вставок "Знаете ли вы?" по 1 минуте. Интересные факты, поданные живым языком. 3-4 вставки в час.`,
        `Для "${topic}" подготовлю лонгрид-формат: 15-минутный спецвыпуск с экспертными комментариями, аналитикой и прогнозами. Выйдет как подкаст и в прямом эфире.`,
      ],
      news: [
        `Готовлю вечерний дайджест "Evening News Digest" — 20 минут чистого информационного контента. Структура: headline news (5 мин) -> culture & music (5 мин) -> tech & lifestyle (5 мин) -> прогноз погоды (2 мин) -> sign-off.`,
        `Предлагаю ежечасные news-бюллетени по 3 минуты: 3 топ-новости + 1 музыкальная новость. Скрипты буду обновлять каждый час. Это добавит информационной ценности эфиру.`,
      ],
      rubric: [
        `Рубрика "Persona" — еженедельное интервью с интересным человеком. Формат: 15 минут, 10 вопросов, личная история + профессиональные инсайты. Я веду и редактирую.`,
        `Предлагаю "Editorial" — мой авторский комментарий на актуальную тему. 5 минут в конце вечернего выпуска. Субъективный взгляд от имени станции.`,
      ],
      schedule: [
        `"Evening News Digest" (Пн-Пт 18:00-19:00) — мой основной слот. Предлагаю добавить утренний 5-минутный брифинг в 08:00 — "Morning Headlines" с ключевыми новостями дня.`,
        `По выходным готова вести "Weekend Review" — 30-минутный обзор недели с расширенной аналитикой. Суббота 10:00-10:30.`,
      ],
      review: [
        `Ревизия текстового контента: все скрипты актуальны, но нужно обновить формулировки в 4 промо-роликах. Стиль устарел. Перепишу за 1 день.`,
        `Оценила качество новостной подачи: фактура сильная, но не хватает "человеческих историй". Предлагаю добавлять 1 human interest story в каждый выпуск.`,
      ],
    },
  };

  const agentTemplates = templates[agent.id];
  if (!agentTemplates) {
    return `Тема "${topic}" интересна. Я проанализирую её с точки зрения ${agent.role} и подготовлю предложения.`;
  }

  const pool = agentTemplates[sessionType] || agentTemplates["brainstorm"];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Topic generators ──────────────────────────────────────────────────

const BRAINSTORM_TOPICS = [
  "Летний спецпроект Soul FM",
  "Ночной эфир: новый формат",
  "Интерактивное шоу со слушателями",
  "Музыкальный марафон 24 часа",
  "Тематическая неделя: ретро-soul",
  "Коллаборация с локальными артистами",
  "Подкаст-спинофф от Soul FM",
  "Новогодний спецвыпуск",
  "Утренний формат: перезагрузка",
  "Вечерний prime-time: усиление контента",
  "Фестиваль Soul FM Live",
  "Геймификация для слушателей",
  "Crossover-шоу: разные ведущие вместе",
  "Soul FM Academy: образовательный контент",
  "Behind the Music: истории треков",
];

const NEWS_TOPICS = [
  "Новинки музыкальной индустрии",
  "Тренды стриминговых платформ",
  "Концерты и фестивали сезона",
  "Технологии в музыке: AI и продакшн",
  "Indie-сцена: кто на подъёме",
  "Ретроспектива: альбомы десятилетия",
  "Музыкальное образование и карьера",
  "Лейблы и продюсеры: закулисье",
];

const RUBRIC_TOPICS = [
  "Новая утренняя рубрика",
  "Интерактивная вечерняя рубрика",
  "Музыкальная викторина в эфире",
  "Рубрика историй слушателей",
  "Технический ликбез для аудиофилов",
  "Рубрика о музыкальных инструментах",
  "Кулинарная рубрика под музыку",
  "Путешествия и музыка мира",
];

function getRandomTopic(type: string): string {
  const pools: Record<string, string[]> = {
    brainstorm: BRAINSTORM_TOPICS,
    news: NEWS_TOPICS,
    rubric: RUBRIC_TOPICS,
    schedule: [
      "Оптимизация сетки вещания",
      "Перестановки в расписании",
      "Новые слоты для контента",
      "Выходной формат эфира",
    ],
    review: [
      "Ежемесячный аудит контента",
      "Качество эфира: разбор",
      "Обратная связь от слушателей",
      "Технический обзор",
    ],
  };
  const pool = pools[type] || BRAINSTORM_TOPICS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Nico's Claude-powered synthesis ───────────────────────────────────

async function nicoSynthesize(
  sessionType: string,
  topic: string,
  contributions: Array<{ name: string; role: string; text: string }>
): Promise<{ summary: string; report: string; deliverables: Array<{ type: string; title: string; content: string; priority: string }> }> {
  const contributionsText = contributions
    .map((c) => `**${c.name}** (${c.role}): ${c.text}`)
    .join("\n\n");

  const systemPrompt = `Ты — Nico Steel, программный директор радиостанции Soul FM Hub. Ты координатор Эфирного Отдела.

ТВОЯ РОЛЬ:
- Ты анализируешь предложения команды и формулируешь чёткие выводы
- Ты пишешь отчёты для владельца станции
- Ты определяешь приоритеты и формулируешь конкретные задачи
- Ты говоришь профессионально, но живо, на русском языке

КОМАНДА Soul FM Hub:
- Sandra Ray — Певица/Вокалистка. Записывает джинглы, промо, ведёт утреннее шоу.
- Liana Nova — Ведущая/Диктор. Ведёт новости, live-шоу, интервью.
- Den Cipher — DJ/Музыкальный директор. Миксы, плейлисты, музыкальный вектор.
- Mark Volt — Новости и маркетинг. Контент, промо, аналитика.
- Max Sterling — Звукоинженер. Сведение, мастеринг, звуковой дизайн.
- Stella Vox — Диктор/Редактор новостей. Скрипты, новостные выпуски, интервью.

ФОРМАТ ОТВЕТА — строго JSON:
{
  "summary": "Краткий итог обсуждения (2-3 предложения)",
  "report": "Полный отчёт для владельца станции: что обсудили, ключевые идеи, рекомендации, следующие шаги. 3-5 абзацев.",
  "deliverables": [
    {
      "type": "idea|rubric|news-draft|schedule-proposal|script",
      "title": "Название",
      "content": "Описание, детали реализации",
      "priority": "low|medium|high"
    }
  ]
}

Deliverables — это КОНКРЕТНЫЕ результаты: идеи для реализации, черновики рубрик, предложения в расписание. Минимум 2, максимум 5.`;

  const userMessage = `Тип сессии: ${SESSION_TYPE_LABELS[sessionType] || sessionType}
Тема: ${topic}

Вклад команды:

${contributionsText}

Проанализируй все предложения, найди синергии, сформулируй конкретные deliverables. Ответь строго в JSON.`;

  try {
    // Use Nico's configured AI provider (multi-provider system)
    const result = await callAI(
      "nico",
      systemPrompt,
      [{ role: "user" as const, content: userMessage }],
      { maxTokens: 2048 },
    );

    if (result.error || !result.text) {
      console.error(`Nico synthesis AI error: ${result.error}`);
      return nicoTemplateSynthesis(sessionType, topic, contributions);
    }

    console.log(`[Synthesis] Nico via ${result.provider}/${result.model} in ${result.durationMs}ms`);

    const text = result.text;
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const parsed = JSON.parse(jsonStr);
    return {
      summary: parsed.summary || "Nico завершил анализ.",
      report: parsed.report || "Отчёт сформирован.",
      deliverables: (parsed.deliverables || []).map((d: any) => ({
        type: d.type || "idea",
        title: d.title || "Без названия",
        content: d.content || "",
        priority: d.priority || "medium",
      })),
    };
  } catch (err: any) {
    console.error("Nico synthesis error:", err?.message || err);
    return nicoTemplateSynthesis(sessionType, topic, contributions);
  }
}

function nicoTemplateSynthesis(
  sessionType: string,
  topic: string,
  contributions: Array<{ name: string; role: string; text: string }>
): {
  summary: string;
  report: string;
  deliverables: Array<{
    type: string;
    title: string;
    content: string;
    priority: string;
  }>;
} {
  const names = contributions.map((c) => c.name).join(", ");

  const summary = `Команда обсудила тему "${topic}". ${contributions.length} участников внесли предложения. Выявлены перспективные идеи для реализации.`;

  const report = `**Отчёт Эфирного Отдела**\n\nТема: ${topic}\nТип сессии: ${SESSION_TYPE_LABELS[sessionType] || sessionType}\nУчастники: ${names}\n\n**Ключевые предложения:**\n${contributions.map((c) => `- ${c.name}: ${c.text.slice(0, 100)}...`).join("\n")}\n\n**Рекомендация:** Утвердить к реализации наиболее перспективные идеи. Детали в deliverables.\n\n**Следующие шаги:** Распределить задачи между членами команды, определить сроки, начать подготовку материалов.`;

  const deliverables = [
    {
      type: sessionType === "news" ? "news-draft" : sessionType === "rubric" ? "rubric" : "idea",
      title: `${topic} — основное предложение`,
      content: `По итогам обсуждения команда предлагает реализовать формат, объединяющий идеи ${names}. Требуется утверждение и планирование.`,
      priority: "high",
    },
    {
      type: "idea",
      title: `Техническая подготовка для "${topic}"`,
      content: `Max подготовит звуковое оформление, Sandra запишет вокальные элементы, Den соберёт плейлист. Срок: 1 неделя.`,
      priority: "medium",
    },
  ];

  return { summary, report, deliverables };
}

// ── Audit log helper ──────────────────────────────────────────────────

async function addEditorialLog(opts: {
  level?: string;
  message: string;
  details?: string;
}) {
  const id = `auditlog_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  await kv.set(`auditlog:${id}`, {
    id,
    level: opts.level || "info",
    category: "Editorial Department",
    message: opts.message,
    details: opts.details || "",
    timestamp: new Date().toISOString(),
  });
}

// ── Telegram integration ──────────────────────────────────────────────

const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  chatId: "",
  enabled: false,
  sendOnComplete: false,
  sendOnApprove: true,
  lastSentAt: null,
  messagesSent: 0,
};

async function getTelegramConfig(): Promise<TelegramConfig> {
  const config = await kv.get("editorial:telegram");
  return (config as TelegramConfig) || { ...DEFAULT_TELEGRAM_CONFIG };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendTelegramMessage(text: string, parseMode: "HTML" | "MarkdownV2" = "HTML"): Promise<{ ok: boolean; error?: string }> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured in Supabase Secrets" };
  }

  const tgConfig = await getTelegramConfig();
  if (!tgConfig.chatId) {
    return { ok: false, error: "Telegram Chat ID not set" };
  }

  try {
    const truncatedText = text.length > 4000 ? text.slice(0, 3997) + "..." : text;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: tgConfig.chatId,
        text: truncatedText,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram API error:", data.description);
      return { ok: false, error: data.description || "Telegram API error" };
    }

    // Update stats
    tgConfig.lastSentAt = new Date().toISOString();
    tgConfig.messagesSent = (tgConfig.messagesSent || 0) + 1;
    await kv.set("editorial:telegram", tgConfig);

    return { ok: true };
  } catch (err: any) {
    console.error("Telegram send error:", err?.message);
    return { ok: false, error: err?.message || "Network error" };
  }
}

function formatSessionForTelegram(session: any, deliverables: any[]): string {
  const typeEmojis: Record<string, string> = {
    brainstorm: "\u{1F4A1}",
    news: "\u{1F4F0}",
    rubric: "\u{1F4CB}",
    schedule: "\u{1F4C5}",
    review: "\u{1F50D}",
  };
  const statusEmojis: Record<string, string> = {
    completed: "\u2705",
    approved: "\u{1F3AF}",
    rejected: "\u274C",
    "in-progress": "\u23F3",
    synthesizing: "\u{1F504}",
  };

  const typeLabel = SESSION_TYPE_LABELS[session.type] || session.type;
  const typeEmoji = typeEmojis[session.type] || "\u{1F4DD}";
  const statusEmoji = statusEmojis[session.status] || "\u{1F4DD}";

  let msg = `${typeEmoji} <b>Soul FM \u2014 \u042D\u0444\u0438\u0440\u043D\u044B\u0439 \u041E\u0442\u0434\u0435\u043B</b>\n\n`;
  msg += `${statusEmoji} <b>\u0421\u0435\u0441\u0441\u0438\u044F:</b> ${escapeHtml(session.topic)}\n`;
  msg += `<b>\u0422\u0438\u043F:</b> ${typeLabel}\n`;
  msg += `<b>\u0421\u0442\u0430\u0442\u0443\u0441:</b> ${session.status}\n`;
  msg += `<b>\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438:</b> ${session.participants?.length || 0}\n`;

  const dateStr = new Date(session.createdAt).toLocaleString("ru-RU", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  msg += `<b>\u0414\u0430\u0442\u0430:</b> ${dateStr}\n`;

  if (session.nicoSummary) {
    msg += `\n\u{1F3AC} <b>\u0418\u0442\u043E\u0433 \u043E\u0442 Nico:</b>\n${escapeHtml(session.nicoSummary)}\n`;
  }

  if (deliverables.length > 0) {
    msg += `\n\u{1F4E6} <b>Deliverables (${deliverables.length}):</b>\n`;
    for (const d of deliverables) {
      const prioEmoji = d.priority === "high" ? "\u{1F534}" : d.priority === "medium" ? "\u{1F7E1}" : "\u26AA";
      const statusMark = d.status === "approved" ? "\u2705" : d.status === "rejected" ? "\u274C" : "\u23F3";
      msg += `${statusMark} ${prioEmoji} ${escapeHtml(d.title)}\n`;
    }
  }

  if (session.feedback) {
    msg += `\n\u{1F4AC} <b>\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439:</b> ${escapeHtml(session.feedback)}\n`;
  }

  msg += `\n\u{1F3B5} <i>Soul FM Hub \u2014 \u042D\u0444\u0438\u0440\u043D\u044B\u0439 \u041E\u0442\u0434\u0435\u043B</i>`;

  return msg;
}

async function trySendTelegramOnEvent(session: any, eventType: "complete" | "approve"): Promise<void> {
  try {
    const tgConfig = await getTelegramConfig();
    if (!tgConfig.enabled || !tgConfig.chatId) return;

    if (eventType === "complete" && !tgConfig.sendOnComplete) return;
    if (eventType === "approve" && !tgConfig.sendOnApprove) return;

    const deliverables: any[] = [];
    for (const did of session.deliverableIds || []) {
      const d = await kv.get(`editorial:deliverable:${did}`);
      if (d) deliverables.push(d);
    }

    const text = formatSessionForTelegram(session, deliverables);
    const result = await sendTelegramMessage(text);
    if (result.ok) {
      await addEditorialLog({
        level: "info",
        message: `Telegram: \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043E\u0442\u0447\u0451\u0442 (${eventType}) \u2014 "${session.topic}"`,
      });
    } else {
      console.error(`Telegram auto-send failed (${eventType}):`, result.error);
    }
  } catch (err: any) {
    console.error("Telegram auto-send error:", err?.message);
  }
}

// ── Route setup ───────────────────────────────────────────────────────

export function setupEditorialRoutes(app: Hono, requireAuth: any) {
  const PREFIX = "/make-server-06086aa3/editorial";

  // ── GET /editorial/sessions — list all sessions ────────────────────
  app.get(`${PREFIX}/sessions`, requireAuth, async (c) => {
    try {
      const sessions = await kv.getByPrefix("editorial:session:");
      sessions.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return c.json({ sessions });
    } catch (e: any) {
      return c.json({ error: `Editorial sessions error: ${e.message}` }, 500);
    }
  });

  // ── GET /editorial/sessions/:id — get session detail ───────────────
  app.get(`${PREFIX}/sessions/:id`, requireAuth, async (c) => {
    try {
      const id = c.req.param("id");
      const session = await kv.get(`editorial:session:${id}`);
      if (!session) return c.json({ error: "Session not found" }, 404);

      const messages = await kv.getByPrefix(`editorial:msg:${id}:`);
      messages.sort(
        (a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const deliverableIds: string[] = (session as any).deliverableIds || [];
      const deliverables = [];
      for (const did of deliverableIds) {
        const d = await kv.get(`editorial:deliverable:${did}`);
        if (d) deliverables.push(d);
      }

      return c.json({ session, messages, deliverables });
    } catch (e: any) {
      return c.json({ error: `Session detail error: ${e.message}` }, 500);
    }
  });

  // ── POST /editorial/run-session — trigger an editorial session ─────
  app.post(`${PREFIX}/run-session`, requireAuth, async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const sessionType = body.type || "brainstorm";
      const topic = body.topic || getRandomTopic(sessionType);
      const sessionId = `es_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      let members = await kv.getByPrefix("broadcast:member:");
      if (members.length === 0) {
        return c.json({ error: "Broadcast team not initialized. Visit Broadcast Team page first." }, 400);
      }

      const session: EditorialSession = {
        id: sessionId,
        type: sessionType,
        topic,
        status: "in-progress",
        participants: members.map((m: any) => m.id),
        messagesCount: 0,
        deliverableIds: [],
        nicoSummary: null,
        nicoReport: null,
        feedback: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      await kv.set(`editorial:session:${sessionId}`, session);

      const nico = members.find((m: any) => m.id === "nico") as any;
      const nicoOpening: EditorialMessage = {
        id: `emsg_0_${sessionId}`,
        sessionId,
        agentId: "nico",
        agentName: nico?.name || "Nico",
        agentRole: nico?.role || "Program Director",
        agentColor: nico?.color || "#94a3b8",
        agentEmoji: nico?.emoji || "\u{1F3AC}",
        text: `\u041A\u043E\u043C\u0430\u043D\u0434\u0430, \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E \u0441\u0435\u0441\u0441\u0438\u044E \u043F\u043E \u0442\u0435\u043C\u0435: "${topic}". \u0422\u0438\u043F: ${SESSION_TYPE_LABELS[sessionType]}. \u0416\u0434\u0443 \u0432\u0430\u0448\u0438\u0445 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0439 \u2014 \u043A\u0430\u0436\u0434\u044B\u0439 \u043F\u043E \u0441\u0432\u043E\u0435\u043C\u0443 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044E. \u041F\u043E\u0435\u0445\u0430\u043B\u0438!`,
        isAI: false,
        timestamp: new Date().toISOString(),
      };
      await kv.set(`editorial:msg:${sessionId}:0`, nicoOpening);

      const contributors = members.filter((m: any) => m.id !== "nico");
      const contributions: Array<{ name: string; role: string; text: string }> = [];
      let msgIdx = 1;

      for (const member of contributors) {
        const m = member as any;
        const text = getAgentContribution(m, sessionType, topic);
        const msg: EditorialMessage = {
          id: `emsg_${msgIdx}_${sessionId}`,
          sessionId,
          agentId: m.id,
          agentName: m.name,
          agentRole: m.role,
          agentColor: m.color,
          agentEmoji: m.emoji,
          text,
          isAI: false,
          timestamp: new Date(Date.now() + msgIdx * 2000).toISOString(),
        };
        await kv.set(`editorial:msg:${sessionId}:${msgIdx}`, msg);
        contributions.push({ name: m.name, role: m.role, text });
        msgIdx++;
      }

      session.status = "synthesizing";
      session.messagesCount = msgIdx;
      await kv.set(`editorial:session:${sessionId}`, session);

      const synthesis = await nicoSynthesize(sessionType, topic, contributions);

      const nicoClosing: EditorialMessage = {
        id: `emsg_${msgIdx}_${sessionId}`,
        sessionId,
        agentId: "nico",
        agentName: nico?.name || "Nico",
        agentRole: nico?.role || "Program Director",
        agentColor: nico?.color || "#94a3b8",
        agentEmoji: nico?.emoji || "\u{1F3AC}",
        text: `**\u0418\u0442\u043E\u0433 \u0441\u0435\u0441\u0441\u0438\u0438:**\n\n${synthesis.summary}\n\n${synthesis.report}`,
        isAI: true,
        timestamp: new Date(Date.now() + (msgIdx + 1) * 2000).toISOString(),
      };
      await kv.set(`editorial:msg:${sessionId}:${msgIdx}`, nicoClosing);

      const deliverableIds: string[] = [];
      for (const d of synthesis.deliverables) {
        const did = `ed_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const deliverable: EditorialDeliverable = {
          id: did,
          sessionId,
          type: d.type as any,
          title: d.title,
          content: d.content,
          status: "pending",
          authorId: "nico",
          authorName: "Nico",
          priority: d.priority as any,
          feedback: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await kv.set(`editorial:deliverable:${did}`, deliverable);
        deliverableIds.push(did);
      }

      session.status = "completed";
      session.messagesCount = msgIdx + 1;
      session.deliverableIds = deliverableIds;
      session.nicoSummary = synthesis.summary;
      session.nicoReport = synthesis.report;
      session.completedAt = new Date().toISOString();
      await kv.set(`editorial:session:${sessionId}`, session);

      await addEditorialLog({
        level: "success",
        message: `Editorial session completed: "${topic}" (${SESSION_TYPE_LABELS[sessionType]})`,
        details: `${contributions.length + 2} messages, ${deliverableIds.length} deliverables`,
      });

      // Telegram auto-send on complete
      await trySendTelegramOnEvent(session, "complete");

      return c.json({ session, deliverableCount: deliverableIds.length });
    } catch (e: any) {
      console.error("Run editorial session error:", e);
      return c.json({ error: `Run session error: ${e.message}` }, 500);
    }
  });

  // ── GET /editorial/deliverables — list all deliverables ────────────
  app.get(`${PREFIX}/deliverables`, requireAuth, async (c) => {
    try {
      const deliverables = await kv.getByPrefix("editorial:deliverable:");
      deliverables.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return c.json({ deliverables });
    } catch (e: any) {
      return c.json({ error: `Deliverables error: ${e.message}` }, 500);
    }
  });

  // ── POST /editorial/deliverables/:id/approve ──────────────────────
  app.post(`${PREFIX}/deliverables/:id/approve`, requireAuth, async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const d: any = await kv.get(`editorial:deliverable:${id}`);
      if (!d) return c.json({ error: "Deliverable not found" }, 404);

      d.status = "approved";
      d.feedback = body.feedback || null;
      d.updatedAt = new Date().toISOString();
      await kv.set(`editorial:deliverable:${id}`, d);

      await addEditorialLog({
        level: "success",
        message: `Deliverable approved: "${d.title}"`,
      });
      return c.json({ deliverable: d });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // ── POST /editorial/deliverables/:id/reject ───────────────────────
  app.post(`${PREFIX}/deliverables/:id/reject`, requireAuth, async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const d: any = await kv.get(`editorial:deliverable:${id}`);
      if (!d) return c.json({ error: "Deliverable not found" }, 404);

      d.status = "rejected";
      d.feedback = body.feedback || "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E";
      d.updatedAt = new Date().toISOString();
      await kv.set(`editorial:deliverable:${id}`, d);

      await addEditorialLog({
        level: "warning",
        message: `Deliverable rejected: "${d.title}"`,
        details: body.feedback || "",
      });
      return c.json({ deliverable: d });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // ── POST /editorial/sessions/:id/approve — approve entire session ──
  app.post(`${PREFIX}/sessions/:id/approve`, requireAuth, async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const session: any = await kv.get(`editorial:session:${id}`);
      if (!session) return c.json({ error: "Session not found" }, 404);

      session.status = "approved";
      session.feedback = body.feedback || "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E";
      await kv.set(`editorial:session:${id}`, session);

      for (const did of session.deliverableIds || []) {
        const d: any = await kv.get(`editorial:deliverable:${did}`);
        if (d && d.status === "pending") {
          d.status = "approved";
          d.updatedAt = new Date().toISOString();
          await kv.set(`editorial:deliverable:${did}`, d);
        }
      }

      await addEditorialLog({
        level: "success",
        message: `Session approved: "${session.topic}"`,
      });

      // Telegram auto-send on approve
      await trySendTelegramOnEvent(session, "approve");

      return c.json({ session });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // ── POST /editorial/sessions/:id/reject — reject session ──────────
  app.post(`${PREFIX}/sessions/:id/reject`, requireAuth, async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const session: any = await kv.get(`editorial:session:${id}`);
      if (!session) return c.json({ error: "Session not found" }, 404);

      session.status = "rejected";
      session.feedback = body.feedback || "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E";
      await kv.set(`editorial:session:${id}`, session);

      await addEditorialLog({
        level: "warning",
        message: `Session rejected: "${session.topic}"`,
        details: body.feedback || "",
      });
      return c.json({ session });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // ── GET /editorial/stats — dashboard stats ─────────────────────────
  app.get(`${PREFIX}/stats`, requireAuth, async (c) => {
    try {
      const sessions = await kv.getByPrefix("editorial:session:");
      const deliverables = await kv.getByPrefix("editorial:deliverable:");

      const stats = {
        totalSessions: sessions.length,
        completedSessions: sessions.filter((s: any) => s.status === "completed").length,
        approvedSessions: sessions.filter((s: any) => s.status === "approved").length,
        rejectedSessions: sessions.filter((s: any) => s.status === "rejected").length,
        totalDeliverables: deliverables.length,
        pendingDeliverables: deliverables.filter((d: any) => d.status === "pending").length,
        approvedDeliverables: deliverables.filter((d: any) => d.status === "approved").length,
        rejectedDeliverables: deliverables.filter((d: any) => d.status === "rejected").length,
        byType: {
          brainstorm: sessions.filter((s: any) => s.type === "brainstorm").length,
          news: sessions.filter((s: any) => s.type === "news").length,
          rubric: sessions.filter((s: any) => s.type === "rubric").length,
          schedule: sessions.filter((s: any) => s.type === "schedule").length,
          review: sessions.filter((s: any) => s.type === "review").length,
        },
      };
      return c.json(stats);
    } catch (e: any) {
      return c.json({ error: `Stats error: ${e.message}` }, 500);
    }
  });

  // ── DELETE /editorial/sessions/:id — delete a session ──────────────
  app.delete(`${PREFIX}/sessions/:id`, requireAuth, async (c) => {
    try {
      const id = c.req.param("id");
      const session: any = await kv.get(`editorial:session:${id}`);
      if (!session) return c.json({ error: "Session not found" }, 404);

      for (let i = 0; i < (session.messagesCount || 30); i++) {
        await kv.del(`editorial:msg:${id}:${i}`);
      }

      for (const did of session.deliverableIds || []) {
        await kv.del(`editorial:deliverable:${did}`);
      }

      await kv.del(`editorial:session:${id}`);
      return c.json({ deleted: true });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // ── POST /editorial/clear-all — clear all editorial data ───────────
  app.post(`${PREFIX}/clear-all`, requireAuth, async (c) => {
    try {
      const sessions = await kv.getByPrefix("editorial:session:");
      const deliverables = await kv.getByPrefix("editorial:deliverable:");
      let msgCount = 0;

      for (const s of sessions) {
        const sess = s as any;
        for (let i = 0; i < (sess.messagesCount || 30); i++) {
          await kv.del(`editorial:msg:${sess.id}:${i}`);
          msgCount++;
        }
        for (const did of sess.deliverableIds || []) {
          await kv.del(`editorial:deliverable:${did}`);
        }
        await kv.del(`editorial:session:${sess.id}`);
      }

      for (const d of deliverables) {
        await kv.del(`editorial:deliverable:${(d as any).id}`);
      }

      return c.json({
        cleared: {
          sessions: sessions.length,
          messages: msgCount,
          deliverables: deliverables.length,
        },
      });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  // ═══ AUTOPILOT ════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════

  const DEFAULT_AUTOPILOT: AutopilotConfig = {
    enabled: false,
    intervalMinutes: 240,
    typeRotation: ["brainstorm", "news", "rubric", "schedule", "review"],
    lastRunAt: null,
    nextRunAt: null,
    sessionsRun: 0,
    currentTypeIndex: 0,
  };

  app.get(`${PREFIX}/autopilot`, requireAuth, async (c) => {
    try {
      const config = (await kv.get("editorial:autopilot")) || DEFAULT_AUTOPILOT;
      return c.json({ autopilot: config });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  app.post(`${PREFIX}/autopilot`, requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const current: any = (await kv.get("editorial:autopilot")) || DEFAULT_AUTOPILOT;
      const updated: AutopilotConfig = {
        enabled: body.enabled ?? current.enabled,
        intervalMinutes: body.intervalMinutes ?? current.intervalMinutes,
        typeRotation: body.typeRotation ?? current.typeRotation,
        lastRunAt: current.lastRunAt,
        nextRunAt: current.nextRunAt,
        sessionsRun: current.sessionsRun,
        currentTypeIndex: current.currentTypeIndex,
      };
      if (updated.enabled && !current.enabled) {
        updated.nextRunAt = new Date(Date.now() + updated.intervalMinutes * 60 * 1000).toISOString();
        await addEditorialLog({ level: "info", message: `Autopilot enabled \u2014 interval ${updated.intervalMinutes}min` });
      }
      if (!updated.enabled && current.enabled) {
        updated.nextRunAt = null;
        await addEditorialLog({ level: "info", message: "Autopilot disabled" });
      }
      await kv.set("editorial:autopilot", updated);
      return c.json({ autopilot: updated });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  app.post(`${PREFIX}/autopilot/tick`, requireAuth, async (c) => {
    try {
      const config: any = await kv.get("editorial:autopilot");
      if (!config || !config.enabled) {
        return c.json({ triggered: false, reason: "autopilot_disabled" });
      }
      const now = Date.now();
      const nextRun = config.nextRunAt ? new Date(config.nextRunAt).getTime() : 0;
      if (now < nextRun) {
        return c.json({ triggered: false, reason: "not_yet", nextRunAt: config.nextRunAt, remainingMinutes: Math.ceil((nextRun - now) / 60000) });
      }

      const rotation: string[] = config.typeRotation || ["brainstorm"];
      const idx = (config.currentTypeIndex || 0) % rotation.length;
      const sessionType = rotation[idx];
      const topic = getRandomTopic(sessionType);
      const members = await kv.getByPrefix("broadcast:member:");
      if (members.length === 0) return c.json({ triggered: false, reason: "no_team" });

      const sessionId = `es_auto_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const session: EditorialSession = {
        id: sessionId, type: sessionType as any, topic, status: "in-progress",
        participants: members.map((m: any) => m.id), messagesCount: 0,
        deliverableIds: [], nicoSummary: null, nicoReport: null, feedback: null,
        createdAt: new Date().toISOString(), completedAt: null,
      };
      await kv.set(`editorial:session:${sessionId}`, session);

      const nico = members.find((m: any) => m.id === "nico") as any;
      await kv.set(`editorial:msg:${sessionId}:0`, {
        id: `emsg_0_${sessionId}`, sessionId, agentId: "nico",
        agentName: nico?.name || "Nico", agentRole: nico?.role || "Program Director",
        agentColor: nico?.color || "#94a3b8", agentEmoji: nico?.emoji || "\u{1F3AC}",
        text: `[\u0410\u0412\u0422\u041E\u041F\u0418\u041B\u041E\u0422] \u041A\u043E\u043C\u0430\u043D\u0434\u0430, \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0443\u044E \u0441\u0435\u0441\u0441\u0438\u044E: "${topic}". \u0422\u0438\u043F: ${SESSION_TYPE_LABELS[sessionType]}.`,
        isAI: false, timestamp: new Date().toISOString(),
      });

      const contributors = members.filter((m: any) => m.id !== "nico");
      const contributions: Array<{ name: string; role: string; text: string }> = [];
      let msgIdx = 1;
      for (const member of contributors) {
        const m = member as any;
        const text = getAgentContribution(m, sessionType, topic);
        await kv.set(`editorial:msg:${sessionId}:${msgIdx}`, {
          id: `emsg_${msgIdx}_${sessionId}`, sessionId, agentId: m.id,
          agentName: m.name, agentRole: m.role, agentColor: m.color, agentEmoji: m.emoji,
          text, isAI: false, timestamp: new Date(Date.now() + msgIdx * 2000).toISOString(),
        });
        contributions.push({ name: m.name, role: m.role, text });
        msgIdx++;
      }

      const synthesis = await nicoSynthesize(sessionType, topic, contributions);
      await kv.set(`editorial:msg:${sessionId}:${msgIdx}`, {
        id: `emsg_${msgIdx}_${sessionId}`, sessionId, agentId: "nico",
        agentName: nico?.name || "Nico", agentRole: nico?.role || "Program Director",
        agentColor: nico?.color || "#94a3b8", agentEmoji: nico?.emoji || "\u{1F3AC}",
        text: `**\u0418\u0442\u043E\u0433 (\u0430\u0432\u0442\u043E\u043F\u0438\u043B\u043E\u0442):**\n\n${synthesis.summary}\n\n${synthesis.report}`,
        isAI: true, timestamp: new Date(Date.now() + (msgIdx + 1) * 2000).toISOString(),
      });

      const deliverableIds: string[] = [];
      for (const d of synthesis.deliverables) {
        const did = `ed_auto_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        await kv.set(`editorial:deliverable:${did}`, {
          id: did, sessionId, type: d.type, title: d.title, content: d.content,
          status: "pending", authorId: "nico", authorName: "Nico (autopilot)",
          priority: d.priority, feedback: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        deliverableIds.push(did);
      }

      session.status = "completed"; session.messagesCount = msgIdx + 1;
      session.deliverableIds = deliverableIds; session.nicoSummary = synthesis.summary;
      session.nicoReport = synthesis.report; session.completedAt = new Date().toISOString();
      await kv.set(`editorial:session:${sessionId}`, session);

      config.lastRunAt = new Date().toISOString();
      config.nextRunAt = new Date(now + config.intervalMinutes * 60 * 1000).toISOString();
      config.sessionsRun = (config.sessionsRun || 0) + 1;
      config.currentTypeIndex = (idx + 1) % rotation.length;
      await kv.set("editorial:autopilot", config);

      await addEditorialLog({ level: "success", message: `[AUTOPILOT] Session: "${topic}" (${SESSION_TYPE_LABELS[sessionType]})`, details: `#${config.sessionsRun}` });

      // Telegram auto-send on autopilot complete
      await trySendTelegramOnEvent(session, "complete");

      return c.json({ triggered: true, sessionId, topic, type: sessionType, deliverableCount: deliverableIds.length, nextRunAt: config.nextRunAt });
    } catch (e: any) {
      console.error("Autopilot tick error:", e);
      return c.json({ error: `Autopilot tick error: ${e.message}` }, 500);
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  // ═══ SEND TO ASSISTANT (Implementation Tasks) ════════════════════════
  // ══════════════════════════════════════════════════════════════════════

  app.post(`${PREFIX}/sessions/:id/send-to-assistant`, requireAuth, async (c) => {
    try {
      const id = c.req.param("id");
      const session: any = await kv.get(`editorial:session:${id}`);
      if (!session) return c.json({ error: "Session not found" }, 404);
      if (session.status !== "approved") return c.json({ error: "Session must be approved first" }, 400);

      const deliverables: any[] = [];
      for (const did of session.deliverableIds || []) {
        const d = await kv.get(`editorial:deliverable:${did}`);
        if (d) deliverables.push(d);
      }
      const approved = deliverables.filter((d: any) => d.status === "approved");
      if (approved.length === 0) return c.json({ error: "No approved deliverables" }, 400);

      const plan = await nicoCreateImplementationPlan(session.topic, session.type, approved);
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const task: ImplementationTask = {
        id: taskId, sessionId: id, sessionTopic: session.topic,
        title: plan.title, implementationPlan: plan.plan, steps: plan.steps,
        status: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await kv.set(`editorial:task:${taskId}`, task);
      await addEditorialLog({ level: "success", message: `Task created: "${plan.title}"`, details: `${plan.steps.length} steps` });
      return c.json({ task });
    } catch (e: any) {
      console.error("Send to assistant error:", e);
      return c.json({ error: `Send to assistant error: ${e.message}` }, 500);
    }
  });

  app.get(`${PREFIX}/tasks`, requireAuth, async (c) => {
    try {
      const tasks = await kv.getByPrefix("editorial:task:");
      tasks.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return c.json({ tasks });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  app.post(`${PREFIX}/tasks/:id/status`, requireAuth, async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const task: any = await kv.get(`editorial:task:${id}`);
      if (!task) return c.json({ error: "Task not found" }, 404);
      if (body.stepIndex !== undefined && body.stepStatus) {
        if (task.steps[body.stepIndex]) task.steps[body.stepIndex].status = body.stepStatus;
      }
      if (body.taskStatus) task.status = body.taskStatus;
      if (task.steps.every((s: any) => s.status === "done")) task.status = "completed";
      task.updatedAt = new Date().toISOString();
      await kv.set(`editorial:task:${id}`, task);
      return c.json({ task });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  app.delete(`${PREFIX}/tasks/:id`, requireAuth, async (c) => {
    try {
      await kv.del(`editorial:task:${c.req.param("id")}`);
      return c.json({ deleted: true });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  // ═══ TELEGRAM INTEGRATION ════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════

  // GET /editorial/telegram — get Telegram config
  app.get(`${PREFIX}/telegram`, requireAuth, async (c) => {
    try {
      const config = await getTelegramConfig();
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      return c.json({
        telegram: {
          ...config,
          botTokenSet: !!botToken,
        },
      });
    } catch (e: any) {
      return c.json({ error: `Telegram config error: ${e.message}` }, 500);
    }
  });

  // POST /editorial/telegram — save Telegram config
  app.post(`${PREFIX}/telegram`, requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const current = await getTelegramConfig();
      const updated: TelegramConfig = {
        chatId: body.chatId ?? current.chatId,
        enabled: body.enabled ?? current.enabled,
        sendOnComplete: body.sendOnComplete ?? current.sendOnComplete,
        sendOnApprove: body.sendOnApprove ?? current.sendOnApprove,
        lastSentAt: current.lastSentAt,
        messagesSent: current.messagesSent,
      };
      await kv.set("editorial:telegram", updated);

      const action = updated.enabled ? "enabled" : "disabled";
      await addEditorialLog({
        level: "info",
        message: `Telegram ${action} (chatId: ${updated.chatId || "not set"})`,
      });

      return c.json({ telegram: updated });
    } catch (e: any) {
      return c.json({ error: `Save Telegram config error: ${e.message}` }, 500);
    }
  });

  // POST /editorial/telegram/test — send a test message
  app.post(`${PREFIX}/telegram/test`, requireAuth, async (c) => {
    try {
      const tgConfig = await getTelegramConfig();
      if (!tgConfig.chatId) {
        return c.json({ error: "Chat ID not configured" }, 400);
      }

      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!botToken) {
        return c.json({ error: "TELEGRAM_BOT_TOKEN not set in Supabase Secrets" }, 400);
      }

      const testMsg = `\u{1F3B5} <b>Soul FM Hub \u2014 Test Message</b>\n\n\u2705 Telegram \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044F \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442!\n\u{1F4E1} Chat ID: <code>${tgConfig.chatId}</code>\n\u{1F552} ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Berlin" })}\n\n<i>\u042D\u0444\u0438\u0440\u043D\u044B\u0439 \u041E\u0442\u0434\u0435\u043B \u0431\u0443\u0434\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u043E\u0442\u0447\u0451\u0442\u044B Nico \u0441\u044E\u0434\u0430.</i>`;

      const result = await sendTelegramMessage(testMsg);
      if (!result.ok) {
        return c.json({ error: result.error }, 400);
      }

      return c.json({ success: true, message: "Test message sent!" });
    } catch (e: any) {
      return c.json({ error: `Telegram test error: ${e.message}` }, 500);
    }
  });

  // POST /editorial/sessions/:id/telegram — send session report to Telegram
  app.post(`${PREFIX}/sessions/:id/telegram`, requireAuth, async (c) => {
    try {
      const id = c.req.param("id");
      const session: any = await kv.get(`editorial:session:${id}`);
      if (!session) return c.json({ error: "Session not found" }, 404);

      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!botToken) {
        return c.json({ error: "TELEGRAM_BOT_TOKEN not set" }, 400);
      }

      const tgConfig = await getTelegramConfig();
      if (!tgConfig.chatId) {
        return c.json({ error: "Telegram Chat ID not configured" }, 400);
      }

      const deliverables: any[] = [];
      for (const did of session.deliverableIds || []) {
        const d = await kv.get(`editorial:deliverable:${did}`);
        if (d) deliverables.push(d);
      }

      const text = formatSessionForTelegram(session, deliverables);
      const result = await sendTelegramMessage(text);

      if (!result.ok) {
        return c.json({ error: result.error }, 400);
      }

      await addEditorialLog({
        level: "info",
        message: `Telegram: \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043E\u0442\u0447\u0451\u0442 \u043F\u043E \u0441\u0435\u0441\u0441\u0438\u0438 "${session.topic}"`,
      });

      return c.json({ success: true });
    } catch (e: any) {
      return c.json({ error: `Send to Telegram error: ${e.message}` }, 500);
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  // ═══ INDIVIDUAL AGENT CHATS ════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════

  app.post(`${PREFIX}/agent-chat`, requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const { agentId, message } = body;
      if (!agentId || !message) return c.json({ error: "agentId and message required" }, 400);

      const chatKey = `editorial:agentchat:${agentId}`;
      let history: any[] = ((await kv.get(chatKey)) as any[]) || [];

      const userMsg = { id: `msg_${Date.now()}_u`, role: "user", text: message, timestamp: new Date().toISOString() };
      history.push(userMsg);

      let responseText = "";
      const prompt = AGENT_CHAT_PROMPTS[agentId];

      if (prompt) {
        // Use multi-provider AI system — each agent uses its configured provider
        const aiMessages: AIMessage[] = history.slice(-20).map((m: any) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }));

        const result = await callAI(agentId, prompt, aiMessages);
        if (result.text) {
          responseText = result.text;
          console.log(`[AgentChat] ${agentId} responded via ${result.provider}/${result.model} in ${result.durationMs}ms`);
        } else if (result.error) {
          console.error(`[AgentChat] ${agentId} AI error: ${result.error}`);
        }
      }

      if (!responseText) responseText = getAgentFallbackResponse(agentId, message);

      // Get provider info to include in response
      const aiConfig = await getAgentAIConfig(agentId);
      const agentMsg = {
        id: `msg_${Date.now()}_a`, role: "agent", agentId, text: responseText,
        provider: aiConfig.provider, model: aiConfig.model,
        timestamp: new Date().toISOString(),
      };
      history.push(agentMsg);
      if (history.length > 100) history = history.slice(-100);
      await kv.set(chatKey, history);

      return c.json({ userMessage: userMsg, agentResponse: agentMsg });
    } catch (e: any) {
      return c.json({ error: `Agent chat error: ${e.message}` }, 500);
    }
  });

  app.get(`${PREFIX}/agent-chat/:agentId`, requireAuth, async (c) => {
    try {
      const agentId = c.req.param("agentId");
      const history = ((await kv.get(`editorial:agentchat:${agentId}`)) as any[]) || [];
      return c.json({ messages: history });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  app.delete(`${PREFIX}/agent-chats`, requireAuth, async (c) => {
    try {
      for (const id of ["nico", "sandra", "liana", "den", "mark", "max", "stella"]) {
        await kv.del(`editorial:agentchat:${id}`);
      }
      return c.json({ cleared: true });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  // ═══ COMPILED ANALYSIS ════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════

  app.post(`${PREFIX}/compile-analysis`, requireAuth, async (c) => {
    try {
      const members = await kv.getByPrefix("broadcast:member:");
      if (members.length === 0) return c.json({ error: "Broadcast team not initialized" }, 400);

      const agentAreas: Record<string, string> = {
        sandra: "Вокальный контент: джинглы, промо, подводки, вокальные рубрики",
        liana: "Ведение эфира: live-шоу, интерактив, форматы взаимодействия с аудиторией",
        den: "Музыкальный формат: ротация, баланс жанров, новые треки и артисты",
        mark: "Маркетинг: метрики, промо, рост аудитории, соцсети",
        max: "Техника и новинки: качество звука, НОВЫЕ РЕЛИЗЫ soul/neo-soul/R&B для ротации",
        stella: "Редакция: скрипты, новости, качество текстов, рубрики",
      };

      // Call all agents in PARALLEL to stay within Edge Function timeouts
      // (6 sequential 30s calls = 180s; parallel = ~30s)
      const teamMembers = members.filter((m: any) => m.id !== "nico");
      const agentPromises = teamMembers.map(async (member: any) => {
        const m = member as any;
        const area = agentAreas[m.id] || "общие предложения";
        let text = "";

        if (AGENT_CHAT_PROMPTS[m.id]) {
          try {
            const result = await callAI(
              m.id,
              AGENT_CHAT_PROMPTS[m.id],
              [{ role: "user" as const, content: `Подготовь краткий отчёт для общего анализа Эфирного Отдела. Твоё направление: ${area}. Укажи текущее состояние, проблемы и конкретные предложения. 3-5 пунктов.` }],
            );
            if (result.text) {
              text = result.text;
              console.log(`[Analysis] ${m.id} contributed via ${result.provider}/${result.model} in ${result.durationMs}ms`);
            } else if (result.error) {
              console.error(`[Analysis] ${m.id} AI error: ${result.error}`);
            }
          } catch (err: any) {
            console.error(`[Analysis] ${m.id} call failed:`, err?.message);
          }
        }
        if (!text) text = getAgentAnalysisContribution(m.id, area);
        return { agentId: m.id, name: m.name, role: m.role, text };
      });

      const contributions = await Promise.all(agentPromises);

      const analysis = await nicoCompileAnalysis(contributions);
      const analysisObj = {
        id: `analysis_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...analysis,
        agentContributions: Object.fromEntries(contributions.map(c => [c.agentId, { name: c.name, role: c.role, text: c.text }])),
      };
      await kv.set("editorial:latest-analysis", analysisObj);
      await addEditorialLog({ level: "success", message: "Compiled editorial analysis" });

      // Auto Telegram
      const tgConfig = await getTelegramConfig();
      if (tgConfig.enabled && tgConfig.chatId) {
        let tgText = "\u{1F4CA} <b>Soul FM — Общий анализ</b>\n\n";
        for (const s of analysis.sections) {
          tgText += `<b>${s.icon} ${s.title}</b>\n`;
          for (const sg of s.suggestions.slice(0, 3)) tgText += `• ${escapeHtml(sg)}\n`;
          tgText += "\n";
        }
        await sendTelegramMessage(tgText);
      }

      return c.json({ analysis: analysisObj });
    } catch (e: any) {
      console.error("Compile analysis error:", e);
      return c.json({ error: `Compile analysis error: ${e.message}` }, 500);
    }
  });

  app.get(`${PREFIX}/latest-analysis`, requireAuth, async (c) => {
    try {
      const analysis = await kv.get("editorial:latest-analysis");
      return c.json({ analysis: analysis || null });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });
}

// ── Nico's AI-powered implementation plan ──────────────────────────────

async function nicoCreateImplementationPlan(topic: string, sessionType: string, deliverables: any[]): Promise<{
  title: string; plan: string;
  steps: Array<{ step: string; assignee: string; deadline: string; status: "pending" }>;
}> {
  const delText = deliverables.map((d: any, i: number) => `${i + 1}. [${d.type}] "${d.title}" (${d.priority})\n   ${d.content}`).join("\n\n");
  const systemPrompt = `Ты — Nico Steel, программный директор Soul FM Hub. Тебе утвердили deliverables. Составь КОНКРЕТНЫЙ план реализации.

КОМАНДА: Sandra Ray (вокал), Liana Nova (ведущая), Den Cipher (DJ), Mark Volt (маркетинг), Max Sterling (звукоинженер), Stella Vox (редактор).

Ответь строго JSON:
{
  "title": "Краткое название задачи",
  "plan": "Детальный план: что делать, в каком порядке, ресурсы. 3-5 абзацев.",
  "steps": [{"step": "Действие", "assignee": "Имя", "deadline": "Срок"}]
}
Steps — 4-8 штук, конкретные и измеримые.`;

  try {
    // Use Nico's configured AI provider (multi-provider system)
    const result = await callAI(
      "nico",
      systemPrompt,
      [{ role: "user" as const, content: `Тема: ${topic}\nТип: ${SESSION_TYPE_LABELS[sessionType] || sessionType}\n\nDeliverables:\n${delText}\n\nСоставь план. JSON.` }],
      { maxTokens: 2048 },
    );

    if (!result.text) return nicoTemplateImplementation(topic, deliverables);
    console.log(`[ImplPlan] Nico via ${result.provider}/${result.model} in ${result.durationMs}ms`);

    const text = result.text;
    let jsonStr = text;
    const jm = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jm) jsonStr = jm[1];
    const om = jsonStr.match(/\{[\s\S]*\}/);
    if (om) jsonStr = om[0];
    const p = JSON.parse(jsonStr);
    return {
      title: p.title || `\u0420\u0435\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F: ${topic}`,
      plan: p.plan || "\u041F\u043B\u0430\u043D \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D.",
      steps: (p.steps || []).map((s: any) => ({ step: s.step || "\u0428\u0430\u0433", assignee: s.assignee || "Nico", deadline: s.deadline || "TBD", status: "pending" as const })),
    };
  } catch (err: any) {
    console.error("Nico impl plan error:", err?.message);
    return nicoTemplateImplementation(topic, deliverables);
  }
}

// ── Agent chat system prompts ──────────────────────────────────────────

const AGENT_CHAT_PROMPTS: Record<string, string> = {
  nico: `Ты — Nico Steel, программный директор радиостанции Soul FM Hub (soul, neo-soul, R&B, jazz, lo-fi). Координируешь команду: Sandra (вокал), Liana (ведущая), Den (DJ), Mark (маркетинг), Max (звукоинженер), Stella (редактор). Отвечаешь профессионально, на русском. Давай конкретные решения.`,
  sandra: `Ты — Sandra Ray, певица Soul FM Hub. Записываешь джинглы, промо, ведёшь "Morning Vibes". Отвечаешь творчески, на русском. Предлагаешь вокальные идеи.`,
  liana: `Ты — Liana Nova, ведущая Soul FM Hub. Live-шоу, интервью, интерактив. Отвечаешь энергично, на русском. Предлагаешь форматы шоу.`,
  den: `Ты — Den Cipher, DJ и музыкальный директор Soul FM Hub. Миксы, плейлисты, музыкальный вектор (soul, neo-soul, R&B, jazz, lo-fi). Отвечаешь со знанием, на русском.`,
  mark: `Ты — Mark Volt, новости и маркетинг Soul FM Hub. Контент, промо, метрики. Отвечаешь деловито, на русском.`,
  max: `Ты — Max Sterling, звукоинженер Soul FM Hub. Сведение, мастеринг, звуковой дизайн. ВАЖНО: постоянно мониторишь новинки soul/neo-soul/R&B/jazz и предлагаешь треки для ротации. Называй реальных артистов. Отвечаешь технично, на русском.`,
  stella: `Ты — Stella Vox, диктор и редактор Soul FM Hub. Скрипты, новостные выпуски, интервью. Отвечаешь структурированно, на русском.`,
};

function getAgentFallbackResponse(agentId: string, _message: string): string {
  const responses: Record<string, string[]> = {
    nico: [
      "Принял. Проанализирую с учётом текущей сетки вещания и соберу мнения команды.",
      "Хорошая идея. Нужно синхронизировать с планом на неделю. Координирую с командой.",
      "Давай обсудим на ближайшей сессии. Подготовлю предложения от каждого отдела.",
    ],
    sandra: [
      "Могу записать вокальный материал! Давай обсудим стиль и настроение для этого.",
      "У меня есть идея для музыкального оформления. Подготовлю демо к завтрашнему дню.",
      "Звучит интересно! Предлагаю neo-soul подход — тёплый, с лёгкой хрипотцой.",
    ],
    liana: [
      "Отличная тема для интерактива! Могу провести live-опрос и собрать мнения слушателей.",
      "Предлагаю формат мини-дискуссии с звонками. 15 минут энергичного обсуждения.",
      "Запустим голосование в эфире? Я подготовлю подводки и вопросы для аудитории.",
    ],
    den: [
      "Подберу тематический плейлист. Думаю, 20-25 треков с плавными переходами подойдут.",
      "Есть идея для микса. Deep house основа + neo-soul элементы. Соберу за день.",
      "Обновлю ротацию — добавлю свежие треки и уберу то, что крутится больше 3 месяцев.",
    ],
    mark: [
      "Подготовлю промо-кампанию: тизеры в соцсетях, анонс в эфире, пост-релиз.",
      "Метрики показывают рост. Нужно усилить контент в вечернем слоте — там потенциал.",
      "Составлю контент-план на неделю с перекрёстным промо между шоу.",
    ],
    max: [
      "Проверю звук. Также нашёл пару новых треков для ротации — Masego и Tom Misch, свежие релизы.",
      "Техническое качество стабильное. Рекомендую добавить в ротацию Jordan Rakei — идеально для нашего формата.",
      "Обработаю материал: нормализация, компрессия, де-эссинг. Плюс новинка от FKJ — шикарный трек.",
    ],
    stella: [
      "Напишу скрипт. Структура: вступление 30 сек → основной блок 3 мин → резюме.",
      "Подготовлю новостной дайджест. 5 ключевых новостей + 1 музыкальная.",
      "Предлагаю обновить формулировки в промо-роликах — текущий стиль устарел.",
    ],
  };
  const pool = responses[agentId] || ["Принял, подготовлю предложения."];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getAgentAnalysisContribution(agentId: string, area: string): string {
  const contributions: Record<string, string> = {
    sandra: "1. Текущие джинглы: 5 из 8 актуальны, 3 требуют перезаписи\n2. Утренняя подводка работает хорошо, но нужен сезонный вариант\n3. Предлагаю записать серию вокальных ID для вечернего эфира\n4. Новая рубрика «Soul Kitchen» — 5 мин вокальная история трека",
    liana: "1. Live-шоу стабильно, аудитория растёт +8%\n2. Не хватает интерактива — добавить блок звонков 15 мин/час\n3. Предлагаю «Голос улицы» — мини-интервью с прохожими\n4. Выходные: запустить talk-show «Вечерний Soul» 20:00-22:00",
    den: "1. Ротация: 15% треков старше 6 месяцев, нужно обновление\n2. Баланс жанров: 40% soul, 25% neo-soul, 20% R&B, 15% jazz — оптимально\n3. Добавить «Discovery Mix» — 3 новых трека в каждый сет\n4. Пятничный «Neon Nights» — расширить до 4 часов",
    mark: "1. Вовлечённость +12% за месяц, новые слушатели +8%\n2. Слабое место: удержание в вечернем слоте (20-22)\n3. Нужна cross-promotion между шоу\n4. Запустить серию промо «Behind Soul FM» в соцсетях",
    max: "1. Качество звука стабильное: LUFS -14, True Peak -1dB\n2. 5 треков с клиппингом в библиотеке — нужна переобработка\n3. НОВИНКИ для ротации: Jorja Smith «Try Me», Khruangbin «May Ninth», Hiatus Kaiyote «Chivalry Is Not Dead»\n4. Рекомендую добавить spatial audio для иммерсивных переходов",
    stella: "1. Скрипты актуальны, но 4 промо-ролика требуют обновления\n2. Формат новостей: добавить 1 human interest story в выпуск\n3. Рубрика «Persona» — еженедельное интервью, 15 мин\n4. Утренний брифинг «Morning Headlines» 08:00 — 5 мин ключевых новостей",
  };
  return contributions[agentId] || `Отчёт по направлению: ${area}\n1. Текущее состояние стабильное\n2. Есть потенциал для улучшения`;
}

async function nicoCompileAnalysis(contributions: Array<{ agentId: string; name: string; role: string; text: string }>): Promise<{
  summary: string;
  sections: Array<{ icon: string; title: string; content: string; suggestions: string[] }>;
}> {
  const contribText = contributions.map(c => `**${c.name}** (${c.role}):\n${c.text}`).join("\n\n");

  try {
    // Use Nico's configured AI provider (multi-provider system)
    const systemPrompt = `Ты — Nico Steel, программный директор Soul FM Hub. Составь ОБЩИЙ АНАЛИЗ на основе отчётов команды.

Формат ответа — строго JSON:
{
  "summary": "Краткий итог 2-3 предложения",
  "sections": [
    { "icon": "📻", "title": "Программный эфир", "content": "Описание", "suggestions": ["Пункт 1", "Пункт 2"] },
    { "icon": "🎤", "title": "Рубрики", "content": "...", "suggestions": [...] },
    { "icon": "🎵", "title": "Музыкальный формат", "content": "...", "suggestions": [...] },
    { "icon": "🔄", "title": "Новые ротации", "content": "...", "suggestions": [...] },
    { "icon": "⚙️", "title": "Технические улучшения", "content": "...", "suggestions": [...] },
    { "icon": "📢", "title": "Маркетинг и промо", "content": "...", "suggestions": [...] }
  ]
}
Каждая секция: 2-4 конкретных suggestions. Пиши на русском.`;

    const result = await callAI(
      "nico",
      systemPrompt,
      [{ role: "user" as const, content: `Отчёты команды:\n\n${contribText}\n\nСоставь общий анализ. JSON.` }],
      { maxTokens: 2048 },
    );

    if (result.text) {
      console.log(`[CompileAnalysis] Nico via ${result.provider}/${result.model} in ${result.durationMs}ms`);
      const text = result.text;
      let jsonStr = text;
      const jm = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jm) jsonStr = jm[1];
      const om = jsonStr.match(/\{[\s\S]*\}/);
      if (om) jsonStr = om[0];
      return JSON.parse(jsonStr);
    }
  } catch (err: any) { console.error("Nico compile analysis error:", err?.message); }

  // Template fallback
  return {
    summary: `Команда из ${contributions.length} специалистов подготовила отчёты. Выявлены точки роста и конкретные предложения по улучшению эфира.`,
    sections: [
      { icon: "📻", title: "Программный эфир", content: "Сетка вещания работает стабильно. Нужна оптимизация вечернего слота.", suggestions: ["Усилить контент 20:00-22:00", "Добавить интерактивные блоки", "Расширить выходной формат"] },
      { icon: "🎤", title: "Рубрики", content: "Текущие рубрики актуальны, есть потенциал для новых.", suggestions: ["Запустить «Soul Kitchen» — вокальная история трека", "«Голос улицы» — мини-интервью", "«Persona» — еженедельное интервью"] },
      { icon: "🎵", title: "Музыкальный формат", content: "Баланс жанров оптимален. 15% треков требуют обновления.", suggestions: ["Обновить устаревшие треки в ротации", "Добавить Discovery Mix — 3 новинки/сет", "Расширить Neon Nights до 4 часов"] },
      { icon: "🔄", title: "Новые ротации", content: "Max рекомендует свежие релизы для эфира.", suggestions: ["Jorja Smith — Try Me", "Khruangbin — May Ninth", "Hiatus Kaiyote — Chivalry Is Not Dead", "Jordan Rakei — новый альбом"] },
      { icon: "⚙️", title: "Технические улучшения", content: "Качество звука стабильное, есть мелкие проблемы.", suggestions: ["Исправить 5 треков с клиппингом", "Перезаписать 3 устаревших джингла", "Внедрить spatial audio переходы"] },
      { icon: "📢", title: "Маркетинг и промо", content: "Рост аудитории +8%, вовлечённость +12%.", suggestions: ["Cross-promotion между шоу", "Серия «Behind Soul FM» в соцсетях", "Усилить вечерний контент для удержания"] },
    ],
  };
}

function nicoTemplateImplementation(topic: string, deliverables: any[]): {
  title: string; plan: string;
  steps: Array<{ step: string; assignee: string; deadline: string; status: "pending" }>;
} {
  return {
    title: `\u0420\u0435\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F: ${topic}`,
    plan: `\u041F\u043B\u0430\u043D \u043F\u043E \u0442\u0435\u043C\u0435 "${topic}". ${deliverables.length} deliverables \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E. \u0420\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0438 \u0438 \u043D\u0430\u0447\u0430\u0442\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0443.`,
    steps: [
      { step: `\u0417\u0432\u0443\u043A\u043E\u0432\u043E\u0435 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0434\u043B\u044F "${topic}"`, assignee: "Max Sterling", deadline: "3 \u0434\u043D\u044F", status: "pending" },
      { step: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0432\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B", assignee: "Sandra Ray", deadline: "3 \u0434\u043D\u044F", status: "pending" },
      { step: "\u0421\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043F\u043B\u0435\u0439\u043B\u0438\u0441\u0442", assignee: "Den Cipher", deadline: "2 \u0434\u043D\u044F", status: "pending" },
      { step: "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u043A\u0440\u0438\u043F\u0442\u044B", assignee: "Stella Vox", deadline: "2 \u0434\u043D\u044F", status: "pending" },
      { step: "\u041F\u0440\u043E\u043C\u043E-\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B", assignee: "Mark Volt", deadline: "4 \u0434\u043D\u044F", status: "pending" },
      { step: "\u0424\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u0441\u0432\u0435\u0434\u0435\u043D\u0438\u0435", assignee: "Max Sterling", deadline: "5 \u0434\u043D\u0435\u0439", status: "pending" },
    ],
  };
}
