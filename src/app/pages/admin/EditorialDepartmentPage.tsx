import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, RefreshCw, Send, Sparkles, MessageSquare,
  ChevronDown, ChevronUp, Settings, Trash2, BarChart3,
  Brain, RotateCcw, FlaskConical, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';

// Team member photos
const TEAM_PHOTOS: Record<string, string> = {
  sandra: '/assets/team/sandra.svg',
  liana: '/assets/team/liana.svg',
  den: '/assets/team/den.svg',
  nico: '/assets/team/nico.svg',
  mark: '/assets/team/mark.svg',
  max: '/assets/team/max.svg',
  stella: '/assets/team/stella.svg',
};

const AGENTS = [
  { id: 'nico', name: 'Nico Steel', role: 'Программный Директор', photo: TEAM_PHOTOS.nico, color: '#94a3b8', emoji: '🎬', area: 'Координация, стратегия, анализ эфира' },
  { id: 'sandra', name: 'Sandra Ray', role: 'Певица / Вокалистка', photo: TEAM_PHOTOS.sandra, color: '#ff69b4', emoji: '🎤', area: 'Вокал, джинглы, промо, утреннее шоу' },
  { id: 'liana', name: 'Liana Nova', role: 'Ведущая / Диктор', photo: TEAM_PHOTOS.liana, color: '#ff6b35', emoji: '📻', area: 'Live-шоу, интервью, интерактив' },
  { id: 'den', name: 'Den Cipher', role: 'DJ / Муз. Директор', photo: TEAM_PHOTOS.den, color: '#00d9ff', emoji: '🎧', area: 'Миксы, плейлисты, музыкальный вектор' },
  { id: 'mark', name: 'Mark Volt', role: 'Новости / Маркетинг', photo: TEAM_PHOTOS.mark, color: '#3b82f6', emoji: '📰', area: 'Контент, промо, аналитика, рост' },
  { id: 'max', name: 'Max Sterling', role: 'Звукоинженер', photo: TEAM_PHOTOS.max, color: '#a855f7', emoji: '🔊', area: 'Сведение, мастеринг, новинки для ротации' },
  { id: 'stella', name: 'Stella Vox', role: 'Редактор новостей', photo: TEAM_PHOTOS.stella, color: '#ec4899', emoji: '✍️', area: 'Скрипты, новости, интервью, рубрики' },
];

const TEAM_AGENTS = AGENTS.filter(a => a.id !== 'nico');
const NICO = AGENTS[0];

export function EditorialDepartmentPage() {
  const [loading, setLoading] = useState(true);
  const [agentChats, setAgentChats] = useState<Record<string, any[]>>({});
  const [agentInputs, setAgentInputs] = useState<Record<string, string>>({});
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [compilingAnalysis, setCompilingAnalysis] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings state
  const [telegram, setTelegram] = useState<any>(null);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);

  // AI Providers state
  const [aiProviders, setAiProviders] = useState<any>(null);
  const [aiConfigs, setAiConfigs] = useState<Record<string, any>>({});
  const [editingAI, setEditingAI] = useState<string | null>(null);
  const [savingAI, setSavingAI] = useState<string | null>(null);
  const [testingAI, setTestingAI] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);

  const nicoChatEndRef = useRef<HTMLDivElement>(null);
  const agentChatRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all agent chat histories + latest analysis + telegram config + AI providers
      const [analysisRes, tgRes, aiRes, ...chatResults] = await Promise.all([
        api.getLatestAnalysis(),
        api.getTelegramConfig(),
        api.getAIProviders(),
        ...AGENTS.map(a => api.getAgentChatHistory(a.id)),
      ]);

      if (analysisRes.analysis) setAnalysis(analysisRes.analysis);
      if (tgRes.telegram) {
        setTelegram(tgRes.telegram);
        setTelegramChatId(tgRes.telegram.chatId || '');
      }
      if (aiRes && !aiRes.error) {
        setAiProviders(aiRes);
        const configMap: Record<string, any> = {};
        (aiRes.configs || []).forEach((c: any) => { configMap[c.agentId] = c; });
        setAiConfigs(configMap);
      } else if (aiRes?.error) {
        console.error('[Editorial] AI providers load error:', aiRes.error);
      }

      const chats: Record<string, any[]> = {};
      AGENTS.forEach((a, i) => {
        chats[a.id] = chatResults[i]?.messages || [];
      });
      setAgentChats(chats);
    } catch (err) {
      console.error('Load editorial data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-scroll chats
  useEffect(() => {
    if (nicoChatEndRef.current) {
      nicoChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentChats.nico]);

  useEffect(() => {
    if (expandedAgent && agentChatRefs.current[expandedAgent]) {
      agentChatRefs.current[expandedAgent]?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [expandedAgent, agentChats]);

  const handleSendMessage = async (agentId: string) => {
    const message = agentInputs[agentId]?.trim();
    if (!message) return;

    setSendingTo(agentId);
    setAgentInputs(prev => ({ ...prev, [agentId]: '' }));

    // Optimistic: show user message immediately
    const tempUserMsg = { id: `temp_${Date.now()}`, role: 'user', text: message, timestamp: new Date().toISOString() };
    setAgentChats(prev => ({ ...prev, [agentId]: [...(prev[agentId] || []), tempUserMsg] }));

    try {
      const res = await api.sendAgentChat(agentId, message);
      if (res.error) {
        toast.error(res.error);
      } else {
        // Replace optimistic message with real ones
        setAgentChats(prev => {
          const filtered = (prev[agentId] || []).filter(m => m.id !== tempUserMsg.id);
          return { ...prev, [agentId]: [...filtered, res.userMessage, res.agentResponse] };
        });
      }
    } catch (err: any) {
      toast.error('Ошибка: ' + err.message);
    } finally {
      setSendingTo(null);
    }
  };

  const handleCompileAnalysis = async () => {
    setCompilingAnalysis(true);
    try {
      const res = await api.compileAnalysis();
      if (res.error) {
        toast.error(res.error);
      } else {
        setAnalysis(res.analysis);
        toast.success('Общий анализ скомпилирован!');
      }
    } catch (err: any) {
      toast.error('Ошибка: ' + err.message);
    } finally {
      setCompilingAnalysis(false);
    }
  };

  const handleClearChats = async () => {
    if (!confirm('Очистить все чаты агентов?')) return;
    try {
      await api.clearAgentChats();
      setAgentChats({});
      toast.success('Чаты очищены');
    } catch { toast.error('Ошибка'); }
  };

  const handleSaveTelegram = async () => {
    setTelegramSaving(true);
    try {
      const res = await api.saveTelegramConfig({
        chatId: telegramChatId,
        enabled: telegram?.enabled ?? false,
        sendOnComplete: telegram?.sendOnComplete ?? false,
        sendOnApprove: telegram?.sendOnApprove ?? true,
      });
      if (res.telegram) { setTelegram(res.telegram); toast.success('Сохранено'); }
    } catch { toast.error('Ошибка'); }
    finally { setTelegramSaving(false); }
  };

  const handleTestTelegram = async () => {
    setTelegramTesting(true);
    try {
      const res = await api.testTelegram();
      if (res.success) toast.success('Тест отправлен!');
      else toast.error(res.error || 'Ошибка');
    } catch (err: any) { toast.error(err.message); }
    finally { setTelegramTesting(false); }
  };

  // ── AI Provider handlers ──────────────────────────────────────────
  const handleSaveAIConfig = async (agentId: string, updates: any) => {
    setSavingAI(agentId);
    try {
      const res = await api.updateAgentAIConfig(agentId, updates);
      if (res.config) {
        setAiConfigs(prev => ({ ...prev, [agentId]: res.config }));
        toast.success(`AI конфиг ${agentId} обновлён`);
        setEditingAI(null);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingAI(null); }
  };

  const handleTestAI = async (agentId: string) => {
    setTestingAI(agentId);
    try {
      const res = await api.testAgentAI(agentId);
      if (res.success) {
        toast.success(`${agentId}: ${res.provider}/${res.model} — ${res.durationMs}ms`);
      } else {
        toast.error(res.error || 'Ошибка теста');
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setTestingAI(null); }
  };

  const handleResetAI = async (agentId: string) => {
    try {
      const res = await api.resetAgentAIConfig(agentId);
      if (res.config) {
        setAiConfigs(prev => ({ ...prev, [agentId]: res.config }));
        toast.success(`${agentId} сброшен к дефолту`);
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const handleResetAllAI = async () => {
    if (!confirm('Сбросить все AI-конфигурации к дефолтам?')) return;
    try {
      const res = await api.resetAllAIConfigs();
      if (res.configs) {
        const configMap: Record<string, any> = {};
        res.configs.forEach((c: any) => { configMap[c.agentId] = c; });
        setAiConfigs(configMap);
        toast.success('Все AI-конфигурации сброшены');
      }
    } catch (err: any) { toast.error(err.message); }
  };

  // Provider label / color helpers
  const PROVIDER_COLORS: Record<string, string> = {
    anthropic: '#d97706',
    openrouter: '#6366f1',
    gemini: '#3b82f6',
    mistral: '#f97316',
    kimi: '#888888',
  };
  const PROVIDER_LABELS: Record<string, string> = {
    anthropic: 'Claude',
    openrouter: 'OpenRouter',
    gemini: 'Gemini',
    mistral: 'Mistral',
    kimi: 'Kimi',
  };
  const PROVIDER_ICONS: Record<string, string> = {
    anthropic: '🧠',
    openrouter: '🌐',
    gemini: '✨',
    mistral: '🔥',
    kimi: '🌟',
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="size-10 animate-spin text-[#00d9ff] mx-auto mb-4" />
            <p className="text-white/60 text-sm">Загрузка Эфирного Отдела...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const nicoMessages = agentChats.nico || [];

  return (
    <AdminLayout maxWidth="wide">
      {/* ── Header ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20">
                <Sparkles className="size-6 sm:size-7 text-[#00ffaa]" />
              </div>
              <span className="bg-gradient-to-r from-[#00d9ff] via-[#00ffaa] to-[#00d9ff] bg-clip-text text-transparent">
                Эфирный Отдел
              </span>
            </h1>
            <p className="text-white/40 text-xs mt-1 ml-[52px]">
              AI-координатор Nico + команда Soul FM — индивидуальные чаты и общий анализ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAIPanel(!showAIPanel); setShowSettings(false); }}
              className={`p-2 rounded-lg transition-colors ${showAIPanel ? 'bg-[#6366f1]/20 text-[#6366f1]' : 'bg-white/5 hover:bg-white/10'}`}
              title="AI Providers"
            >
              <Brain className="size-4" />
            </button>
            <button
              onClick={() => { setShowSettings(!showSettings); setShowAIPanel(false); }}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-[#00d9ff]/20 text-[#00d9ff]' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <Settings className="size-4" />
            </button>
            <button onClick={handleClearChats} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-red-400">
              <Trash2 className="size-4" />
            </button>
            <button onClick={loadData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Settings Panel (collapsible) ─────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-[#141414] rounded-2xl border border-white/5 p-4 space-y-4">
              <h3 className="text-sm font-bold text-white/70 flex items-center gap-2">
                <Send className="size-4 text-[#00d9ff]" /> Telegram
                {telegram?.enabled && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#00d9ff]/15 text-[#00d9ff]">ON</span>}
              </h3>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Chat ID: -100xxxxxxxxxx"
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#00d9ff]/50"
                />
                <button onClick={handleSaveTelegram} disabled={telegramSaving}
                  className="px-3 py-2 rounded-lg bg-[#00d9ff]/15 text-[#00d9ff] text-[11px] font-bold hover:bg-[#00d9ff]/25 disabled:opacity-50">
                  {telegramSaving ? <Loader2 className="size-3 animate-spin" /> : 'Сохранить'}
                </button>
                <button onClick={handleTestTelegram} disabled={telegramTesting || !telegramChatId}
                  className="px-3 py-2 rounded-lg bg-[#00ffaa]/15 text-[#00ffaa] text-[11px] font-bold hover:bg-[#00ffaa]/25 disabled:opacity-50">
                  {telegramTesting ? <Loader2 className="size-3 animate-spin" /> : 'Тест'}
                </button>
              </div>
              {telegram?.messagesSent > 0 && (
                <div className="text-[10px] text-white/30">
                  Отправлено: {telegram.messagesSent} · Последнее: {telegram.lastSentAt ? new Date(telegram.lastSentAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Providers Panel (collapsible) ──────────────────── */}
      <AnimatePresence>
        {showAIPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-[#141414] rounded-2xl border border-white/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white/70 flex items-center gap-2">
                  <Brain className="size-4 text-[#6366f1]" />
                  AI-Движки Агентов
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-[#6366f1]/15 text-[#6366f1]">MULTI-PROVIDER</span>
                </h3>
                <div className="flex items-center gap-2">
                  {/* Provider availability indicators */}
                  {(['anthropic', 'openrouter', 'gemini', 'mistral', 'kimi'] as const).map(p => (
                    <span
                      key={p}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        aiProviders?.providerStatus?.[p]
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                      title={`${PROVIDER_LABELS[p]}: ${aiProviders?.providerStatus?.[p] ? 'API Key set' : 'No API Key'}`}
                    >
                      {PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}
                    </span>
                  ))}
                  <button
                    onClick={handleResetAllAI}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/30 hover:text-white/60"
                    title="Сбросить все к дефолтам"
                  >
                    <RotateCcw className="size-3" />
                  </button>
                </div>
              </div>

              {/* Agent AI config cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {AGENTS.map(agent => {
                  const config = aiConfigs[agent.id];
                  const isEditing = editingAI === agent.id;
                  const providerColor = PROVIDER_COLORS[config?.provider] || '#666';

                  return (
                    <div
                      key={agent.id}
                      className="p-3 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-all"
                      style={{ borderColor: isEditing ? `${providerColor}40` : undefined }}
                    >
                      {/* Agent header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={agent.photo} alt={agent.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold" style={{ color: agent.color }}>
                            {agent.name.split(' ')[0]}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-[7px] font-bold"
                              style={{ backgroundColor: `${providerColor}20`, color: providerColor }}
                            >
                              {PROVIDER_ICONS[config?.provider]} {PROVIDER_LABELS[config?.provider] || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleTestAI(agent.id)}
                            disabled={testingAI === agent.id}
                            className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-[#00ffaa]"
                            title="Тест"
                          >
                            {testingAI === agent.id ? <Loader2 className="size-3 animate-spin" /> : <FlaskConical className="size-3" />}
                          </button>
                          <button
                            onClick={() => setEditingAI(isEditing ? null : agent.id)}
                            className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white/60"
                            title="Настройки"
                          >
                            <Settings className="size-3" />
                          </button>
                        </div>
                      </div>

                      {/* Model info */}
                      <div className="text-[9px] text-white/30 truncate">
                        {config?.model === 'mistral-agent'
                          ? `Agent: ${config?.mistralAgentId?.slice(0, 20) || 'not set'}...`
                          : (config?.model || 'default')}
                      </div>
                      {config?.totalCalls > 0 && (
                        <div className="text-[8px] text-white/20 mt-0.5">
                          {config.totalCalls} calls · avg {config.avgResponseMs}ms
                        </div>
                      )}
                      {config?.lastError && (
                        <div className="text-[8px] text-red-400/60 mt-0.5 truncate" title={config.lastError}>
                          ⚠ {config.lastError.slice(0, 40)}
                        </div>
                      )}

                      {/* Editing form */}
                      <AnimatePresence>
                        {isEditing && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                              {/* Provider select */}
                              <div>
                                <label className="text-[8px] text-white/40 block mb-0.5">Провайдер</label>
                                <select
                                  value={config?.provider || 'anthropic'}
                                  onChange={(e) => {
                                    const newProvider = e.target.value;
                                    const firstModel = aiProviders?.models?.[newProvider]?.[0]?.id || '';
                                    setAiConfigs(prev => ({
                                      ...prev,
                                      [agent.id]: { ...prev[agent.id], provider: newProvider, model: firstModel },
                                    }));
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#1a1a1a] border border-white/10 text-[10px] text-white focus:outline-none focus:border-white/20"
                                >
                                  <option value="anthropic" className="bg-[#1a1a1a] text-white">🧠 Anthropic (Claude)</option>
                                  <option value="openrouter" className="bg-[#1a1a1a] text-white">🌐 OpenRouter</option>
                                  <option value="gemini" className="bg-[#1a1a1a] text-white">✨ Google Gemini</option>
                                  <option value="mistral" className="bg-[#1a1a1a] text-white">🔥 Mistral AI</option>
                                  <option value="kimi" className="bg-[#1a1a1a] text-white">🌟 Kimi</option>
                                </select>
                              </div>

                              {/* Model select */}
                              <div>
                                <label className="text-[8px] text-white/40 block mb-0.5">Модель</label>
                                <select
                                  value={config?.model || ''}
                                  onChange={(e) => {
                                    setAiConfigs(prev => ({
                                      ...prev,
                                      [agent.id]: { ...prev[agent.id], model: e.target.value },
                                    }));
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#1a1a1a] border border-white/10 text-[10px] text-white focus:outline-none focus:border-white/20"
                                >
                                  {(aiProviders?.models?.[config?.provider] || []).map((m: any) => (
                                    <option key={m.id} value={m.id} className="bg-[#1a1a1a] text-white">{m.name} — {m.description}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Mistral Agent ID — shown only when model is mistral-agent */}
                              {config?.provider === 'mistral' && config?.model === 'mistral-agent' && (
                                <div>
                                  <label className="text-[8px] text-white/40 block mb-0.5">
                                    Agent ID <span className="text-[#f97316]">(Mistral Agents API)</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={config?.mistralAgentId || ''}
                                    onChange={(e) => {
                                      setAiConfigs(prev => ({
                                        ...prev,
                                        [agent.id]: { ...prev[agent.id], mistralAgentId: e.target.value },
                                      }));
                                    }}
                                    placeholder="ag_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="w-full px-2 py-1 rounded bg-[#1a1a1a] border border-white/10 text-[10px] text-white placeholder:text-white/20 font-mono focus:outline-none focus:border-[#f97316]/40"
                                  />
                                  {!config?.mistralAgentId && (
                                    <p className="text-[7px] text-red-400/60 mt-0.5">Agent ID обязателен для Mistral Agent</p>
                                  )}
                                </div>
                              )}

                              {/* Temperature + Max Tokens */}
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-[8px] text-white/40 block mb-0.5">Темп. ({config?.temperature?.toFixed(2) || '0.70'})</label>
                                  <input
                                    type="range"
                                    min="0" max="2" step="0.05"
                                    value={config?.temperature || 0.7}
                                    onChange={(e) => {
                                      setAiConfigs(prev => ({
                                        ...prev,
                                        [agent.id]: { ...prev[agent.id], temperature: parseFloat(e.target.value) },
                                      }));
                                    }}
                                    className="w-full h-1 accent-[#00d9ff]"
                                  />
                                </div>
                                <div className="w-16">
                                  <label className="text-[8px] text-white/40 block mb-0.5">Токены</label>
                                  <input
                                    type="number"
                                    min="100" max="4096" step="100"
                                    value={config?.maxTokens || 600}
                                    onChange={(e) => {
                                      setAiConfigs(prev => ({
                                        ...prev,
                                        [agent.id]: { ...prev[agent.id], maxTokens: parseInt(e.target.value) },
                                      }));
                                    }}
                                    className="w-full px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-1.5 pt-1">
                                <button
                                  onClick={() => handleSaveAIConfig(agent.id, {
                                    provider: config?.provider,
                                    model: config?.model,
                                    temperature: config?.temperature,
                                    maxTokens: config?.maxTokens,
                                    enabled: config?.enabled !== false,
                                    mistralAgentId: config?.provider === 'mistral' && config?.model === 'mistral-agent' ? config?.mistralAgentId : undefined,
                                  })}
                                  disabled={savingAI === agent.id}
                                  className="flex-1 py-1 rounded-lg text-[9px] font-bold bg-[#00d9ff]/15 text-[#00d9ff] hover:bg-[#00d9ff]/25 disabled:opacity-50"
                                >
                                  {savingAI === agent.id ? <Loader2 className="size-3 animate-spin mx-auto" /> : <><Check className="size-3 inline mr-0.5" />Сохранить</>}
                                </button>
                                <button
                                  onClick={() => handleResetAI(agent.id)}
                                  className="px-2 py-1 rounded-lg text-[9px] bg-white/5 text-white/40 hover:bg-white/10"
                                >
                                  <RotateCcw className="size-3" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
          ═══ NICO — PROGRAM DIRECTOR (TOP) ════════════════════════
          ══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden mb-4"
      >
        {/* Nico header */}
        <div className="bg-gradient-to-r from-[#94a3b8]/10 via-[#00d9ff]/5 to-[#00ffaa]/5 p-4 sm:p-5 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-2 ring-[#94a3b8]/30 flex-shrink-0">
              <img src={NICO.photo} alt={NICO.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-bold" style={{ color: NICO.color }}>{NICO.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#00ffaa]/15 text-[#00ffaa]">AI</span>
                {aiConfigs.nico && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[8px] font-bold"
                    style={{ backgroundColor: `${PROVIDER_COLORS[aiConfigs.nico.provider]}20`, color: PROVIDER_COLORS[aiConfigs.nico.provider] }}
                  >
                    {PROVIDER_ICONS[aiConfigs.nico.provider]} {aiConfigs.nico.model === 'mistral-agent' ? 'Mistral Agent' : PROVIDER_LABELS[aiConfigs.nico.provider]}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/15 text-green-400 animate-pulse">Online</span>
              </div>
              <p className="text-xs text-white/50">{NICO.role}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{NICO.area}</p>
            </div>
          </div>
        </div>

        {/* Nico chat */}
        <div className="max-h-[350px] overflow-y-auto p-4 space-y-3">
          {nicoMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="size-8 mx-auto mb-2 text-white/10" />
              <p className="text-white/25 text-xs">Напишите Nico — он координирует работу команды</p>
            </div>
          ) : (
            nicoMessages.map((msg: any) => (
              <ChatBubble key={msg.id} msg={msg} agent={NICO} />
            ))
          )}
          <div ref={nicoChatEndRef} />
        </div>

        {/* Nico input */}
        <div className="border-t border-white/5 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={agentInputs.nico || ''}
              onChange={(e) => setAgentInputs(prev => ({ ...prev, nico: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage('nico')}
              placeholder="Написать Nico..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#94a3b8]/50"
            />
            <button
              onClick={() => handleSendMessage('nico')}
              disabled={sendingTo === 'nico' || !agentInputs.nico?.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#94a3b8]/20 to-[#00d9ff]/20 border border-[#94a3b8]/20 text-[#94a3b8] hover:from-[#94a3b8]/30 hover:to-[#00d9ff]/30 disabled:opacity-40 transition-all"
            >
              {sendingTo === 'nico' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          ═══ CONNECTION VISUAL ════════════════════════════════════
          ══════════════════════════════════════════════════════════ */}
      <div className="flex justify-center py-2 mb-2">
        <div className="flex items-center gap-1">
          {TEAM_AGENTS.map((a, i) => (
            <div key={a.id} className="flex items-center gap-1">
              <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: `${a.color}40` }} />
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: a.color, animationDelay: `${i * 0.2}s` }} />
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ═══ TEAM AGENTS GRID ═════════════════════════════════════
          ══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6"
      >
        {TEAM_AGENTS.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            index={i}
            messages={agentChats[agent.id] || []}
            input={agentInputs[agent.id] || ''}
            onInputChange={(val) => setAgentInputs(prev => ({ ...prev, [agent.id]: val }))}
            onSend={() => handleSendMessage(agent.id)}
            sending={sendingTo === agent.id}
            isExpanded={expandedAgent === agent.id}
            onToggleExpand={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
            chatEndRef={(el) => { agentChatRefs.current[agent.id] = el; }}
            aiConfig={aiConfigs[agent.id]}
            providerColors={PROVIDER_COLORS}
            providerLabels={PROVIDER_LABELS}
            providerIcons={PROVIDER_ICONS}
          />
        ))}
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          ═══ GENERAL ANALYSIS (BOTTOM) ════════════════════════════
          ══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#00d9ff]/15 to-[#00ffaa]/15">
                <BarChart3 className="size-5 text-[#00ffaa]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold">Общий Анализ</h2>
                <p className="text-[10px] text-white/30">
                  {analysis ? `Обновлён: ${new Date(analysis.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Nico компилирует отчёты всей команды'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCompileAnalysis}
              disabled={compilingAnalysis}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-bold text-xs hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {compilingAnalysis ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span className="hidden sm:inline">Nico анализирует...</span>
                  <span className="sm:hidden">Анализ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span className="hidden sm:inline">Сгенерировать анализ</span>
                  <span className="sm:hidden">Анализ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Compilation indicator */}
        {compilingAnalysis && (
          <div className="px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#94a3b8]/10 to-transparent border border-[#94a3b8]/20">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                <img src={TEAM_PHOTOS.nico} alt="Nico" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#94a3b8]">Nico Steel</div>
                <div className="text-[10px] text-white/40 flex items-center gap-1.5 mt-0.5">
                  <Loader2 className="size-3 animate-spin" />
                  Собираю отчёты от команды, анализирую и формирую общие рекомендации...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis content */}
        {analysis ? (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Summary */}
            {analysis.summary && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-[#00d9ff]/5 to-[#00ffaa]/5 border border-[#00d9ff]/15">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg overflow-hidden">
                    <img src={TEAM_PHOTOS.nico} alt="Nico" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-[#94a3b8]">Резюме от Nico</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {/* Sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(analysis.sections || []).map((section: any, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{section.icon}</span>
                    <span className="text-xs font-bold">{section.title}</span>
                  </div>
                  {section.content && (
                    <p className="text-[10px] text-white/40 mb-2 leading-relaxed">{section.content}</p>
                  )}
                  <ul className="space-y-1">
                    {(section.suggestions || []).map((s: string, j: number) => (
                      <li key={j} className="flex items-start gap-2 text-[11px] text-white/60">
                        <span className="text-[#00ffaa] mt-0.5 flex-shrink-0">•</span>
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Agent contributions (collapsible) */}
            {analysis.agentContributions && (
              <details className="group">
                <summary className="cursor-pointer text-[10px] text-white/30 hover:text-white/50 flex items-center gap-1.5 py-2">
                  <ChevronDown className="size-3 group-open:rotate-180 transition-transform" />
                  Вклад каждого агента
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {Object.entries(analysis.agentContributions).map(([agentId, contrib]: [string, any]) => {
                    const agent = AGENTS.find(a => a.id === agentId);
                    if (!agent) return null;
                    return (
                      <div key={agentId} className="p-2.5 rounded-lg bg-white/2 border border-white/5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-md overflow-hidden">
                            <img src={agent.photo} alt={agent.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: agent.color }}>{contrib.name}</span>
                        </div>
                        <p className="text-[10px] text-white/40 leading-relaxed whitespace-pre-wrap line-clamp-4">{contrib.text}</p>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="size-12 mx-auto mb-3 text-white/10" />
            <p className="text-white/30 text-sm">Нажмите «Сгенерировать анализ»</p>
            <p className="text-white/20 text-xs mt-1">Команда подготовит отчёты, Nico скомпилирует общий анализ</p>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────

function getShortModelName(model?: string, provider?: string): string {
  if (!model) return provider || '';
  if (model === 'mistral-agent') return 'Agent';
  // Gemini models: extract meaningful short name
  if (model.startsWith('gemini-')) {
    const m = model.replace(/-preview.*$/, '');
    return m.replace('gemini-', 'G');
  }
  // OpenRouter: take last part after /
  const lastPart = model.split('/').pop() || model;
  return lastPart.slice(0, 18);
}

function ChatBubble({ msg, agent }: { msg: any; agent: typeof AGENTS[0] }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 mt-0.5">
          <img src={agent.photo} alt={agent.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? 'ml-auto' : ''}`}>
        <div
          className={`px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-[#00d9ff]/15 text-white/90 rounded-br-sm'
              : 'bg-white/5 text-white/70 rounded-bl-sm'
          }`}
        >
          {msg.text}
        </div>
        <div className={`text-[9px] text-white/20 mt-0.5 ${isUser ? 'text-right' : ''} flex items-center gap-1 ${isUser ? 'justify-end' : ''}`}>
          <span>{new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
          {!isUser && msg.provider && (
            <span className="text-[7px] opacity-60">
              via {msg.provider === 'anthropic' ? '🧠' : msg.provider === 'openrouter' ? '🌐' : msg.provider === 'gemini' ? '✨' : msg.provider === 'mistral' ? '🔥' : msg.provider === 'kimi' ? '🌟' : ''}{getShortModelName(msg.model, msg.provider)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Agent Card ────────────────────────────────────────────────────────

function AgentCard({
  agent,
  index,
  messages,
  input,
  onInputChange,
  onSend,
  sending,
  isExpanded,
  onToggleExpand,
  chatEndRef,
  aiConfig,
  providerColors,
  providerLabels,
  providerIcons,
}: {
  agent: typeof AGENTS[0];
  index: number;
  messages: any[];
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  sending: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  chatEndRef: (el: HTMLDivElement | null) => void;
  aiConfig?: any;
  providerColors: Record<string, string>;
  providerLabels: Record<string, string>;
  providerIcons: Record<string, string>;
}) {
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.05 }}
      className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden flex flex-col"
      style={{ borderColor: isExpanded ? `${agent.color}30` : undefined }}
    >
      {/* Agent header */}
      <button
        onClick={onToggleExpand}
        className="flex items-center gap-3 p-3 hover:bg-white/3 transition-all text-left"
      >
        <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 flex-shrink-0" style={{ ringColor: `${agent.color}40` }}>
          <img src={agent.photo} alt={agent.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" style={{ color: agent.color }}>{agent.name}</span>
            {aiConfig?.provider && (
              <span
                className="px-1 py-0.5 rounded text-[7px] font-bold"
                style={{ backgroundColor: `${providerColors[aiConfig.provider]}20`, color: providerColors[aiConfig.provider] }}
                title={`${providerLabels[aiConfig.provider]}: ${aiConfig.model}`}
              >
                {providerIcons[aiConfig.provider]}
              </span>
            )}
            {messages.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/5 text-white/30">{messages.length}</span>
            )}
          </div>
          <p className="text-[10px] text-white/40 truncate">{agent.role}</p>
          {lastMsg && !isExpanded && (
            <p className="text-[10px] text-white/25 truncate mt-0.5 italic">
              {lastMsg.role === 'user' ? 'Вы: ' : ''}{lastMsg.text.slice(0, 60)}
            </p>
          )}
        </div>
        {isExpanded ? <ChevronUp className="size-3.5 text-white/30" /> : <ChevronDown className="size-3.5 text-white/30" />}
      </button>

      {/* Expanded chat */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5">
              {/* Area description */}
              <div className="px-3 py-2 bg-white/2">
                <p className="text-[10px] text-white/30 flex items-center gap-1.5">
                  <span>{agent.emoji}</span> {agent.area}
                </p>
              </div>

              {/* Messages */}
              <div className="max-h-[250px] overflow-y-auto p-3 space-y-2.5">
                {messages.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-white/20 text-[10px]">Начните диалог с {agent.name.split(' ')[0]}</p>
                  </div>
                ) : (
                  messages.map((msg: any) => (
                    <ChatBubble key={msg.id} msg={msg} agent={agent} />
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/5 p-2">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
                    placeholder={`Написать ${agent.name.split(' ')[0]}...`}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20"
                  />
                  <button
                    onClick={onSend}
                    disabled={sending || !input.trim()}
                    className="px-3 py-2 rounded-lg transition-all disabled:opacity-30"
                    style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                  >
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}