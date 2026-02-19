import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { toast } from 'sonner';
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Play,
  Pause,
  Calendar,
  Settings2,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectId } from '../../../../utils/supabase/info';
import { getAuthHeaders } from '../../../lib/api';

interface InjectionRule {
  id: string;
  name: string;
  frequency: 'hourly' | 'every2h' | 'every3h' | 'custom';
  custom_times?: string[];
  days_of_week?: number[];
  news_categories?: string[];
  max_news_per_slot: number;
  priority_order: 'latest' | 'random' | 'priority';
  intro_jingle_id?: string;
  outro_jingle_id?: string;
  is_active: boolean;
  created_at: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Every Hour' },
  { value: 'every2h', label: 'Every 2 Hours' },
  { value: 'every3h', label: 'Every 3 Hours' },
  { value: 'custom', label: 'Custom Times' }
];

const PRIORITY_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'random', label: 'Random' },
  { value: 'priority', label: 'Least Played' }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

export function NewsInjectionRules() {
  const [rules, setRules] = useState<InjectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<InjectionRule | null>(null);
  const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [formData, setFormData] = useState<Partial<InjectionRule>>({
    name: '',
    frequency: 'hourly',
    custom_times: [],
    days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
    max_news_per_slot: 1,
    priority_order: 'latest',
    is_active: true
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/injection-rules`,
        {
          headers
        }
      );

      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast.error('Failed to load injection rules');
    } finally {
      setLoading(false);
    }
  };

  const saveRule = async () => {
    if (!formData.name) {
      toast.error('Please enter a rule name');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const url = editingRule
        ? `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/injection-rules/${editingRule.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/injection-rules`;

      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingRule ? 'Rule updated' : 'Rule created');
        loadRules();
        setIsDialogOpen(false);
        resetForm();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error saving rule:', error);
      toast.error(error.message || 'Failed to save rule');
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/injection-rules/${id}`,
        {
          method: 'DELETE',
          headers
        }
      );

      const data = await response.json();

      if (data.success) {
        setRules(rules.filter(r => r.id !== id));
        toast.success('Rule deleted');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/injection-rules/${id}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ is_active: !currentActive })
        }
      );

      const data = await response.json();

      if (data.success) {
        setRules(rules.map(r => r.id === id ? { ...r, is_active: !currentActive } : r));
        toast.success(!currentActive ? 'Rule activated' : 'Rule deactivated');
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const previewRule = async (ruleId: string) => {
    setLoadingPreview(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/injection-rules/${ruleId}/preview`,
        {
          headers
        }
      );

      const data = await response.json();

      if (data.success) {
        setPreviewSchedule(data.schedule || []);
      }
    } catch (error) {
      console.error('Error previewing schedule:', error);
      toast.error('Failed to preview schedule');
    } finally {
      setLoadingPreview(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      frequency: 'hourly',
      custom_times: [],
      days_of_week: [1, 2, 3, 4, 5],
      max_news_per_slot: 1,
      priority_order: 'latest',
      is_active: true
    });
    setEditingRule(null);
  };

  const editRule = (rule: InjectionRule) => {
    setFormData(rule);
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  const toggleDay = (day: number) => {
    const days = formData.days_of_week || [];
    if (days.includes(day)) {
      setFormData({ ...formData, days_of_week: days.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, days_of_week: [...days, day].sort() });
    }
  };

  const addCustomTime = () => {
    const times = formData.custom_times || [];
    setFormData({ ...formData, custom_times: [...times, '12:00'] });
  };

  const updateCustomTime = (index: number, value: string) => {
    const times = [...(formData.custom_times || [])];
    times[index] = value;
    setFormData({ ...formData, custom_times: times });
  };

  const removeCustomTime = (index: number) => {
    const times = formData.custom_times || [];
    setFormData({ ...formData, custom_times: times.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d9ff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#00d9ff]" />
            News Injection Rules
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure when and how news is automatically injected into the stream
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141414] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Injection Rule'}</DialogTitle>
              <DialogDescription>
                Set up automatic news injection schedule
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Name */}
              <div>
                <Label>Rule Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Hourly News Updates"
                  className="bg-white/5"
                />
              </div>

              {/* Frequency */}
              <div>
                <Label>Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Times */}
              {formData.frequency === 'custom' && (
                <div>
                  <Label>Custom Times</Label>
                  <div className="space-y-2 mt-2">
                    {(formData.custom_times || []).map((time, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="time"
                          value={time}
                          onChange={(e) => updateCustomTime(index, e.target.value)}
                          className="bg-white/5 flex-1"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCustomTime(index)}
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addCustomTime}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Time
                    </Button>
                  </div>
                </div>
              )}

              {/* Days of Week */}
              <div>
                <Label>Days of Week</Label>
                <div className="flex gap-2 mt-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`
                        flex-1 py-2 rounded-lg text-sm font-medium transition-all
                        ${(formData.days_of_week || []).includes(day.value)
                          ? 'bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }
                      `}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max News Per Slot */}
              <div>
                <Label>Max News Per Slot</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.max_news_per_slot}
                  onChange={(e) => setFormData({ ...formData, max_news_per_slot: parseInt(e.target.value) })}
                  className="bg-white/5"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Number of news items to play in each slot
                </p>
              </div>

              {/* Priority Order */}
              <div>
                <Label>Priority Order</Label>
                <Select
                  value={formData.priority_order}
                  onValueChange={(value: any) => setFormData({ ...formData, priority_order: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                  id="is_active"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Activate rule immediately
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveRule}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black"
              >
                {editingRule ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#141414] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Rules</p>
                <p className="text-2xl font-bold text-white">{rules.length}</p>
              </div>
              <Settings2 className="w-8 h-8 text-[#00d9ff] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Rules</p>
                <p className="text-2xl font-bold text-white">
                  {rules.filter(r => r.is_active).length}
                </p>
              </div>
              <Play className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card className="bg-[#141414] border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Injection Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No injection rules configured</p>
              <p className="text-sm mt-1">Create a rule to start automating news injection</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {rules.map(rule => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-white font-semibold">{rule.name}</h3>
                          <Badge
                            variant={rule.is_active ? 'default' : 'secondary'}
                            className={rule.is_active ? 'bg-green-500/20 text-green-400' : ''}
                          >
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span>Frequency: {FREQUENCY_OPTIONS.find(f => f.value === rule.frequency)?.label}</span>
                          <span>Max: {rule.max_news_per_slot} news/slot</span>
                          <span>Order: {PRIORITY_OPTIONS.find(p => p.value === rule.priority_order)?.label}</span>
                        </div>

                        {rule.days_of_week && rule.days_of_week.length < 7 && (
                          <div className="flex gap-1 mt-2">
                            {DAYS_OF_WEEK.map(day => (
                              <span
                                key={day.value}
                                className={`
                                  text-xs px-2 py-1 rounded
                                  ${rule.days_of_week?.includes(day.value)
                                    ? 'bg-[#00d9ff]/20 text-[#00d9ff]'
                                    : 'bg-white/5 text-gray-500'
                                  }
                                `}
                              >
                                {day.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(rule.id, rule.is_active)}
                          className="text-gray-400 hover:text-white"
                        >
                          {rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editRule(rule)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}