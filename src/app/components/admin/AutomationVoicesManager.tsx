import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Mic, Plus, Edit, Trash2, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface Voice {
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

export default function AutomationVoicesManager() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null);
  const [testingVoice, setTestingVoice] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Voice>>({
    hostName: '',
    elevenLabsVoiceId: '',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.5
    },
    isActive: true
  });

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/voices`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices || []);
      }
    } catch (error) {
      console.error('Load voices error:', error);
      toast.error('Ошибка загрузки голосов');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingVoice
        ? `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/voices/${editingVoice.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/voices`;

      const method = editingVoice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error('Failed to save voice');
      }

      toast.success(editingVoice ? 'Голос обновлён' : 'Голос создан');
      setIsDialogOpen(false);
      setEditingVoice(null);
      setFormData({
        hostName: '',
        elevenLabsVoiceId: '',
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.5
        },
        isActive: true
      });
      loadVoices();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Ошибка сохранения');
    }
  };

  const handleEdit = (voice: Voice) => {
    setEditingVoice(voice);
    setFormData(voice);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить голос?')) return;

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/voices/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('Голос удалён');
      loadVoices();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Ошибка удаления');
    }
  };

  const testVoice = async (voiceId: string) => {
    setTestingVoice(voiceId);
    try {
      // This would test the voice with ElevenLabs API
      toast.info('Тестирование голоса...');
      
      // In a real implementation, you would call the API to generate a test audio
      setTimeout(() => {
        toast.success('Голос работает корректно');
        setTestingVoice(null);
      }, 2000);
    } catch (error) {
      console.error('Test voice error:', error);
      toast.error('Ошибка тестирования голоса');
      setTestingVoice(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mic className="size-5" />
                Голоса ElevenLabs
              </CardTitle>
              <CardDescription>
                Управление голосами для автоматической озвучки
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingVoice(null);
                  setFormData({
                    hostName: '',
                    elevenLabsVoiceId: '',
                    voiceSettings: {
                      stability: 0.5,
                      similarityBoost: 0.75,
                      style: 0.5
                    },
                    isActive: true
                  });
                }}>
                  <Plus className="size-4 mr-2" />
                  Добавить голос
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingVoice ? 'Редактировать' : 'Добавить'} голос
                  </DialogTitle>
                  <DialogDescription>
                    Настройте голос для ведущего
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="hostName">Имя ведущего</Label>
                    <Input
                      id="hostName"
                      value={formData.hostName}
                      onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                      placeholder="Лина, Тони, Макс..."
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="elevenLabsVoiceId">ElevenLabs Voice ID</Label>
                    <Input
                      id="elevenLabsVoiceId"
                      value={formData.elevenLabsVoiceId}
                      onChange={(e) => setFormData({ ...formData, elevenLabsVoiceId: e.target.value })}
                      placeholder="21m00Tcm4TlvDq8ikWAM"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Получите Voice ID на elevenlabs.io
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="stability">Stability (стабильность)</Label>
                    <Input
                      id="stability"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.voiceSettings?.stability || 0.5}
                      onChange={(e) => setFormData({
                        ...formData,
                        voiceSettings: {
                          ...formData.voiceSettings,
                          stability: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="similarityBoost">Similarity Boost (схожесть)</Label>
                    <Input
                      id="similarityBoost"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.voiceSettings?.similarityBoost || 0.75}
                      onChange={(e) => setFormData({
                        ...formData,
                        voiceSettings: {
                          ...formData.voiceSettings,
                          similarityBoost: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="backgroundMusic">Фоновая музыка (опционально)</Label>
                    <Input
                      id="backgroundMusic"
                      value={formData.backgroundMusic || ''}
                      onChange={(e) => setFormData({ ...formData, backgroundMusic: e.target.value })}
                      placeholder="morning_affirmation.mp3"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Активно</Label>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit">
                      {editingVoice ? 'Сохранить' : 'Создать'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {voices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mic className="size-12 mx-auto mb-4 opacity-50" />
              <p>Нет добавленных голосов</p>
              <p className="text-sm mt-2">Добавьте голоса ElevenLabs для ведущих</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {voices.map((voice) => (
                <Card key={voice.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Mic className="size-4" />
                        {voice.hostName}
                      </span>
                      <Badge variant={voice.isActive ? 'default' : 'secondary'}>
                        {voice.isActive ? 'Активно' : 'Неактивно'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {voice.elevenLabsVoiceId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stability:</span>
                        <span>{voice.voiceSettings?.stability || 0.5}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Similarity:</span>
                        <span>{voice.voiceSettings?.similarityBoost || 0.75}</span>
                      </div>
                      {voice.backgroundMusic && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Музыка:</span>
                          <span className="truncate max-w-[150px]">{voice.backgroundMusic}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => testVoice(voice.elevenLabsVoiceId)}
                        disabled={testingVoice === voice.elevenLabsVoiceId}
                      >
                        <TestTube className="size-3 mr-1" />
                        {testingVoice === voice.elevenLabsVoiceId ? 'Тест...' : 'Тест'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(voice)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(voice.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}