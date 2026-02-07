import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Clock, Plus, Edit, Trash2, Radio, Sparkles, Wind } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface ScheduleItem {
  id: string;
  time: string;
  hostName: string;
  showType: 'affirmation' | 'news' | 'breathing' | 'custom';
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

interface Voice {
  id: string;
  hostName: string;
  elevenLabsVoiceId: string;
  isActive: boolean;
}

const SHOW_TYPES = [
  { value: 'affirmation', label: '🌅 Аффирмация', icon: Sparkles },
  { value: 'news', label: '📰 Новости', icon: Radio },
  { value: 'breathing', label: '🧘 Дыхание', icon: Wind },
  { value: 'custom', label: '🎨 Свободный', icon: Clock }
];

export default function AutomationScheduleManager() {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [formData, setFormData] = useState<Partial<ScheduleItem>>({
    time: '09:00',
    hostName: '',
    showType: 'news',
    topic: '',
    introText: '',
    outroText: '',
    durationMinutes: 2,
    voiceId: '',
    perplexityQuery: '',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load schedule items
      const scheduleRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/schedule`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        setScheduleItems(scheduleData.schedule || []);
      }

      // Load voices
      const voicesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/voices`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (voicesRes.ok) {
        const voicesData = await voicesRes.json();
        setVoices(voicesData.voices || []);
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingItem
        ? `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/schedule/${editingItem.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/schedule`;

      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error('Failed to save schedule item');
      }

      toast.success(editingItem ? 'Расписание обновлено' : 'Расписание создано');
      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({
        time: '09:00',
        hostName: '',
        showType: 'news',
        topic: '',
        introText: '',
        outroText: '',
        durationMinutes: 2,
        voiceId: '',
        perplexityQuery: '',
        isActive: true
      });
      loadData();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Ошибка сохранения');
    }
  };

  const handleEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить элемент расписания?')) return;

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/automation/schedule/${id}`,
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

      toast.success('Расписание удалено');
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Ошибка удаления');
    }
  };

  const getShowTypeIcon = (type: string) => {
    const showType = SHOW_TYPES.find(t => t.value === type);
    const Icon = showType?.icon || Clock;
    return <Icon className="size-4" />;
  };

  const getShowTypeLabel = (type: string) => {
    const showType = SHOW_TYPES.find(t => t.value === type);
    return showType?.label || type;
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
                <Clock className="size-5" />
                Расписание автоматизации
              </CardTitle>
              <CardDescription>
                Управление автоматической генерацией контента по расписанию
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingItem(null);
                  setFormData({
                    time: '09:00',
                    hostName: '',
                    showType: 'news',
                    topic: '',
                    introText: '',
                    outroText: '',
                    durationMinutes: 2,
                    voiceId: '',
                    perplexityQuery: '',
                    isActive: true
                  });
                }}>
                  <Plus className="size-4 mr-2" />
                  Добавить
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Редактировать' : 'Создать'} расписание
                  </DialogTitle>
                  <DialogDescription>
                    Настройте автоматическую генерацию контента
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time">Время эфира</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="showType">Тип передачи</Label>
                      <Select
                        value={formData.showType}
                        onValueChange={(value: any) => setFormData({ ...formData, showType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHOW_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="voiceId">Голос ElevenLabs</Label>
                      <Select
                        value={formData.voiceId}
                        onValueChange={(value) => setFormData({ ...formData, voiceId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите голос" />
                        </SelectTrigger>
                        <SelectContent>
                          {voices.filter(v => v.isActive).map(voice => (
                            <SelectItem key={voice.id} value={voice.elevenLabsVoiceId}>
                              {voice.hostName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="topic">Тема передачи</Label>
                    <Input
                      id="topic"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="Новости музыки, Игры и технологии..."
                    />
                  </div>

                  {formData.showType === 'news' && (
                    <div>
                      <Label htmlFor="perplexityQuery">Запрос для новостей (Perplexity)</Label>
                      <Textarea
                        id="perplexityQuery"
                        value={formData.perplexityQuery || ''}
                        onChange={(e) => setFormData({ ...formData, perplexityQuery: e.target.value })}
                        placeholder="latest music news, new album releases..."
                        rows={2}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="introText">Intro (приветствие)</Label>
                    <Textarea
                      id="introText"
                      value={formData.introText}
                      onChange={(e) => setFormData({ ...formData, introText: e.target.value })}
                      placeholder="Доброе утро, меня зовут..."
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="outroText">Outro (прощание)</Label>
                    <Textarea
                      id="outroText"
                      value={formData.outroText}
                      onChange={(e) => setFormData({ ...formData, outroText: e.target.value })}
                      placeholder="Оставайтесь с нами на Soul FM..."
                      rows={3}
                      required
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
                      {editingItem ? 'Сохранить' : 'Создать'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {scheduleItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="size-12 mx-auto mb-4 opacity-50" />
              <p>Нет элементов расписания</p>
              <p className="text-sm mt-2">Создайте первый элемент автоматизации</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduleItems
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl font-mono font-bold text-[#00d9ff]">
                        {item.time}
                      </div>
                      <div className="flex items-center gap-2">
                        {getShowTypeIcon(item.showType)}
                        <span className="text-sm text-muted-foreground">
                          {getShowTypeLabel(item.showType)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.hostName}</div>
                        {item.topic && (
                          <div className="text-sm text-muted-foreground">{item.topic}</div>
                        )}
                      </div>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Активно' : 'Неактивно'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}