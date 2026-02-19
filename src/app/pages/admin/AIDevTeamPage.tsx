import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Users,
  Plus,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  ArrowRight,
  X,
  Loader2,
  LayoutGrid,
  ListTodo,
  Trash2,
  Crown,
  Wifi,
  WifiOff,
  Circle,
  Search,
  Zap,
  Code2,
  Palette,
  Shield,
  Server,
  GitBranch,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AutopilotPanel } from '../../components/admin/AutopilotPanel';
import { formatDistanceToNow } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  fullName: string;
  role: string;
  avatar: string;
  color: string;
  specialties: string[];
  status: 'online' | 'idle' | 'busy' | 'offline';
  bio: string;
  currentTask: string | null;
  tasksCompleted: number;
  joinedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigneeId: string | null;
  labels: string[];
  comments: any[];
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  memberId: string;
  sender: string;
  text: string;
  timestamp: string;
  aiPowered?: boolean;
}

interface TeamStats {
  totalTasks: number;
  totalMembers: number;
  onlineMembers: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  sprintProgress: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  idle: '#f59e0b',
  busy: '#ef4444',
  offline: '#6b7280',
};

const PRIORITY_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  critical: { color: '#ef4444', icon: Flame, label: 'Critical' },
  high: { color: '#f59e0b', icon: AlertTriangle, label: 'High' },
  medium: { color: '#3b82f6', icon: Circle, label: 'Medium' },
  low: { color: '#6b7280', icon: Circle, label: 'Low' },
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  backlog: { color: '#6b7280', label: 'Backlog', icon: ListTodo },
  'in-progress': { color: '#3b82f6', label: 'In Progress', icon: Clock },
  review: { color: '#f59e0b', label: 'Review', icon: AlertTriangle },
  done: { color: '#22c55e', label: 'Done', icon: CheckCircle2 },
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  'Team Lead': Crown,
  'Frontend Developer': Code2,
  'Backend Developer': Server,
  'DevOps Engineer': GitBranch,
  'QA Engineer': Shield,
  'UX Designer': Palette,
};

const LABEL_OPTIONS = [
  'frontend', 'backend', 'design', 'bug', 'feature', 'performance',
  'security', 'refactor', 'docs', 'testing', 'urgent', 'infrastructure',
];

// ── Tab Types ──────────────────────────────────────────────────────────

type TabId = 'team' | 'tasks' | 'chat' | 'autopilot';

// ── Component ──────────────────────────────────────────────────────────

export function AIDevTeamPage() {
  const [activeTab, setActiveTab] = useState<TabId>('team');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Chat state
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Task creation
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as string,
    assigneeId: '' as string,
    labels: [] as string[],
  });

  // Filters
  const [taskFilter, setTaskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data loading ──────────────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [membersRes, tasksRes, statsRes] = await Promise.allSettled([
        api.getAITeamMembers(),
        api.getAITeamTasks(),
        api.getAITeamStats(),
      ]);

      if (membersRes.status === 'fulfilled' && membersRes.value.members) {
        setMembers(membersRes.value.members);
      }
      if (tasksRes.status === 'fulfilled' && tasksRes.value.tasks) {
        setTasks(tasksRes.value.tasks);
      }
      if (statsRes.status === 'fulfilled' && !statsRes.value.error) {
        setStats(statsRes.value);
      }
    } catch (err) {
      console.error('Error loading AI team data:', err);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Chat ──────────────────────────────────────────────────────────

  const openChat = async (member: TeamMember) => {
    setSelectedMember(member);
    setActiveTab('chat');
    setChatLoading(true);
    try {
      const res = await api.getAITeamChat(member.id);
      setChatMessages(res.messages || []);
    } catch (err) {
      console.error('Error loading chat:', err);
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, streamingText]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedMember || chatSending) return;
    const text = chatInput.trim();
    setChatInput('');
    setChatSending(true);
    setStreamingText('');
    setIsStreaming(false);

    // Optimistic update — user message
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      memberId: selectedMember.id,
      sender: 'admin',
      text,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await api.streamAITeamChat(selectedMember.id, text);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Stream request failed' }));
        toast.error(errData.error || 'Stream request failed');
        setChatMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
        setChatSending(false);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streaming = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          let eventType = '';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            else if (line.startsWith('data: ')) eventData = line.slice(6);
          }

          if (!eventType || !eventData) continue;

          try {
            const data = JSON.parse(eventData);

            if (eventType === 'user_message') {
              // Replace temp user msg with real one
              setChatMessages(prev => prev.map(m =>
                m.id === tempUserMsg.id ? data : m
              ));
            } else if (eventType === 'chunk') {
              if (!streaming) {
                streaming = true;
                setIsStreaming(true);
              }
              setStreamingText(prev => prev + data.text);
            } else if (eventType === 'done') {
              // Stream complete — add final AI message, clear streaming state
              setIsStreaming(false);
              setStreamingText('');
              setChatMessages(prev => [...prev, data]);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      console.error('Stream chat error:', err);
      toast.error('Failed to send message');
      setChatMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setIsStreaming(false);
      setStreamingText('');
    } finally {
      setChatSending(false);
    }
  };

  // ── Tasks ──────────────────────────────────────────────────────────

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const res = await api.createAITeamTask({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        assigneeId: newTask.assigneeId || undefined,
        labels: newTask.labels,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task created!');
        setTasks(prev => [res.task, ...prev]);
        setNewTask({ title: '', description: '', priority: 'medium', assigneeId: '', labels: [] });
        setShowCreateTask(false);
        loadData(true);
      }
    } catch (err) {
      console.error('Create task error:', err);
      toast.error('Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const res = await api.updateAITeamTask(taskId, { status });
      if (res.error) {
        toast.error(res.error);
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as any } : t));
        loadData(true);
      }
    } catch (err) {
      console.error('Update task error:', err);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const res = await api.deleteAITeamTask(taskId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task deleted');
        setTasks(prev => prev.filter(t => t.id !== taskId));
        loadData(true);
      }
    } catch (err) {
      console.error('Delete task error:', err);
      toast.error('Failed to delete task');
    }
  };

  // ── Filters ──────────────────────────────────────────────────────────

  const filteredTasks = tasks.filter(t => {
    if (taskFilter !== 'all' && t.status !== taskFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.labels.some(l => l.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // ── Member helper ──────────────────────────────────────────────────

  const getMember = (id: string | null) => members.find(m => m.id === id);

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="size-10 animate-spin text-[#00d9ff] mx-auto mb-4" />
            <p className="text-white/60 text-sm">Loading AI Dev Team...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout maxWidth="wide">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#00d9ff]/20 to-[#00ffaa]/20">
                <Bot className="size-6 sm:size-7 text-[#00d9ff]" />
              </div>
              <span className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] bg-clip-text text-transparent">
                AI Dev Department
              </span>
            </h1>
            <p className="text-white/50 text-xs sm:text-sm mt-1 ml-[52px] sm:ml-[60px]">
              AI-powered development team for Soul FM Hub platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setRefreshing(true); loadData(); }}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Strip ──────────────────────────────────────────── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5"
        >
          <div className="bg-[#141414] rounded-xl p-3 sm:p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="size-4 text-[#00d9ff]" />
              <span className="text-xs text-white/50">Team</span>
            </div>
            <div className="text-lg sm:text-xl font-bold">{stats.totalMembers}</div>
            <div className="text-[10px] text-[#00ffaa]">{stats.onlineMembers} online</div>
          </div>
          <div className="bg-[#141414] rounded-xl p-3 sm:p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <ListTodo className="size-4 text-[#00ffaa]" />
              <span className="text-xs text-white/50">Tasks</span>
            </div>
            <div className="text-lg sm:text-xl font-bold">{stats.totalTasks}</div>
            <div className="text-[10px] text-white/40">{stats.byStatus?.['in-progress'] || 0} in progress</div>
          </div>
          <div className="bg-[#141414] rounded-xl p-3 sm:p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="size-4 text-green-400" />
              <span className="text-xs text-white/50">Done</span>
            </div>
            <div className="text-lg sm:text-xl font-bold">{stats.byStatus?.done || 0}</div>
            <div className="text-[10px] text-white/40">{stats.sprintProgress}% sprint</div>
          </div>
          <div className="bg-[#141414] rounded-xl p-3 sm:p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="size-4 text-yellow-400" />
              <span className="text-xs text-white/50">Priority</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-red-400">{(stats.byPriority?.critical || 0) + (stats.byPriority?.high || 0)}</div>
            <div className="text-[10px] text-white/40">critical + high</div>
          </div>
        </motion.div>
      )}

      {/* ── Tab Navigation ──────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-5 bg-[#141414] rounded-xl p-1 border border-white/5 w-fit">
        {([
          { id: 'team' as TabId, label: 'Team', icon: Users },
          { id: 'tasks' as TabId, label: 'Task Board', icon: LayoutGrid },
          { id: 'chat' as TabId, label: 'Team Chat', icon: MessageSquare },
          { id: 'autopilot' as TabId, label: 'Autopilot', icon: Bot },
        ]).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'team' && (
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TeamView members={members} onChat={openChat} tasks={tasks} />
          </motion.div>
        )}
        {activeTab === 'tasks' && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TaskBoardView
              tasks={filteredTasks}
              members={members}
              taskFilter={taskFilter}
              setTaskFilter={setTaskFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showCreateTask={showCreateTask}
              setShowCreateTask={setShowCreateTask}
              newTask={newTask}
              setNewTask={setNewTask}
              createTask={createTask}
              updateTaskStatus={updateTaskStatus}
              deleteTask={deleteTask}
              getMember={getMember}
            />
          </motion.div>
        )}
        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ChatView
              members={members}
              selectedMember={selectedMember}
              setSelectedMember={(m) => { setSelectedMember(m); if (m) openChat(m); }}
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendMessage={sendMessage}
              chatLoading={chatLoading}
              chatSending={chatSending}
              chatEndRef={chatEndRef}
              streamingText={streamingText}
              isStreaming={isStreaming}
              setStreamingText={setStreamingText}
              setIsStreaming={setIsStreaming}
            />
          </motion.div>
        )}
        {activeTab === 'autopilot' && (
          <motion.div
            key="autopilot"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AutopilotPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── Team View ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function TeamView({
  members,
  onChat,
  tasks,
}: {
  members: TeamMember[];
  onChat: (m: TeamMember) => void;
  tasks: Task[];
}) {
  // Sort: Team Lead first
  const sorted = [...members].sort((a, b) => {
    if (a.role === 'Team Lead') return -1;
    if (b.role === 'Team Lead') return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Team Lead Card — Full Width */}
      {sorted.filter(m => m.role === 'Team Lead').map(lead => (
        <TeamLeadCard key={lead.id} member={lead} onChat={onChat} tasks={tasks} allMembers={members} />
      ))}

      {/* Other Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {sorted.filter(m => m.role !== 'Team Lead').map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <MemberCard member={member} onChat={onChat} tasks={tasks} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TeamLeadCard({
  member,
  onChat,
  tasks,
  allMembers,
}: {
  member: TeamMember;
  onChat: (m: TeamMember) => void;
  tasks: Task[];
  allMembers: TeamMember[];
}) {
  const RoleIcon = ROLE_ICONS[member.role] || Bot;
  const memberTasks = tasks.filter(t => t.assigneeId === member.id);
  const onlineCount = allMembers.filter(m => m.status === 'online').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#141414] to-[#1a1a2e] rounded-2xl border border-[#00d9ff]/20 overflow-hidden"
    >
      {/* Glow line */}
      <div className="h-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa]" />

      <div className="p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
          {/* Avatar & Info */}
          <div className="flex items-start gap-4 lg:min-w-[300px]">
            <div className="relative">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold"
                style={{ backgroundColor: `${member.color}20`, color: member.color }}
              >
                {member.avatar}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#141414]"
                style={{ backgroundColor: STATUS_COLORS[member.status] }}
              />
              <div className="absolute -top-2 -left-2">
                <Crown className="size-5 text-yellow-400 drop-shadow-lg" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-bold" style={{ color: member.color }}>
                  {member.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 uppercase tracking-wider">
                  Lead
                </span>
              </div>
              <p className="text-sm text-white/60 mt-0.5">{member.fullName}</p>
              <p className="text-xs text-white/40 mt-1">{member.role}</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <Users className="size-3.5" />
                  <span>{onlineCount}/{allMembers.length} online</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <ListTodo className="size-3.5" />
                  <span>{tasks.length} tasks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio & Specialties */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/60 leading-relaxed mb-3">{member.bio}</p>
            <div className="flex flex-wrap gap-1.5">
              {member.specialties.map(s => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                  style={{ borderColor: `${member.color}30`, color: member.color, backgroundColor: `${member.color}10` }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="flex lg:flex-col items-center gap-2 lg:justify-center">
            <button
              onClick={() => onChat(member)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
            >
              <MessageSquare className="size-4" />
              Chat with {member.name}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MemberCard({
  member,
  onChat,
  tasks,
}: {
  member: TeamMember;
  onChat: (m: TeamMember) => void;
  tasks: Task[];
}) {
  const RoleIcon = ROLE_ICONS[member.role] || Bot;
  const memberTasks = tasks.filter(t => t.assigneeId === member.id);
  const activeTasks = memberTasks.filter(t => t.status === 'in-progress').length;

  return (
    <div className="bg-[#141414] rounded-xl border border-white/5 hover:border-white/15 transition-all group overflow-hidden">
      {/* Color bar */}
      <div className="h-0.5" style={{ backgroundColor: member.color }} />

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: `${member.color}20`, color: member.color }}
            >
              {member.avatar}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#141414]"
              style={{ backgroundColor: STATUS_COLORS[member.status] }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold" style={{ color: member.color }}>{member.name}</h4>
            <p className="text-xs text-white/40 truncate">{member.role}</p>
            <div className="flex items-center gap-1 mt-1">
              {member.status === 'online' ? (
                <Wifi className="size-3 text-green-400" />
              ) : member.status === 'idle' ? (
                <Clock className="size-3 text-yellow-400" />
              ) : (
                <WifiOff className="size-3 text-gray-500" />
              )}
              <span className="text-[10px] capitalize" style={{ color: STATUS_COLORS[member.status] }}>
                {member.status}
              </span>
            </div>
          </div>
          <RoleIcon className="size-5 text-white/20" />
        </div>

        {/* Bio */}
        <p className="text-xs text-white/50 leading-relaxed mb-3 line-clamp-2">{member.bio}</p>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1 mb-3">
          {member.specialties.slice(0, 3).map(s => (
            <span
              key={s}
              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-white/50"
            >
              {s}
            </span>
          ))}
          {member.specialties.length > 3 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] text-white/30">
              +{member.specialties.length - 3}
            </span>
          )}
        </div>

        {/* Task stats */}
        <div className="flex items-center gap-3 mb-3 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <ListTodo className="size-3" />
            {memberTasks.length} tasks
          </span>
          {activeTasks > 0 && (
            <span className="flex items-center gap-1 text-blue-400">
              <Clock className="size-3" />
              {activeTasks} active
            </span>
          )}
        </div>

        {/* Chat button */}
        <button
          onClick={() => onChat(member)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-all group-hover:bg-white/8"
          style={{ color: member.color }}
        >
          <MessageSquare className="size-3.5" />
          Chat
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── Task Board View ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function TaskBoardView({
  tasks,
  members,
  taskFilter,
  setTaskFilter,
  searchQuery,
  setSearchQuery,
  showCreateTask,
  setShowCreateTask,
  newTask,
  setNewTask,
  createTask,
  updateTaskStatus,
  deleteTask,
  getMember,
}: {
  tasks: Task[];
  members: TeamMember[];
  taskFilter: string;
  setTaskFilter: (f: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showCreateTask: boolean;
  setShowCreateTask: (v: boolean) => void;
  newTask: any;
  setNewTask: (v: any) => void;
  createTask: () => void;
  updateTaskStatus: (id: string, status: string) => void;
  deleteTask: (id: string) => void;
  getMember: (id: string | null) => TeamMember | undefined;
}) {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00d9ff]/50"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {['all', 'backlog', 'in-progress', 'review', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setTaskFilter(f)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                taskFilter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>

        {/* Create button */}
        <button
          onClick={() => setShowCreateTask(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
        >
          <Plus className="size-4" />
          New Task
        </button>
      </div>

      {/* Create Task Form */}
      <AnimatePresence>
        {showCreateTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#141414] rounded-xl border border-[#00d9ff]/20 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#00d9ff] flex items-center gap-2">
                  <Plus className="size-4" />
                  Create New Task
                </h3>
                <button onClick={() => setShowCreateTask(false)} className="p-1 rounded hover:bg-white/10">
                  <X className="size-4 text-white/40" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Task title..."
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00d9ff]/50"
              />

              <textarea
                placeholder="Description (optional)..."
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00d9ff]/50 min-h-[80px] resize-none"
              />

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Priority */}
                <div className="flex-1">
                  <label className="text-xs text-white/40 mb-1 block">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00d9ff]/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Assignee */}
                <div className="flex-1">
                  <label className="text-xs text-white/40 mb-1 block">Assign to</label>
                  <select
                    value={newTask.assigneeId}
                    onChange={e => setNewTask({ ...newTask, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00d9ff]/50"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Labels</label>
                <div className="flex flex-wrap gap-1.5">
                  {LABEL_OPTIONS.map(label => (
                    <button
                      key={label}
                      onClick={() => {
                        setNewTask({
                          ...newTask,
                          labels: newTask.labels.includes(label)
                            ? newTask.labels.filter((l: string) => l !== label)
                            : [...newTask.labels, label],
                        });
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                        newTask.labels.includes(label)
                          ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                          : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateTask(false)}
                  className="px-4 py-2 rounded-lg text-sm text-white/50 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createTask}
                  disabled={!newTask.title.trim()}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black text-sm font-semibold disabled:opacity-40 hover:shadow-lg transition-all"
                >
                  Create Task
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {(['backlog', 'in-progress', 'review', 'done'] as const).map(status => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          const columnTasks = tasks.filter(t => t.status === status);

          return (
            <div key={status} className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
              {/* Column Header */}
              <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="size-4" style={{ color: config.color }} />
                  <span className="text-sm font-semibold">{config.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Tasks */}
              <div className="p-2 space-y-2 min-h-[120px] max-h-[500px] overflow-y-auto">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-white/20 text-xs">
                    No tasks
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      member={getMember(task.assigneeId)}
                      onStatusChange={updateTaskStatus}
                      onDelete={deleteTask}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  member,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  member?: TeamMember;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const priority = PRIORITY_CONFIG[task.priority];
  const PriorityIcon = priority.icon;

  const nextStatus: Record<string, string> = {
    backlog: 'in-progress',
    'in-progress': 'review',
    review: 'done',
    done: 'backlog',
  };

  return (
    <div className="bg-white/5 rounded-lg p-3 hover:bg-white/8 transition-all group relative">
      {/* Priority & Labels row */}
      <div className="flex items-center gap-1.5 mb-2">
        <PriorityIcon
          className="size-3"
          style={{ color: priority.color }}
          fill={task.priority === 'critical' ? priority.color : 'none'}
        />
        <span className="text-[10px] font-medium" style={{ color: priority.color }}>
          {priority.label}
        </span>
        <div className="flex-1" />
        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={() => onStatusChange(task.id, nextStatus[task.status])}
            className="p-1 rounded hover:bg-white/10"
            title={`Move to ${STATUS_CONFIG[nextStatus[task.status]]?.label}`}
          >
            <ArrowRight className="size-3 text-white/40" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded hover:bg-red-500/20"
          >
            <Trash2 className="size-3 text-red-400/60" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-white mb-1.5 leading-tight">{task.title}</h4>

      {/* Description */}
      {task.description && (
        <p className="text-[11px] text-white/40 mb-2 line-clamp-2">{task.description}</p>
      )}

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map(l => (
            <span key={l} className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/40">
              {l}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {member ? (
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ backgroundColor: `${member.color}25`, color: member.color }}
            >
              {member.avatar}
            </div>
            <span className="text-[10px] text-white/40">{member.name}</span>
          </div>
        ) : (
          <span className="text-[10px] text-white/25 italic">Unassigned</span>
        )}
        <span className="text-[9px] text-white/25">
          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── Chat View ─────────────────────��────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function ChatView({
  members,
  selectedMember,
  setSelectedMember,
  chatMessages,
  chatInput,
  setChatInput,
  sendMessage,
  chatLoading,
  chatSending,
  chatEndRef,
  streamingText,
  isStreaming,
  setStreamingText,
  setIsStreaming,
}: {
  members: TeamMember[];
  selectedMember: TeamMember | null;
  setSelectedMember: (m: TeamMember | null) => void;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  sendMessage: () => void;
  chatLoading: boolean;
  chatSending: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
  streamingText: string;
  isStreaming: boolean;
  setStreamingText: (v: string) => void;
  setIsStreaming: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[500px]">
      {/* Member List */}
      <div className="lg:w-72 xl:w-80 flex-shrink-0">
        <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Users className="size-4 text-[#00d9ff]" />
              Team Members
            </h3>
          </div>
          <div className="p-2 space-y-1 max-h-[400px] lg:max-h-[600px] overflow-y-auto">
            {members.map(member => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left ${
                  selectedMember?.id === member.id
                    ? 'bg-white/10 border border-white/10'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${member.color}20`, color: member.color }}
                  >
                    {member.avatar}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-[#141414]"
                    style={{ backgroundColor: STATUS_COLORS[member.status] }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: member.color }}>
                    {member.name}
                  </div>
                  <div className="text-[10px] text-white/35 truncate">{member.role}</div>
                </div>
                {member.role === 'Team Lead' && (
                  <Crown className="size-3.5 text-yellow-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-[#141414] rounded-xl border border-white/5 flex flex-col overflow-hidden">
        {selectedMember ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold"
                  style={{ backgroundColor: `${selectedMember.color}20`, color: selectedMember.color }}
                >
                  {selectedMember.avatar}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#141414]"
                  style={{ backgroundColor: STATUS_COLORS[selectedMember.status] }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold" style={{ color: selectedMember.color }}>
                  {selectedMember.name}
                </h4>
                <p className="text-[10px] text-white/40">{selectedMember.role} &bull; {selectedMember.fullName}</p>
              </div>
              {/* AI status badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Sparkles className="size-3 text-purple-400" />
                <span className="text-[10px] font-medium text-purple-300">Claude AI</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px]">
              {chatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="size-6 animate-spin text-[#00d9ff]" />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/30 text-center py-12">
                  <Bot className="size-12 mb-3 opacity-20" />
                  <p className="text-sm mb-1">No messages yet</p>
                  <p className="text-xs text-white/20">
                    Start a conversation with {selectedMember.name}
                  </p>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${isAdmin ? 'flex-row-reverse' : ''}`}>
                        {!isAdmin && (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
                            style={{ backgroundColor: `${selectedMember.color}20`, color: selectedMember.color }}
                          >
                            {selectedMember.avatar}
                          </div>
                        )}
                        <div>
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isAdmin
                                ? 'bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 text-white rounded-br-md'
                                : msg.aiPowered
                                  ? 'bg-gradient-to-br from-white/8 to-purple-500/5 text-white/90 rounded-bl-md border border-purple-500/10'
                                  : 'bg-white/8 text-white/90 rounded-bl-md'
                            }`}
                          >
                            {msg.text}
                            <div className={`flex items-center gap-1.5 mt-1.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                              {!isAdmin && msg.aiPowered && (
                                <span className="flex items-center gap-1 text-[9px] text-purple-400/70">
                                  <Sparkles className="size-2.5" />
                                  Claude
                                </span>
                              )}
                              <span className={`text-[9px] ${isAdmin ? 'text-[#00d9ff]/40' : 'text-white/25'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              {chatSending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: `${selectedMember.color}20`, color: selectedMember.color }}
                    >
                      {selectedMember.avatar}
                    </div>
                    {isStreaming && streamingText ? (
                      <div className="px-3.5 py-2.5 bg-gradient-to-br from-white/8 to-purple-500/5 rounded-2xl rounded-bl-md border border-purple-500/10 max-w-[85%]">
                        <div className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
                          {streamingText}
                          <span className="inline-block w-2 h-4 bg-purple-400/60 animate-pulse ml-0.5 rounded-sm align-text-bottom" />
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Sparkles className="size-2.5 text-purple-400/70" />
                          <span className="text-[9px] text-purple-400/50">Claude streaming...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-gradient-to-br from-white/8 to-purple-500/5 rounded-2xl rounded-bl-md border border-purple-500/10">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-3 text-purple-400 animate-pulse" />
                          <span className="text-[11px] text-purple-300/60">Thinking...</span>
                          <div className="flex gap-1 ml-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Message ${selectedMember.name}...`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00d9ff]/50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || chatSending}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black disabled:opacity-40 hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/30 text-center py-20">
            <MessageSquare className="size-16 mb-4 opacity-10" />
            <p className="text-sm mb-1">Select a team member</p>
            <p className="text-xs text-white/20">Choose someone from the list to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}