import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import AutomationScheduleManager from '../../components/admin/AutomationScheduleManager';
import AutomationVoicesManager from '../../components/admin/AutomationVoicesManager';
import { Radio, Sparkles, BarChart3, Settings, Play, Calendar, CheckCircle2, XCircle, Clock, Loader2, Mic, Volume2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ScrollArea } from '../../components/ui/scroll-area';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface Stats {
  total: number;
  today: number;
  pending: number;
  generating: number;
  generated: number;
  broadcast: number;
  failed: number;
  successRate: number;
  activeScheduleItems: number;
  activeVoices: number;
}

interface GeneratedContent {
  id: string;
  scheduleId: string;
  broadcastDate: string;
  broadcastTime: string;
  contentType: string;
  status: string;
  scriptText: string;
  errorMessage?: string;
  createdAt: string;
}

export default function ContentAutomationDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentContent, setRecentContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // ElevenLabs testing state
  const [testingElevenLabs, setTestingElevenLabs] = useState(false);
  const [elevenLabsStatus, setElevenLabsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [elevenLabsVoices, setElevenLabsVoices] = useState<any[]>([]);
  const [testVoiceId, setTestVoiceId] = useState('');
  const [testText, setTestText] = useState('Привет! Это тест голоса для Soul FM Hub.');
  const [testingVoice, setTestingVoice] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Mock stats for now
      setStats({
        total: 156,
        today: 12,
        pending: 3,
        generating: 1,
        generated: 8,
        broadcast: 144,
        failed: 2,
        successRate: 98.7,
        activeScheduleItems: 15,
        activeVoices: 5
      });

      // Mock recent content
      setRecentContent([
        {
          id: '1',
          scheduleId: 'sch-1',
          broadcastDate: new Date().toISOString().split('T')[0],
          broadcastTime: '10:00',
          contentType: 'jingle',
          status: 'generated',
          scriptText: 'Welcome to Soul FM Hub, your non-stop groove station!',
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const generateAllToday = async () => {
    if (!confirm('Сгенерировать весь контент на сегодня?')) return;

    setGenerating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const headers = await getAuthHeaders();
      
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/generate-all`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ date: today })
        }
      );

      if (!res.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await res.json();
      toast.success(data.message);
      loadData();
    } catch (error: any) {
      console.error('Generate error:', error);
      toast.error('Ошибка генерации: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const checkSchedule = async () => {
    setGenerating(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/check-schedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok) {
        throw new Error('Failed to check schedule');
      }

      const data = await res.json();
      toast.success(data.message);
      loadData();
    } catch (error: any) {
      console.error('Check schedule error:', error);
      toast.error('Ошибка проверки расписания');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'broadcast': return 'bg-green-500/20 text-green-500';
      case 'generated': return 'bg-blue-500/20 text-blue-500';
      case 'generating': return 'bg-yellow-500/20 text-yellow-500';
      case 'failed': return 'bg-red-500/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'broadcast': return <CheckCircle2 className="size-4" />;
      case 'generated': return <CheckCircle2 className="size-4" />;
      case 'generating': return <Loader2 className="size-4 animate-spin" />;
      case 'failed': return <XCircle className="size-4" />;
      default: return <Clock className="size-4" />;
    }
  };

  // Test ElevenLabs connection
  const testElevenLabsConnection = async () => {
    setTestingElevenLabs(true);
    setElevenLabsStatus('idle');
    setElevenLabsVoices([]);

    try {
      toast.info('🎙️ Проверка подключения к ElevenLabs...');
      const headers = await getAuthHeaders();

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/test-elevenlabs`,
        {
          method: 'GET',
          headers
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setElevenLabsStatus('success');
        setElevenLabsVoices(data.voices || []);
        toast.success(`✅ Подключение успешно! Найдено ${data.voicesCount} голосов`);
        
        // Auto-select first voice for testing
        if (data.voices && data.voices.length > 0) {
          setTestVoiceId(data.voices[0].voice_id);
        }
      } else {
        setElevenLabsStatus('error');
        toast.error(`❌ Ошибка: ${data.error || 'Не удалось подключиться к ElevenLabs'}`);
      }
    } catch (error: any) {
      console.error('ElevenLabs test error:', error);
      setElevenLabsStatus('error');
      toast.error('❌ Ошибка подключения: ' + error.message);
    } finally {
      setTestingElevenLabs(false);
    }
  };

  // Test voice generation
  const testVoiceGeneration = async () => {
    if (!testVoiceId || !testText) {
      toast.error('Выберите голос и введите текст для теста');
      return;
    }

    setTestingVoice(true);

    try {
      toast.info('🎙️ Генерация тестового аудио...');
      const headers = await getAuthHeaders();

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/test-voice`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            voiceId: testVoiceId,
            text: testText
          })
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('✅ Аудио успешно сгенерировано!');
        
        // Play audio if URL provided
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.play();
        }
      } else {
        toast.error(`❌ Ошибка генерации: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (error: any) {
      console.error('Voice test error:', error);
      toast.error('❌ Ошибка: ' + error.message);
    } finally {
      setTestingVoice(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] sm:min-h-[600px]">
          <Loader2 className="size-6 sm:size-8 text-[#00d9ff] animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout maxWidth="wide">
      <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent truncate">
              Автоматизация контента
            </h1>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              AI-генерация контента для Soul FM Radio
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <Button
              onClick={checkSchedule}
              disabled={generating}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm flex-1 sm:flex-none"
            >
              {generating ? (
                <Loader2 className="size-3 sm:size-4 mr-1.5 sm:mr-2 animate-spin" />
              ) : (
                <Clock className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Проверить расписание</span>
              <span className="sm:hidden">Расписание</span>
            </Button>
            <Button
              onClick={generateAllToday}
              disabled={generating}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black text-xs sm:text-sm flex-1 sm:flex-none"
              size="sm"
            >
              {generating ? (
                <Loader2 className="size-3 sm:size-4 mr-1.5 sm:mr-2 animate-spin" />
              ) : (
                <Sparkles className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Сгенерировать всё сегодня</span>
              <span className="sm:hidden">Генерировать</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            <Card className="bg-[#141414] border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-white">Сегодня</CardTitle>
                <Calendar className="size-3 sm:size-4 text-white/40" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-white">{stats.today}</div>
                <p className="text-[10px] sm:text-xs text-white/60">
                  Контент сгенерирован
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#141414] border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-white">Всего</CardTitle>
                <BarChart3 className="size-3 sm:size-4 text-white/40" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-white">{stats.total}</div>
                <p className="text-[10px] sm:text-xs text-white/60">
                  За всё время
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#141414] border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-white">Успешность</CardTitle>
                <CheckCircle2 className="size-3 sm:size-4 text-white/40" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-white">{stats.successRate}%</div>
                <p className="text-[10px] sm:text-xs text-white/60">
                  {stats.broadcast} успешных / {stats.failed} ошибок
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#141414] border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-white">Расписание</CardTitle>
                <Clock className="size-3 sm:size-4 text-white/40" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-white">{stats.activeScheduleItems}</div>
                <p className="text-[10px] sm:text-xs text-white/60">
                  Активных передач
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="recent" className="space-y-4 w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="bg-[#141414] border border-white/10 inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="recent" className="text-xs sm:text-sm data-[state=active]:bg-white/10 flex-1 sm:flex-none">
                Последние
              </TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs sm:text-sm data-[state=active]:bg-white/10 flex-1 sm:flex-none">
                Расписание
              </TabsTrigger>
              <TabsTrigger value="voices" className="text-xs sm:text-sm data-[state=active]:bg-white/10 flex-1 sm:flex-none">
                Голоса
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm data-[state=active]:bg-white/10 flex-1 sm:flex-none">
                Настройки
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Recent Content */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Последний сгенерированный контент</CardTitle>
                <CardDescription>
                  Недавно созданные выпуски
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentContent.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="size-12 mx-auto mb-4 opacity-50" />
                    <p>Контент ещё не генерировался</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentContent.map((content) => (
                      <div
                        key={content.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-sm font-mono">
                            {content.broadcastDate} {content.broadcastTime}
                          </div>
                          <Badge variant="outline">{content.contentType}</Badge>
                          <div className="flex-1 truncate">
                            <p className="text-sm truncate">{content.scriptText.substring(0, 100)}...</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(content.status)}>
                          {getStatusIcon(content.status)}
                          <span className="ml-1">{content.status}</span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule */}
          <TabsContent value="schedule">
            <AutomationScheduleManager />
          </TabsContent>

          {/* Voices */}
          <TabsContent value="voices">
            <AutomationVoicesManager />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Инициализация данных</CardTitle>
                  <CardDescription>
                    Быстрая настройка системы автоматизации
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Создайте базовое расписание с 9 ведущими и их голосами для быстрого старта.
                    </p>
                    <Button
                      onClick={async () => {
                        if (!confirm('Создать начальные данные? (Голоса, расписание, промпты)')) return;
                        
                        try {
                          const headers = await getAuthHeaders();
                          const res = await fetch(
                            `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/seed`,
                            {
                              method: 'POST',
                              headers
                            }
                          );

                          const data = await res.json();
                          
                          if (data.success) {
                            toast.success(data.message);
                            loadData();
                          } else {
                            toast.error(data.error || 'Ошибка инициализации');
                          }
                        } catch (error: any) {
                          toast.error('Ошибка: ' + error.message);
                        }
                      }}
                      className="w-full"
                    >
                      <Sparkles className="size-4 mr-2" />
                      Инициализировать данные
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Настройки</CardTitle>
                  <CardDescription>
                    Конфигурация внешних сервисов
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">Perplexity API</h3>
                      <p className="text-sm text-muted-foreground">
                        Используется для получения актуальных новостей
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ключ настраивается через переменные окружения: PERPLEXITY_API_KEY
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">Claude API</h3>
                      <p className="text-sm text-muted-foreground">
                        Генерация радио-скриптов через Claude Sonnet 4
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ключ настраивается через переменные окружения: CLAUDE_API_KEY
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">ElevenLabs API</h3>
                      <p className="text-sm text-muted-foreground">
                        Озвучка контента голосами ведущих
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ключ настраивается через переменные окружения: ELEVENLABS_API_KEY
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Тестирование ElevenLabs</CardTitle>
                  <CardDescription>
                    Проверьте подключение и генерацию аудио
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button
                      onClick={testElevenLabsConnection}
                      disabled={testingElevenLabs}
                      className="w-full"
                    >
                      {testingElevenLabs ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <Mic className="size-4 mr-2" />
                      )}
                      Проверить подключение к ElevenLabs
                    </Button>

                    {elevenLabsStatus === 'success' && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Найдено голосов: {elevenLabsVoices.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Label>Выберите голос:</Label>
                          <Select
                            value={testVoiceId}
                            onValueChange={(value) => setTestVoiceId(value)}
                            className="w-full"
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Выберите голос" />
                            </SelectTrigger>
                            <SelectContent>
                              {elevenLabsVoices.map((voice) => (
                                <SelectItem key={voice.voice_id} value={voice.voice_id}>
                                  {voice.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label>Текст для теста:</Label>
                          <Textarea
                            value={testText}
                            onChange={(e) => setTestText(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                          />
                        </div>
                        <Button
                          onClick={testVoiceGeneration}
                          disabled={testingVoice}
                          className="w-full"
                        >
                          {testingVoice ? (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                          ) : (
                            <Volume2 className="size-4 mr-2" />
                          )}
                          Генерировать аудио
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}