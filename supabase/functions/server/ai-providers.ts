/**
 * Soul FM Hub - Multi-Provider AI System
 *
 * Unified interface for calling different AI providers per agent:
 *   - Anthropic (Claude) — ANTHROPIC_API_KEY
 *   - OpenRouter — OPENROUTER_API_KEY
 *   - Google Gemini — GEMINI_API_KEY
 *   - Mistral — MISTRAL_API_KEY
 *   - Kimi (Moonshot AI) — KIMI_API_KEY
 *
 * Each agent can be configured with its own provider/model via CRUD.
 * Configs stored in KV under `editorial:ai-provider:{agentId}`.
 */

import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";

// ── Types ──────────────────────────────────────────────────────────────

export type AIProvider = "anthropic" | "openrouter" | "gemini" | "mistral" | "kimi";

export interface AIProviderConfig {
  agentId: string;
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  lastUsedAt: string | null;
  totalCalls: number;
  avgResponseMs: number;
  lastError: string | null;
  mistralAgentId?: string; // Mistral Agents API — custom agent_id
}

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AICallResult {
  text: string;
  provider: AIProvider;
  model: string;
  durationMs: number;
  error?: string;
}

// ── Available models per provider ──────────────────────────────────────

export const AVAILABLE_MODELS: Record<AIProvider, Array<{ id: string; name: string; description: string }>> = {
  anthropic: [
    { id: "claude-sonnet-4-6-20260210", name: "Claude Sonnet 4.6", description: "Latest flagship — best reasoning & intelligence" },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Strong balance of intelligence and speed" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", description: "Fast and efficient" },
  ],
  openrouter: [
    { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4 (OR)", description: "Via OpenRouter" },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (OR)", description: "Latest fast multimodal" },
    { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash (OR)", description: "Fast multimodal" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", description: "Open-source powerhouse" },
    { id: "mistralai/mistral-large-2411", name: "Mistral Large (OR)", description: "Via OpenRouter" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3", description: "Efficient reasoning" },
    { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", description: "Multilingual excellence" },
  ],
  gemini: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Most capable — deep reasoning, code, analysis (Pro plan)" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fast reasoning with thinking budget" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Fast and capable, great for teams" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Long context, advanced reasoning" },
  ],
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large", description: "Flagship model" },
    { id: "mistral-medium-latest", name: "Mistral Medium", description: "Balanced performance" },
    { id: "mistral-small-latest", name: "Mistral Small", description: "Fast and efficient" },
    { id: "open-mistral-nemo", name: "Mistral Nemo", description: "Compact powerhouse" },
    { id: "mistral-agent", name: "Mistral Agent", description: "Custom AI Agent (Agents API)" },
  ],
  kimi: [
    { id: "kimi-k2", name: "Kimi K2", description: "Flagship MoE model, multilingual" },
    { id: "moonshot-v1-128k", name: "Moonshot 128K", description: "128K context window" },
    { id: "moonshot-v1-32k", name: "Moonshot 32K", description: "Balanced context/speed" },
    { id: "moonshot-v1-8k", name: "Moonshot 8K", description: "Fast, compact context" },
  ],
};

// ── Default agent provider assignments ────────────────────────────────

export const DEFAULT_AGENT_CONFIGS: Record<string, AIProviderConfig> = {
  nico: {
    agentId: "nico",
    provider: "gemini",
    model: "gemini-2.5-pro",
    temperature: 0.7,
    maxTokens: 1024,
    enabled: true,
    lastUsedAt: null,
    totalCalls: 0,
    avgResponseMs: 0,
    lastError: null,
  },
  sandra: {
    agentId: "sandra",
    provider: "gemini",
    model: "gemini-2.0-flash",
    temperature: 0.8,
    maxTokens: 600,
    enabled: true,
    lastUsedAt: null,
    totalCalls: 0,
    avgResponseMs: 0,
    lastError: null,
  },
  liana: {
    agentId: "liana",
    provider: "gemini",
    model: "gemini-2.0-flash",
    temperature: 0.75,
    maxTokens: 600,
    enabled: true,
    lastUsedAt: null,
    totalCalls: 0,
    avgResponseMs: 0,
    lastError: null,
  },
  den: {
    agentId: "den",
    provider: "gemini",
    model: "gemini-2.0-flash",
    temperature: 0.7,
    maxTokens: 600,
    enabled: true,
    lastUsedAt: null,
    totalCalls: 0,
    avgResponseMs: 0,
    lastError: null,
  },
  mark: {
    agentId: "mark",
    provider: "gemini",
    model: "gemini-2.0-flash",
    temperature: 0.65,
    maxTokens: 600,
    enabled: true,
    lastUsedAt: null,
    totalCalls: 0,
    avgResponseMs: 0,
    lastError: null,
  },
  max: {
    agentId: "max",
    provider: "gemini",
    model: "gemini-2.0-flash",
    temperature: 0.6,
    maxTokens: 600,
    enabled: true,
    lastUsedAt: null,
    totalCalls: 0,
    avgResponseMs: 0,
    lastError: null,
  },
  stella: {
    agentId: "stella",
    provider: "gemini",
    model: "gemini-2.0-flash",
    temperature: 0.65,
    maxTokens: 600,
    enabled: true,
    lastUsedAt: null,
    totalCalls: 0,
    avgResponseMs: 0,
    lastError: null,
  },
};

// ── Provider labels / colors ──────────────────────────────────────────

export const PROVIDER_META: Record<AIProvider, { label: string; color: string; icon: string }> = {
  anthropic: { label: "Anthropic (Claude)", color: "#d97706", icon: "\u{1F9E0}" },
  openrouter: { label: "OpenRouter", color: "#6366f1", icon: "\u{1F310}" },
  gemini: { label: "Google Gemini", color: "#3b82f6", icon: "\u{2728}" },
  mistral: { label: "Mistral AI", color: "#f97316", icon: "\u{1F525}" },
  kimi: { label: "Kimi (Moonshot AI)", color: "#888888", icon: "\u{1F31F}" },
};

// ── KV helpers ─────────────────────────────────────────────────────────

function configKey(agentId: string): string {
  return `editorial:ai-provider:${agentId}`;
}

export async function getAgentAIConfig(agentId: string): Promise<AIProviderConfig> {
  const stored = await kv.get(configKey(agentId));
  if (stored) return stored as AIProviderConfig;
  return DEFAULT_AGENT_CONFIGS[agentId] || { ...DEFAULT_AGENT_CONFIGS.nico, agentId };
}

export async function setAgentAIConfig(agentId: string, config: Partial<AIProviderConfig>): Promise<AIProviderConfig> {
  const current = await getAgentAIConfig(agentId);
  // Only overwrite fields that are explicitly provided (not undefined)
  const updated: AIProviderConfig = { ...current };
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined) {
      (updated as any)[key] = value;
    }
  }
  updated.agentId = agentId; // ensure agentId is always correct
  await kv.set(configKey(agentId), updated);
  return updated;
}

export async function deleteAgentAIConfig(agentId: string): Promise<void> {
  await kv.del(configKey(agentId));
}

export async function getAllAIConfigs(): Promise<AIProviderConfig[]> {
  const agentIds = ["nico", "sandra", "liana", "den", "mark", "max", "stella"];
  const configs: AIProviderConfig[] = [];
  for (const id of agentIds) {
    configs.push(await getAgentAIConfig(id));
  }
  return configs;
}

// ── Billing / auth error detection ────────────────────────────────────
// Errors that indicate the provider won't work regardless of retries
// (invalid key, no credits, account suspended). These trigger auto-fallback.

class ProviderBillingError extends Error {
  provider: AIProvider;
  constructor(provider: AIProvider, message: string) {
    super(message);
    this.name = "ProviderBillingError";
    this.provider = provider;
  }
}

function isBillingError(err: any): boolean {
  return err instanceof ProviderBillingError ||
    /credit.*(low|balance|insufficient)|billing|payment|quota.*exceeded|account.*suspended/i.test(err?.message || "");
}

// ── Provider API key check ────────────────────────────────────────────

function getProviderKey(provider: AIProvider): string | undefined {
  switch (provider) {
    case "anthropic": return Deno.env.get("ANTHROPIC_API_KEY");
    case "openrouter": return Deno.env.get("OPENROUTER_API_KEY");
    case "gemini": return Deno.env.get("GEMINI_API_KEY");
    case "mistral": return Deno.env.get("MISTRAL_API_KEY");
    case "kimi": return Deno.env.get("KIMI_API_KEY");
  }
}

export function isProviderAvailable(provider: AIProvider): boolean {
  return !!getProviderKey(provider);
}

export function getAvailableProviders(): AIProvider[] {
  return (["anthropic", "openrouter", "gemini", "mistral", "kimi"] as AIProvider[]).filter(isProviderAvailable);
}

// ── Universal AI call ─────────────────────────────────────────────────

export async function callAI(
  agentId: string,
  systemPrompt: string,
  messages: AIMessage[],
  overrideConfig?: Partial<AIProviderConfig>,
): Promise<AICallResult> {
  const config = { ...(await getAgentAIConfig(agentId)), ...overrideConfig };

  if (!config.enabled) {
    return { text: "", provider: config.provider, model: config.model, durationMs: 0, error: "Agent AI disabled" };
  }

  const apiKey = getProviderKey(config.provider);
  if (!apiKey) {
    // Fallback chain: try other available providers
    return tryFallbackProvider(agentId, config.provider, systemPrompt, messages, config.temperature, config.maxTokens, `${config.provider} key missing`);
  }

  // Try primary provider
  const result = await callProviderAPI(config.provider, config.model, apiKey, systemPrompt, messages, config.temperature, config.maxTokens, agentId, config.mistralAgentId);

  // If primary succeeded → return
  if (result.text && !result.error) return result;

  // Primary failed — try auto-fallback
  if (result.error) {
    console.warn(`[AI] ${agentId}: ${config.provider}/${config.model} failed: ${result.error}`);

    // Step 1: Try same provider with a safer model (e.g. gemini-2.5-pro → gemini-2.0-flash)
    const sameProviderFallback = getSameProviderFallbackModel(config.provider, config.model);
    if (sameProviderFallback) {
      console.log(`[AI] ${agentId}: trying same-provider fallback → ${config.provider}/${sameProviderFallback}`);
      const spResult = await callProviderAPI(config.provider, sameProviderFallback, apiKey, systemPrompt, messages, config.temperature, config.maxTokens, agentId);
      if (spResult.text && !spResult.error) {
        console.log(`[AI] ${agentId}: same-provider fallback OK via ${config.provider}/${sameProviderFallback} in ${spResult.durationMs}ms`);
        return spResult;
      }
      console.warn(`[AI] ${agentId}: same-provider fallback also failed: ${spResult.error}`);
    }

    // Step 2: Try different provider entirely
    const fallbackResult = await tryFallbackProvider(agentId, config.provider, systemPrompt, messages, config.temperature, config.maxTokens, result.error);
    if (fallbackResult.text) {
      console.log(`[AI] ${agentId}: cross-provider fallback OK via ${fallbackResult.provider}/${fallbackResult.model}`);
      return fallbackResult;
    }

    return { ...result, error: `${result.error} | Fallback chain exhausted: ${fallbackResult.error}` };
  }

  return result;
}

// ── Same-provider fallback model ──────────────────────────────────────

function getSameProviderFallbackModel(provider: AIProvider, failedModel: string): string | null {
  const fallbackMap: Record<string, string[]> = {
    // gemini: try 2.0-flash if any 2.5 model fails
    "gemini-2.5-pro": ["gemini-2.0-flash"],
    "gemini-2.5-flash": ["gemini-2.0-flash"],
    // anthropic: try haiku if sonnet fails
    "claude-sonnet-4-6-20260210": ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
    "claude-sonnet-4-20250514": ["claude-3-5-haiku-20241022"],
    // mistral: try small if large fails
    "mistral-large-latest": ["mistral-small-latest"],
  };

  const candidates = fallbackMap[failedModel];
  if (!candidates) return null;
  return candidates.find(m => m !== failedModel) || null;
}

// ── Fallback provider selection ───────────────────────────────────────

async function tryFallbackProvider(
  agentId: string,
  failedProvider: AIProvider,
  systemPrompt: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens: number,
  reason: string,
): Promise<AICallResult> {
  // Preferred fallback order: gemini first (most reliable + Pro plan), then mistral, then others
  const preferredOrder: AIProvider[] = ["gemini", "mistral", "openrouter", "anthropic", "kimi"];
  const available = preferredOrder.filter(p => p !== failedProvider && isProviderAvailable(p));

  if (available.length === 0) {
    return { text: "", provider: failedProvider, model: "none", durationMs: 0, error: `${reason} — no fallback providers available` };
  }

  const fallbackProvider = available[0];
  const fallbackKey = getProviderKey(fallbackProvider)!;
  const fallbackModels = AVAILABLE_MODELS[fallbackProvider].filter(m => m.id !== "mistral-agent");
  const fallbackModel = fallbackModels[0]?.id || AVAILABLE_MODELS[fallbackProvider][0].id;

  console.log(`[AI] ${agentId}: falling back ${failedProvider} → ${fallbackProvider}/${fallbackModel} (reason: ${reason})`);
  return callProviderAPI(fallbackProvider, fallbackModel, fallbackKey, systemPrompt, messages, temperature, maxTokens, agentId);
}

async function callProviderAPI(
  provider: AIProvider,
  model: string,
  apiKey: string,
  systemPrompt: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens: number,
  agentId: string,
  mistralAgentId?: string,
): Promise<AICallResult> {
  const start = Date.now();

  try {
    let text = "";

    switch (provider) {
      case "anthropic":
        text = await callAnthropic(apiKey, model, systemPrompt, messages, temperature, maxTokens);
        break;
      case "openrouter":
        text = await callOpenRouter(apiKey, model, systemPrompt, messages, temperature, maxTokens);
        break;
      case "gemini":
        text = await callGemini(apiKey, model, systemPrompt, messages, temperature, maxTokens);
        break;
      case "mistral":
        // If model is "mistral-agent" and mistralAgentId is set → use Agents API
        if (model === "mistral-agent" && mistralAgentId) {
          text = await callMistralAgent(apiKey, mistralAgentId, systemPrompt, messages, maxTokens);
        } else {
          text = await callMistral(apiKey, model, systemPrompt, messages, temperature, maxTokens);
        }
        break;
      case "kimi":
        text = await callKimi(apiKey, model, systemPrompt, messages, maxTokens);
        break;
    }

    const durationMs = Date.now() - start;

    // Update stats
    const config = await getAgentAIConfig(agentId);
    config.lastUsedAt = new Date().toISOString();
    config.totalCalls = (config.totalCalls || 0) + 1;
    config.avgResponseMs = config.totalCalls === 1
      ? durationMs
      : Math.round((config.avgResponseMs * (config.totalCalls - 1) + durationMs) / config.totalCalls);
    config.lastError = null;
    await kv.set(configKey(agentId), config);

    return { text, provider, model, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const errorMsg = err?.message || String(err);
    console.error(`[AI] ${provider}/${model} error for ${agentId}:`, errorMsg);

    // Save error to config
    try {
      const config = await getAgentAIConfig(agentId);
      config.lastError = errorMsg;
      await kv.set(configKey(agentId), config);
    } catch {}

    return { text: "", provider, model, durationMs, error: errorMsg };
  }
}

// ── Anthropic (Claude) ────────────────────────────────────────────────

async function callAnthropic(
  apiKey: string, model: string, systemPrompt: string,
  messages: AIMessage[], temperature: number, maxTokens: number,
): Promise<string> {
  const claudeMessages = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const ctrl = new AbortController();
  const tmout = setTimeout(() => ctrl.abort(), 45000); // Claude can take longer for complex tasks

  console.log(`[Anthropic] Calling model ${model}`);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2024-10-22",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: claudeMessages,
    }),
    signal: ctrl.signal,
  });
  clearTimeout(tmout);

  if (!resp.ok) {
    const errText = await resp.text();
    if (resp.status === 401) {
      console.error(`[Anthropic] Authentication failed (401). ANTHROPIC_API_KEY is likely invalid.`);
      throw new ProviderBillingError("anthropic", `Anthropic 401: API key invalid. Please check ANTHROPIC_API_KEY secret.`);
    }
    // Credit balance too low — can come as 400 or 403
    if (errText.includes("credit balance") || errText.includes("billing") || errText.includes("purchase credits")) {
      console.error(`[Anthropic] Billing error (${resp.status}): credit balance too low.`);
      throw new ProviderBillingError("anthropic", `Anthropic billing: Credit balance too low. Please top up at Plans & Billing.`);
    }
    if (resp.status === 404) {
      console.error(`[Anthropic] Model not found (404): ${model}`);
      throw new Error(`Anthropic 404: Model "${model}" not found. Check model ID.`);
    }
    if (resp.status === 429) {
      throw new Error(`Anthropic 429: Rate limit exceeded. Try again later.`);
    }
    if (resp.status === 529) {
      throw new Error(`Anthropic 529: API overloaded. Try again later.`);
    }
    throw new Error(`Anthropic ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data.content?.[0]?.text || "";
}

// ── OpenRouter ────────────────────────────────────────────────────────

async function callOpenRouter(
  apiKey: string, model: string, systemPrompt: string,
  messages: AIMessage[], temperature: number, maxTokens: number,
): Promise<string> {
  const orMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const ctrl = new AbortController();
  const tmout = setTimeout(() => ctrl.abort(), 30000);

  console.log(`[OpenRouter] Calling model ${model}`);

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://soulfm.hub",
      "X-Title": "Soul FM Hub Editorial",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: orMessages,
    }),
    signal: ctrl.signal,
  });
  clearTimeout(tmout);

  if (!resp.ok) {
    const errText = await resp.text();
    if (resp.status === 401) {
      console.error(`[OpenRouter] Authentication failed (401). OPENROUTER_API_KEY is likely invalid.`);
      throw new Error(`OpenRouter 401: API key invalid. Please check OPENROUTER_API_KEY secret.`);
    }
    if (resp.status === 402) {
      console.error(`[OpenRouter] Insufficient credits (402).`);
      throw new Error(`OpenRouter 402: Insufficient credits. Top up your OpenRouter account.`);
    }
    if (resp.status === 429) {
      throw new Error(`OpenRouter 429: Rate limit exceeded. Try again later.`);
    }
    throw new Error(`OpenRouter ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();

  // OpenRouter may return an error in the response body even with 200 status
  if (data.error) {
    console.error(`[OpenRouter] API error in response:`, data.error);
    throw new Error(`OpenRouter error: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error).slice(0, 200)}`);
  }

  return data.choices?.[0]?.message?.content || "";
}

// ── Google Gemini ─────────────────────────────────────────────────────

async function callGemini(
  apiKey: string, model: string, systemPrompt: string,
  messages: AIMessage[], temperature: number, maxTokens: number,
): Promise<string> {
  // Gemini API uses a different message format
  // Filter out system messages — Gemini uses systemInstruction instead
  const filteredMessages = messages.filter(m => m.role !== "system");

  // Build contents array — ensure alternating user/model turns
  // Gemini requires the conversation to start with "user" and alternate
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of filteredMessages) {
    const role = m.role === "assistant" ? "model" : "user";
    // Merge consecutive same-role messages
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts.push({ text: m.content });
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }

  // Ensure conversation starts with user
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Начни." }] });
  } else if (contents[0].role !== "user") {
    contents.unshift({ role: "user", parts: [{ text: "Начинаем." }] });
  }

  const ctrl = new AbortController();
  const is25Pro = model.includes("2.5-pro");
  const tmout = setTimeout(() => ctrl.abort(), is25Pro ? 60000 : 45000); // 2.5 Pro has thinking phase

  console.log(`[Gemini] Calling model ${model}${is25Pro ? ' (Pro — extended timeout 60s)' : ''}`);

  const requestBody: any = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
    // Safety settings — lower thresholds to avoid false-positive blocks
    // (our content is radio station planning, not harmful)
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: ctrl.signal,
    },
  );
  clearTimeout(tmout);

  if (!resp.ok) {
    const errText = await resp.text();
    // Parse Gemini-specific errors for better messages
    try {
      const errJson = JSON.parse(errText);
      const errMsg = errJson.error?.message || errText.slice(0, 200);
      const errCode = errJson.error?.code || resp.status;
      if (errCode === 429) throw new Error(`Gemini rate limit: ${errMsg}`);
      if (errCode === 404) throw new Error(`Gemini model not found (${model}): ${errMsg}`);
      throw new Error(`Gemini ${errCode}: ${errMsg}`);
    } catch (parseErr: any) {
      if (parseErr.message.startsWith("Gemini")) throw parseErr;
      throw new Error(`Gemini ${resp.status}: ${errText.slice(0, 200)}`);
    }
  }

  const data = await resp.json();

  // Handle safety blocking
  if (data.candidates?.[0]?.finishReason === "SAFETY") {
    const blockedCategories = data.candidates[0]?.safetyRatings
      ?.filter((r: any) => r.blocked)
      ?.map((r: any) => r.category)
      ?.join(", ") || "unknown";
    console.warn(`[Gemini] Response blocked by safety filter: ${blockedCategories}`);
    throw new Error(`Gemini safety filter blocked response (${blockedCategories})`);
  }

  // Handle empty response
  if (!data.candidates?.length) {
    const blockReason = data.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Gemini prompt blocked: ${blockReason}`);
    }
    throw new Error("Gemini returned empty response (no candidates)");
  }

  // Extract text from response parts.
  // Gemini 2.5 Pro (thinking models) return parts with { thought: true, text: "..." }
  // for internal reasoning, followed by the actual response parts.
  // We must skip thought parts and concatenate only the real response.
  const parts = data.candidates[0]?.content?.parts || [];
  const responseParts = parts.filter((p: any) => !p.thought);
  const text = responseParts.map((p: any) => p.text || "").join("").trim();

  if (!text) {
    const thoughtParts = parts.filter((p: any) => p.thought);
    if (thoughtParts.length > 0 && responseParts.length === 0) {
      // Model returned only thinking, no actual response — treat as empty
      console.warn(`[Gemini] ${model}: got ${thoughtParts.length} thought parts but no response text. finishReason: ${data.candidates[0]?.finishReason}`);
      // Return thinking as a last resort rather than empty
      return thoughtParts.map((p: any) => p.text || "").join("").trim() || "";
    }
    if (data.candidates[0]?.finishReason) {
      console.warn(`[Gemini] Empty text, finishReason: ${data.candidates[0].finishReason}`);
    }
  }

  if (parts.some((p: any) => p.thought)) {
    console.log(`[Gemini] ${model}: ${parts.filter((p: any) => p.thought).length} thinking parts, ${responseParts.length} response parts`);
  }

  return text;
}

// ── Mistral ───────────────────────────────────────────────────────────

async function callMistral(
  apiKey: string, model: string, systemPrompt: string,
  messages: AIMessage[], temperature: number, maxTokens: number,
): Promise<string> {
  const mistralMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const ctrl = new AbortController();
  const tmout = setTimeout(() => ctrl.abort(), 30000);

  const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: mistralMessages,
    }),
    signal: ctrl.signal,
  });
  clearTimeout(tmout);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Mistral ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Mistral Agent ─────────────────────────────────────────────────────

async function callMistralAgent(
  apiKey: string, mistralAgentId: string, systemPrompt: string,
  messages: AIMessage[], maxTokens: number,
): Promise<string> {
  // Mistral Agents API (/v1/agents/completions) does NOT support "system" role.
  // Valid roles: "user", "assistant", "tool".
  // The agent's core instructions are baked into its config on the Mistral platform.
  // We prepend our task-specific system prompt as context to the first user message.
  const processedMessages: Array<{ role: string; content: string }> = [];
  let systemPrepended = false;

  for (const m of messages) {
    if (m.role === "system") {
      // Skip system messages — we'll prepend to first user message
      continue;
    }
    if (m.role === "user" && !systemPrepended) {
      // Prepend system prompt as context to the first user message
      processedMessages.push({
        role: "user",
        content: `[Контекст задачи]: ${systemPrompt}\n\n---\n\n${m.content}`,
      });
      systemPrepended = true;
    } else {
      processedMessages.push({ role: m.role, content: m.content });
    }
  }

  // If no user message was found (unlikely), add system prompt as user message
  if (!systemPrepended && systemPrompt) {
    processedMessages.unshift({ role: "user", content: `[Контекст задачи]: ${systemPrompt}` });
  }

  // Ensure messages is not empty
  if (processedMessages.length === 0) {
    processedMessages.push({ role: "user", content: "Привет, представься." });
  }

  const ctrl = new AbortController();
  const tmout = setTimeout(() => ctrl.abort(), 45000); // Agents may take longer

  console.log(`[MistralAgent] Calling agent ${mistralAgentId}, ${processedMessages.length} messages (system prompt prepended to first user msg)`);

  const resp = await fetch("https://api.mistral.ai/v1/agents/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      agent_id: mistralAgentId,
      max_tokens: maxTokens,
      messages: processedMessages,
    }),
    signal: ctrl.signal,
  });
  clearTimeout(tmout);

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[MistralAgent] Error ${resp.status} for agent ${mistralAgentId}:`, errText.slice(0, 500));
    throw new Error(`Mistral Agent ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  console.log(`[MistralAgent] Response from agent ${mistralAgentId}, usage: ${JSON.stringify(data.usage || {})}`);
  return data.choices?.[0]?.message?.content || "";
}

// ── Kimi (Moonshot AI) ────────────────────────────────────────────────

async function callKimi(
  apiKey: string, model: string, systemPrompt: string,
  messages: AIMessage[], maxTokens: number,
): Promise<string> {
  const kimiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const ctrl = new AbortController();
  const tmout = setTimeout(() => ctrl.abort(), 30000);

  // Kimi K2 uses a different endpoint (api.kimi.ai) while moonshot-v1-* uses api.moonshot.cn
  const isKimiK2 = model.startsWith("kimi-");
  const endpoint = isKimiK2
    ? "https://api.moonshot.cn/v1/chat/completions"
    : "https://api.moonshot.cn/v1/chat/completions";

  console.log(`[Kimi] Calling model ${model} at ${endpoint}`);

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.7, // Kimi supports temperature
      messages: kimiMessages,
    }),
    signal: ctrl.signal,
  });
  clearTimeout(tmout);

  if (!resp.ok) {
    const errText = await resp.text();
    // Provide actionable error messages
    if (resp.status === 401) {
      console.error(`[Kimi] Authentication failed (401). KIMI_API_KEY is likely invalid or expired.`);
      throw new Error(`Kimi 401: API key invalid or expired. Please check KIMI_API_KEY secret.`);
    }
    if (resp.status === 404) {
      console.error(`[Kimi] Model not found (404): ${model}`);
      throw new Error(`Kimi 404: Model "${model}" not found. Try moonshot-v1-32k or moonshot-v1-8k.`);
    }
    throw new Error(`Kimi ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── CRUD Routes ───────────────────────────────────────────────────────

export function setupAIProviderRoutes(app: Hono, requireAuth: any) {
  const PREFIX = "/make-server-06086aa3/editorial/ai-providers";

  // GET /ai-providers — list all agent configs + available providers info
  app.get(PREFIX, requireAuth, async (c) => {
    try {
      const configs = await getAllAIConfigs();
      const available = getAvailableProviders();
      const providerStatus: Record<string, boolean> = {};
      for (const p of ["anthropic", "openrouter", "gemini", "mistral", "kimi"] as AIProvider[]) {
        providerStatus[p] = isProviderAvailable(p);
      }
      return c.json({
        configs,
        availableProviders: available,
        providerStatus,
        models: AVAILABLE_MODELS,
        providerMeta: PROVIDER_META,
      });
    } catch (e: any) {
      return c.json({ error: `Get AI providers error: ${e.message}` }, 500);
    }
  });

  // GET /ai-providers/diagnose — detailed diagnostics for all providers
  // NOTE: Must be defined BEFORE /:agentId to avoid being caught by the param route
  app.get(`${PREFIX}/diagnose`, requireAuth, async (c) => {
    try {
      const diagResults: Record<string, any> = {};
      const providers: AIProvider[] = ["anthropic", "openrouter", "gemini", "mistral", "kimi"];

      for (const provider of providers) {
        const key = getProviderKey(provider);
        diagResults[provider] = {
          keySet: !!key,
          keyLength: key ? key.length : 0,
          keyPrefix: key ? key.slice(0, 8) + "..." : null,
        };
      }

      // Check each agent's config status
      const agentIds = ["nico", "sandra", "liana", "den", "mark", "max", "stella"];
      const agentDiag: Record<string, any> = {};
      for (const id of agentIds) {
        const cfg = await getAgentAIConfig(id);
        const isFromKV = !!(await kv.get(configKey(id)));
        agentDiag[id] = {
          provider: cfg.provider,
          model: cfg.model,
          enabled: cfg.enabled,
          source: isFromKV ? "kv" : "default",
          mistralAgentId: cfg.mistralAgentId || null,
          lastError: cfg.lastError,
          totalCalls: cfg.totalCalls,
          lastUsedAt: cfg.lastUsedAt,
        };
      }

      return c.json({
        providers: diagResults,
        agents: agentDiag,
        availableProviders: getAvailableProviders(),
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      return c.json({ error: `Diagnose error: ${e.message}` }, 500);
    }
  });

  // GET /ai-providers/:agentId — get specific agent config
  app.get(`${PREFIX}/:agentId`, requireAuth, async (c) => {
    try {
      const agentId = c.req.param("agentId");
      const config = await getAgentAIConfig(agentId);
      return c.json({ config });
    } catch (e: any) {
      return c.json({ error: `Get AI config error: ${e.message}` }, 500);
    }
  });

  // PUT /ai-providers/:agentId — update agent's AI config
  app.put(`${PREFIX}/:agentId`, requireAuth, async (c) => {
    try {
      const agentId = c.req.param("agentId");
      const body = await c.req.json();

      // Validate provider
      const validProviders: AIProvider[] = ["anthropic", "openrouter", "gemini", "mistral", "kimi"];
      if (body.provider && !validProviders.includes(body.provider)) {
        return c.json({ error: `Invalid provider: ${body.provider}` }, 400);
      }

      // Validate model belongs to provider
      if (body.provider && body.model) {
        const providerModels = AVAILABLE_MODELS[body.provider as AIProvider];
        if (!providerModels.some(m => m.id === body.model)) {
          return c.json({ error: `Model ${body.model} not available for ${body.provider}` }, 400);
        }
      }

      // Validate mistralAgentId when model is mistral-agent
      if (body.model === "mistral-agent" && body.provider === "mistral" && !body.mistralAgentId) {
        // Check if existing config already has an agentId
        const existing = await getAgentAIConfig(agentId);
        if (!existing.mistralAgentId) {
          return c.json({ error: "mistralAgentId is required when using Mistral Agent model" }, 400);
        }
      }

      const updated = await setAgentAIConfig(agentId, {
        provider: body.provider,
        model: body.model,
        temperature: body.temperature !== undefined ? Math.max(0, Math.min(2, body.temperature)) : undefined,
        maxTokens: body.maxTokens !== undefined ? Math.max(100, Math.min(4096, body.maxTokens)) : undefined,
        enabled: body.enabled,
        mistralAgentId: body.mistralAgentId !== undefined ? (body.mistralAgentId || undefined) : undefined,
      });

      console.log(`[AI] Updated config for ${agentId}: ${updated.provider}/${updated.model}${updated.mistralAgentId ? ` (agent: ${updated.mistralAgentId})` : ''}`);
      return c.json({ config: updated });
    } catch (e: any) {
      return c.json({ error: `Update AI config error: ${e.message}` }, 500);
    }
  });

  // DELETE /ai-providers/:agentId — reset to default
  app.delete(`${PREFIX}/:agentId`, requireAuth, async (c) => {
    try {
      const agentId = c.req.param("agentId");
      await deleteAgentAIConfig(agentId);
      const defaultConfig = DEFAULT_AGENT_CONFIGS[agentId] || DEFAULT_AGENT_CONFIGS.nico;
      return c.json({ config: { ...defaultConfig, agentId }, reset: true });
    } catch (e: any) {
      return c.json({ error: `Reset AI config error: ${e.message}` }, 500);
    }
  });

  // POST /ai-providers/reset-all — reset all to defaults
  app.post(`${PREFIX}/reset-all`, requireAuth, async (c) => {
    try {
      const agentIds = ["nico", "sandra", "liana", "den", "mark", "max", "stella"];
      for (const id of agentIds) {
        await deleteAgentAIConfig(id);
      }
      const configs = await getAllAIConfigs();
      return c.json({ configs, reset: true });
    } catch (e: any) {
      return c.json({ error: `Reset all AI configs error: ${e.message}` }, 500);
    }
  });

  // POST /ai-providers/:agentId/test — test agent's AI provider
  app.post(`${PREFIX}/:agentId/test`, requireAuth, async (c) => {
    try {
      const agentId = c.req.param("agentId");
      const config = await getAgentAIConfig(agentId);
      console.log(`[AI Test] Testing ${agentId}: ${config.provider}/${config.model}`);

      const result = await callAI(
        agentId,
        `You are a radio station team member. Respond in 1-2 sentences in Russian.`,
        [{ role: "user", content: "Привет! Представься кратко." }],
      );

      if (result.error) {
        console.error(`[AI Test] ${agentId} failed: ${result.error}`);
        return c.json({ success: false, error: result.error, provider: result.provider, model: result.model });
      }

      console.log(`[AI Test] ${agentId} OK: ${result.provider}/${result.model} in ${result.durationMs}ms`);
      return c.json({
        success: true,
        response: result.text,
        provider: result.provider,
        model: result.model,
        durationMs: result.durationMs,
      });
    } catch (e: any) {
      console.error(`[AI Test] Exception:`, e?.message);
      return c.json({ error: `Test AI error: ${e.message}` }, 500);
    }
  });

}