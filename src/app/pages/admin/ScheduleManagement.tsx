import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Music,
  Loader2,
  RefreshCw,
  ListMusic,
  ExternalLink,
  Power,
  PowerOff,
  Repeat,
  GripVertical,
  Zap,
  ChevronsUpDown,
  AlertTriangle,
  XCircle,
  Move,
  Copy,
  Undo2,
  Magnet,
  Bell,
  BellOff,
  Volume2,
  ArrowRightLeft,
  SlidersHorizontal,
  Play,
  Square,
  CheckSquare,
  Layers,
  CalendarDays,
  CalendarCheck2,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, getAccessToken } from '../../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { projectId } from '../../../../utils/supabase/info';

// ==================== TYPES ====================

interface JingleConfig {
  introJingleId: string | null;
  outroJingleId: string | null;
  jingleFrequencyOverride: number | null;
  disableJingles: boolean;
  jingleCategoryFilter: string[] | null;
}

interface ScheduleSlot {
  id: string;
  playlistId: string;
  playlistName?: string;
  playlistColor?: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  title: string;
  isActive: boolean;
  repeatWeekly: boolean;
  scheduleMode?: 'recurring' | 'one-time';
  scheduledDate?: string | null; // ISO date "2026-02-18" for one-time slots
  jingleConfig?: JingleConfig | null;
  createdAt?: string;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  color?: string;
  genre?: string;
  trackIds?: string[];
}

interface Jingle {
  id: string;
  title: string;
  duration: number;
  category: string;
  priority: number;
  active: boolean;
  playCount: number;
  storageFilename: string | null;
}

const JINGLE_CATEGORIES = [
  'station_id', 'transition', 'time_announcement', 'show_intro',
  'show_outro', 'commercial', 'sweeper', 'bumper', 'liner', 'other'
];

interface PendingBulkDelete {
  slots: ScheduleSlot[];
  timerId: ReturnType<typeof setTimeout>;
  toastId: string | number;
}

// ==================== CONSTANTS ====================

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
const CELL_HEIGHT = 56;
const UNDO_TIMEOUT_MS = 10000; // 10 seconds to undo

// ==================== POINTER-BASED DRAG SYSTEM ====================
// Replaces HTML5 DnD entirely — no effectAllowed/dropEffect/dataTransfer quirks.
// _startPointerDrag is set by the active ScheduleManagement instance so
// child components (DraggablePlaylist, ScheduleBlock) can initiate drags.
type DragPayload =
  | { type: 'playlist'; playlist: Playlist }
  | { type: 'block-move'; blockId: string };

let _startPointerDrag: ((payload: DragPayload, x: number, y: number) => void) | null = null;

/**
 * Finds which schedule cell (day, hour) is under the pointer.
 * First tries data attributes on DOM elements; falls back to coordinate math.
 */
function findCellAtPoint(
  x: number,
  y: number,
  gridContainer: HTMLElement | null
): { day: number; hour: number } | null {
  // Strategy 1 — walk up from element under cursor
  const el = document.elementFromPoint(x, y);
  if (el) {
    const cellEl = (el as Element).closest('[data-cell-day]');
    if (cellEl) {
      const day = parseInt(cellEl.getAttribute('data-cell-day') ?? '-1', 10);
      const hour = parseInt(cellEl.getAttribute('data-cell-hour') ?? '-1', 10);
      if (day >= 0 && hour >= 0) return { day, hour };
    }
  }

  // Strategy 2 — compute from scroll container + CELL_HEIGHT
  if (!gridContainer) return null;
  const tbody = gridContainer.querySelector('tbody');
  if (!tbody) return null;
  const tbodyRect = tbody.getBoundingClientRect();
  if (x < tbodyRect.left || x > tbodyRect.right || y < tbodyRect.top || y > tbodyRect.bottom) return null;

  const relY = y - tbodyRect.top + gridContainer.scrollTop;
  const hour = Math.floor(relY / CELL_HEIGHT);
  if (hour < 0 || hour > 23) return null;

  const firstRow = tbody.querySelector('tr');
  if (!firstRow) return null;
  const tds = firstRow.querySelectorAll('td');
  // td[0] = time label; td[1..7] = day columns
  for (let i = 1; i < tds.length && i <= 7; i++) {
    const rect = tds[i].getBoundingClientRect();
    if (x >= rect.left && x <= rect.right) return { day: i - 1, hour };
  }
  return null;
}

// ==================== UTILITIES ====================

function checkConflict(
  schedules: ScheduleSlot[],
  day: number | null,
  startH: number,
  endH: number,
  excludeId?: string
): ScheduleSlot | null {
  for (const s of schedules) {
    if (excludeId && s.id === excludeId) continue;
    const dayMatches = s.dayOfWeek === null || day === null || s.dayOfWeek === day;
    if (!dayMatches) continue;
    const sStart = parseInt(s.startTime.split(':')[0]);
    const sEnd = parseInt(s.endTime.split(':')[0]);
    if (startH < sEnd && endH > sStart) return s;
  }
  return null;
}

function formatHour(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

/**
 * Find the nearest free hour-slot on a given day for a block of `duration` hours.
 * Searches outward from `targetHour` (alternating up/down).
 * Returns the best startHour or null if none found.
 */
function findNearestFreeSlot(
  schedules: ScheduleSlot[],
  day: number,
  targetHour: number,
  duration: number,
  excludeId: string
): number | null {
  // Try the exact target first
  if (targetHour + duration <= 24) {
    const conflict = checkConflict(schedules, day, targetHour, targetHour + duration, excludeId);
    if (!conflict) return targetHour;
  }

  // Search outward
  for (let offset = 1; offset < 24; offset++) {
    // Try below (later)
    const below = targetHour + offset;
    if (below + duration <= 24) {
      const c = checkConflict(schedules, day, below, below + duration, excludeId);
      if (!c) return below;
    }
    // Try above (earlier)
    const above = targetHour - offset;
    if (above >= 0 && above + duration <= 24) {
      const c = checkConflict(schedules, day, above, above + duration, excludeId);
      if (!c) return above;
    }
  }
  return null;
}

// ==================== SCHEDULE MODE UTILITIES ====================

type ScheduleViewMode = 'all' | 'recurring' | 'this-week';

function getDateForDayInCurrentWeek(dayIndex: number): string {
  const now = new Date();
  const diff = dayIndex - now.getDay();
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  return target.toISOString().split('T')[0]; // "2026-02-18"
}

function getWeekBounds(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); // Sunday
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday
  end.setHours(23, 59, 59, 999);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
}

function isDateInCurrentWeek(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T12:00:00');
  const { start, end } = getWeekBounds();
  return date >= start && date <= end;
}

function isOneTimeExpired(slot: ScheduleSlot): boolean {
  if ((slot.scheduleMode || 'recurring') !== 'one-time') return false;
  if (!slot.scheduledDate) return true;
  const today = new Date().toISOString().split('T')[0];
  return slot.scheduledDate < today;
}

function getEffectiveMode(slot: ScheduleSlot): 'recurring' | 'one-time' {
  return slot.scheduleMode || 'recurring';
}

// ==================== DRAGGABLE PLAYLIST (SIDEBAR) ====================

function DraggablePlaylist({ playlist }: { playlist: Playlist }) {
  const [isDragging, setIsDragging] = useState(false);
  const color = playlist.color || '#00d9ff';

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    _startPointerDrag?.({ type: 'playlist', playlist }, e.clientX, e.clientY);
    const onUp = () => { setIsDragging(false); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] select-none touch-none ${isDragging ? 'opacity-40 scale-95' : ''}`}
      style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="size-3.5 text-white/20 flex-shrink-0" />
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}25` }}>
          <ListMusic className="size-3.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-cyan-100 truncate">{playlist.name}</p>
          <p className="text-xs text-cyan-100/40">
            {playlist.trackIds?.length || 0} tracks
            {playlist.genre && <> &bull; {playlist.genre}</>}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== SCHEDULE BLOCK (draggable + resizable + copy) ====================

function ScheduleBlock({
  block,
  schedules,
  highlightPlaylistId,
  onDelete,
  onToggleActive,
  onClickBlock,
  onEditBlock,
  onResizeCommit,
  onCopyBlock,
}: {
  block: ScheduleSlot;
  schedules: ScheduleSlot[];
  highlightPlaylistId: string | null;
  onDelete: (id: string) => void;
  onToggleActive: (slot: ScheduleSlot) => void;
  onClickBlock: (playlistId: string) => void;
  onEditBlock: (slot: ScheduleSlot) => void;
  onResizeCommit: (id: string, newEndTime: string) => void;
  onCopyBlock: (slot: ScheduleSlot) => void;
}) {
  const startH = parseInt(block.startTime.split(':')[0]);
  const endH = parseInt(block.endTime.split(':')[0]);
  const color = block.playlistColor || '#00d9ff';
  const isHighlighted = block.playlistId === highlightPlaylistId;

  const [resizeEndH, setResizeEndH] = useState<number | null>(null);
  const [resizeConflict, setResizeConflict] = useState<ScheduleSlot | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const origEndH = useRef(endH);

  const effectiveEndH = resizeEndH ?? endH;
  const duration = effectiveEndH - startH;

  const handleBlockPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    _startPointerDrag?.({ type: 'block-move', blockId: block.id }, e.clientX, e.clientY);
    const onUp = () => { setIsDragging(false); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointerup', onUp);
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    startY.current = e.clientY;
    origEndH.current = endH;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = ev.clientY - startY.current;
      const hourDelta = Math.round(delta / CELL_HEIGHT);
      const newEndH = Math.max(startH + 1, Math.min(24, origEndH.current + hourDelta));
      const conflict = checkConflict(schedules, block.dayOfWeek, startH, newEndH, block.id);
      setResizeConflict(conflict);
      setResizeEndH(newEndH);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setResizeEndH(prev => {
        if (prev === null || prev === endH) return null;
        const conflict = checkConflict(schedules, block.dayOfWeek, startH, prev, block.id);
        if (conflict) {
          toast.error(`Conflict with "${conflict.title || conflict.playlistName}" (${conflict.startTime}–${conflict.endTime})`);
          setResizeConflict(null);
          return null;
        }
        onResizeCommit(block.id, formatHour(prev));
        setResizeConflict(null);
        return null;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [block, schedules, startH, endH, onResizeCommit]);

  return (
    <div
      className={`absolute inset-x-0 top-0 mx-0.5 mt-0.5 rounded-md overflow-visible group transition-opacity duration-200 ${
        !block.isActive ? 'opacity-50' : ''
      } ${isHighlighted ? 'ring-2 ring-[#00ffaa] ring-offset-1 ring-offset-transparent' : ''}
      ${resizeConflict ? 'ring-2 ring-red-500/60' : ''}`}
      style={{
        height: `${duration * CELL_HEIGHT - 4}px`,
        backgroundColor: resizeConflict ? 'rgba(239,68,68,0.15)' : isHighlighted ? `${color}35` : `${color}20`,
        borderLeft: `3px solid ${resizeConflict ? '#ef4444' : color}`,
        zIndex: isDragging ? 30 : 10,
        opacity: isDragging ? 0.3 : undefined,
      }}
    >
      <div className="p-1.5 h-full flex flex-col relative">
        {/* Jingle Timeline Markers — Intro marker at top */}
        {block.jingleConfig?.introJingleId && !block.jingleConfig?.disableJingles && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5" title="Intro jingle triggers here">
            <span className="w-2 h-2 rounded-full bg-green-400 ring-2 ring-green-400/30 animate-pulse" />
            <span className="text-[8px] text-green-400/80 font-medium hidden group-hover:inline whitespace-nowrap">IN</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-1 flex-1 min-w-0">
            <div
              onPointerDown={handleBlockPointerDown}
              className="mt-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 select-none touch-none"
              title="Drag to move"
            >
              <Move className="size-2.5 text-white/40" />
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClickBlock(block.playlistId)} title={`Open "${block.playlistName}" playlist`}>
              <p className="text-[11px] font-semibold text-white truncate leading-tight">
                {block.title || block.playlistName}
                {block.jingleConfig && (block.jingleConfig.introJingleId || block.jingleConfig.outroJingleId || block.jingleConfig.disableJingles) && (
                  <Bell className="inline-block size-2.5 ml-1 text-amber-400/70 align-text-top" />
                )}
              </p>
              <p className="text-[10px] text-white/50 truncate">
                {block.startTime}–{resizeEndH !== null ? formatHour(resizeEndH) : block.endTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onCopyBlock(block)} className="p-0.5 hover:bg-white/10 rounded" title="Copy to another day">
              <Copy className="size-2.5 text-[#00d9ff]/70" />
            </button>
            <button onClick={() => onEditBlock(block)} className="p-0.5 hover:bg-white/10 rounded" title="Edit">
              <Edit2 className="size-2.5 text-white/60" />
            </button>
            <button onClick={() => onToggleActive(block)} className="p-0.5 hover:bg-white/10 rounded" title={block.isActive ? 'Deactivate' : 'Activate'}>
              {block.isActive ? <Power className="size-2.5 text-green-400" /> : <PowerOff className="size-2.5 text-red-400" />}
            </button>
            <button onClick={() => onDelete(block.id)} className="p-0.5 hover:bg-red-500/20 rounded" title="Delete">
              <Trash2 className="size-2.5 text-red-400/70" />
            </button>
          </div>
        </div>

        {resizeConflict && (
          <div className="mt-1 px-1 py-0.5 bg-red-500/20 rounded text-[9px] text-red-300 flex items-center gap-1">
            <AlertTriangle className="size-2.5 flex-shrink-0" />
            <span className="truncate">Conflict: {resizeConflict.title || resizeConflict.playlistName}</span>
          </div>
        )}

        {duration >= 2 && !resizeConflict && (
          <div className="mt-auto flex items-center gap-1 flex-wrap pb-2">
            {/* Schedule mode badge */}
            {getEffectiveMode(block) === 'one-time' ? (
              <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] ${
                isOneTimeExpired(block)
                  ? 'bg-red-500/15 text-red-400/60 line-through'
                  : 'bg-amber-500/15 text-amber-400/80'
              }`} title={block.scheduledDate ? `Scheduled for ${block.scheduledDate}` : 'One-time'}>
                <CalendarCheck2 className="size-2" /> {block.scheduledDate ? new Date(block.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'One-time'}
              </span>
            ) : (
              <>
                {block.repeatWeekly && (
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-white/10 rounded text-[9px] text-white/50">
                    <Repeat className="size-2" /> Weekly
                  </span>
                )}
              </>
            )}
            {block.dayOfWeek === null && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-[#00ffaa]/15 rounded text-[9px] text-[#00ffaa]/70">
                Daily
              </span>
            )}
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: `${color}20`, color: `${color}cc` }}>
              <ListMusic className="size-2" /> Playlist
            </span>
            {/* Jingle integration indicators */}
            {block.jingleConfig?.disableJingles && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-red-500/15 rounded text-[9px] text-red-400/70" title="Jingles disabled">
                <BellOff className="size-2" /> No Jingles
              </span>
            )}
            {block.jingleConfig?.introJingleId && !block.jingleConfig?.disableJingles && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-500/15 rounded text-[9px] text-amber-400/70" title="Has intro jingle">
                <Bell className="size-2" /> Intro
              </span>
            )}
            {block.jingleConfig?.outroJingleId && !block.jingleConfig?.disableJingles && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-500/15 rounded text-[9px] text-amber-400/70" title="Has outro jingle">
                <Bell className="size-2" /> Outro
              </span>
            )}
            {block.jingleConfig?.jingleFrequencyOverride && !block.jingleConfig?.disableJingles && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-purple-500/15 rounded text-[9px] text-purple-400/70" title={`Jingle every ${block.jingleConfig.jingleFrequencyOverride} tracks`}>
                <SlidersHorizontal className="size-2" /> /{block.jingleConfig.jingleFrequencyOverride}tr
              </span>
            )}
          </div>
        )}

        {/* Jingle Timeline Markers — Outro marker at bottom */}
        {block.jingleConfig?.outroJingleId && !block.jingleConfig?.disableJingles && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5" title="Outro jingle triggers here">
            <span className="w-2 h-2 rounded-full bg-orange-400 ring-2 ring-orange-400/30 animate-pulse" />
            <span className="text-[8px] text-orange-400/80 font-medium hidden group-hover:inline whitespace-nowrap">OUT</span>
          </div>
        )}

        {/* Frequency override — repeating marker dots along the left edge */}
        {block.jingleConfig?.jingleFrequencyOverride && !block.jingleConfig?.disableJingles && duration >= 2 && (
          <div className="absolute left-0.5 top-0 bottom-0 w-1 flex flex-col items-center justify-evenly py-4 z-[5] pointer-events-none">
            {Array.from({ length: Math.min(Math.floor(duration), 6) }, (_, i) => (
              <span key={i} className="w-1 h-1 rounded-full bg-purple-400/60" title={`Jingle every ${block.jingleConfig!.jingleFrequencyOverride} tracks`} />
            ))}
          </div>
        )}

        {/* Disabled mute icon (always visible) */}
        {block.jingleConfig?.disableJingles && (
          <div className="absolute top-1 right-1 z-[5] pointer-events-none">
            <BellOff className="size-3 text-red-400/40" />
          </div>
        )}

        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.3))' }}
        >
          <ChevronsUpDown className="size-2.5 text-white/60" />
        </div>
      </div>
    </div>
  );
}

// ==================== SCHEDULE CELL ====================

function ScheduleCell({
  day,
  hour,
  schedules,
  hiddenScheduleIds,
  isOver,
  onDelete,
  onToggleActive,
  onClickBlock,
  onEditBlock,
  highlightPlaylistId,
  onResizeCommit,
  onCopyBlock,
}: {
  day: number;
  hour: number;
  schedules: ScheduleSlot[];
  hiddenScheduleIds: Set<string>;
  isOver: boolean;
  onDelete: (id: string) => void;
  onToggleActive: (slot: ScheduleSlot) => void;
  onClickBlock: (playlistId: string) => void;
  onEditBlock: (slot: ScheduleSlot) => void;
  highlightPlaylistId: string | null;
  onResizeCommit: (id: string, newEndTime: string) => void;
  onCopyBlock: (slot: ScheduleSlot) => void;
}) {
  const cellBlocks = schedules.filter(block => {
    if (hiddenScheduleIds.has(block.id)) return false;
    const matchesDay = block.dayOfWeek === day || block.dayOfWeek === null;
    return matchesDay && parseInt(block.startTime.split(':')[0]) === hour;
  });

  const isOccupied = schedules.some(block => {
    const matchesDay = block.dayOfWeek === day || block.dayOfWeek === null;
    if (!matchesDay) return false;
    const startH = parseInt(block.startTime.split(':')[0]);
    const endH = parseInt(block.endTime.split(':')[0]);
    return hour > startH && hour < endH;
  });

  return (
    <div
      data-cell-day={day}
      data-cell-hour={hour}
      className={`relative h-full min-h-[56px] transition-colors border-b border-r border-white/5 ${
        isOver ? 'bg-[#00d9ff]/10 ring-1 ring-inset ring-[#00d9ff]/20' : isOccupied ? 'bg-white/[0.02]' : 'hover:bg-white/[0.02]'
      }`}
    >
      {cellBlocks.map(block => (
        <ScheduleBlock
          key={block.id}
          block={block}
          schedules={schedules}
          highlightPlaylistId={highlightPlaylistId}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          onClickBlock={onClickBlock}
          onEditBlock={onEditBlock}
          onResizeCommit={onResizeCommit}
          onCopyBlock={onCopyBlock}
        />
      ))}
    </div>
  );
}

// ==================== COPY SLOT DIALOG ====================

function CopySlotDialog({
  slot,
  schedules,
  open,
  onOpenChange,
  onCopy,
}: {
  slot: ScheduleSlot;
  schedules: ScheduleSlot[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: (slot: ScheduleSlot, targetDays: number[]) => void;
}) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const startH = parseInt(slot.startTime.split(':')[0]);
  const endH = parseInt(slot.endTime.split(':')[0]);
  const color = slot.playlistColor || '#00d9ff';

  // Determine which days already have this slot or would conflict
  const dayStatus = useMemo(() => {
    return DAYS_OF_WEEK.map((_, dayIndex) => {
      // Already on this day?
      if (slot.dayOfWeek === dayIndex || slot.dayOfWeek === null) return 'current';
      // Conflict?
      const conflict = checkConflict(schedules, dayIndex, startH, endH);
      if (conflict) return 'conflict';
      return 'available';
    });
  }, [slot, schedules, startH, endH]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev =>
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleCopy = () => {
    if (selectedDays.length === 0) {
      toast.error('Select at least one day');
      return;
    }
    onCopy(slot, selectedDays);
    onOpenChange(false);
    setSelectedDays([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelectedDays([]); }}>
      <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-5 text-[#00d9ff]" />
            Copy Slot to Days
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Slot preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}>
            <ListMusic className="size-4 flex-shrink-0" style={{ color }} />
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{slot.title || slot.playlistName}</p>
              <p className="text-white/40 text-xs">
                {slot.dayOfWeek !== null ? DAYS_SHORT[slot.dayOfWeek] : 'Daily'} {slot.startTime}–{slot.endTime}
              </p>
            </div>
          </div>

          {/* Day picker */}
          <div>
            <Label className="text-white/80 mb-2 block">Select target days:</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_SHORT.map((day, index) => {
                const status = dayStatus[index];
                const isSelected = selectedDays.includes(index);
                const isCurrent = status === 'current';
                const isConflict = status === 'conflict';

                return (
                  <button
                    key={index}
                    onClick={() => !isCurrent && toggleDay(index)}
                    disabled={isCurrent}
                    className={`p-2 rounded-lg text-xs font-medium transition-all relative ${
                      isCurrent
                        ? 'bg-white/5 text-white/20 cursor-not-allowed'
                        : isSelected
                          ? isConflict
                            ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                            : 'bg-[#00d9ff]/20 text-[#00d9ff] ring-1 ring-[#00d9ff]/40'
                          : isConflict
                            ? 'bg-white/5 text-amber-400/50 hover:bg-amber-500/10'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                    title={isCurrent ? 'Already on this day' : isConflict ? 'Time conflict — will snap to nearest free slot' : `Copy to ${DAYS_OF_WEEK[index]}`}
                  >
                    {day}
                    {isCurrent && <span className="block text-[8px] text-white/20 mt-0.5">here</span>}
                    {isConflict && !isCurrent && (
                      <Magnet className="size-2 absolute top-0.5 right-0.5 text-amber-400/50" />
                    )}
                  </button>
                );
              })}
            </div>
            {selectedDays.some(d => dayStatus[d] === 'conflict') && (
              <p className="mt-2 text-[11px] text-amber-400/70 flex items-center gap-1.5">
                <Magnet className="size-3 flex-shrink-0" />
                Days with conflicts will snap to the nearest free slot
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => { onOpenChange(false); setSelectedDays([]); }} className="flex-1 border-white/10 text-white/70">
              Cancel
            </Button>
            <Button
              onClick={handleCopy}
              disabled={selectedDays.length === 0}
              className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold disabled:opacity-40"
            >
              <Copy className="size-4 mr-2" />
              Copy to {selectedDays.length} Day{selectedDays.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== BULK DELETE DIALOG ====================

function BulkDeleteDialog({
  open,
  onOpenChange,
  targetPlaylistName,
  count,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlaylistName: string | null;
  count: number;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f1c2e] border-red-500/30 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="size-5" />
            Clear Schedule Slots
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-white/70 text-sm">
            {targetPlaylistName
              ? <>Delete <strong className="text-white">{count}</strong> slot{count !== 1 ? 's' : ''} for <strong className="text-white">"{targetPlaylistName}"</strong>?</>
              : <>Delete <strong className="text-red-400">{count}</strong> schedule slot{count !== 1 ? 's' : ''}?</>
            }
          </p>
          <p className="text-white/40 text-xs flex items-center gap-1.5">
            <Undo2 className="size-3 flex-shrink-0" />
            You'll have {UNDO_TIMEOUT_MS / 1000} seconds to undo this action
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-white/10 text-white/70">
              Cancel
            </Button>
            <Button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold">
              <Trash2 className="size-4 mr-2" />
              Delete {count} Slot{count !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== BATCH JINGLE ASSIGN DIALOG ====================

function BatchJingleDialog({
  schedules,
  jingles,
  open,
  onOpenChange,
  onBatchApply,
}: {
  schedules: ScheduleSlot[];
  jingles: Jingle[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchApply: (slotIds: string[], config: JingleConfig) => void;
}) {
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<JingleConfig>({
    introJingleId: null, outroJingleId: null,
    jingleFrequencyOverride: null, disableJingles: false, jingleCategoryFilter: null,
  });
  const [filterDay, setFilterDay] = useState<number | 'all'>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'with_jingles' | 'without_jingles'>('all');

  const activeJingles = jingles.filter(j => j.active);

  const filteredSlots = useMemo(() => {
    let slots = schedules.filter(s => s.isActive);
    if (filterDay !== 'all') {
      slots = slots.filter(s => s.dayOfWeek === filterDay || s.dayOfWeek === null);
    }
    if (filterMode === 'with_jingles') {
      slots = slots.filter(s => s.jingleConfig && (s.jingleConfig.introJingleId || s.jingleConfig.outroJingleId || s.jingleConfig.disableJingles));
    } else if (filterMode === 'without_jingles') {
      slots = slots.filter(s => !s.jingleConfig || (!s.jingleConfig.introJingleId && !s.jingleConfig.outroJingleId && !s.jingleConfig.disableJingles));
    }
    return slots.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return (a.dayOfWeek ?? -1) - (b.dayOfWeek ?? -1);
      return a.startTime.localeCompare(b.startTime);
    });
  }, [schedules, filterDay, filterMode]);

  const toggleSlot = (id: string) => {
    setSelectedSlotIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const allIds = filteredSlots.map(s => s.id);
    const allSelected = allIds.every(id => selectedSlotIds.has(id));
    if (allSelected) {
      setSelectedSlotIds(new Set());
    } else {
      setSelectedSlotIds(new Set(allIds));
    }
  };

  const handleApply = () => {
    if (selectedSlotIds.size === 0) {
      toast.error('Select at least one slot');
      return;
    }
    onBatchApply(Array.from(selectedSlotIds), config);
    onOpenChange(false);
    setSelectedSlotIds(new Set());
  };

  const toggleCategory = (cat: string) => {
    const current = config.jingleCategoryFilter || [];
    const updated = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    setConfig({ ...config, jingleCategoryFilter: updated.length > 0 ? updated : null });
  };

  const allFilteredSelected = filteredSlots.length > 0 && filteredSlots.every(s => selectedSlotIds.has(s.id));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelectedSlotIds(new Set()); }}>
      <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-5 text-amber-400" /> Batch Assign Jingle Config
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 mt-2">
          {/* Left — Slot selection */}
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterDay === 'all' ? 'all' : filterDay.toString()}
                onChange={e => setFilterDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="h-8 px-2 rounded-md bg-[#0a1628] border border-white/10 text-white text-xs"
              >
                <option value="all">All Days</option>
                {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <select
                value={filterMode}
                onChange={e => setFilterMode(e.target.value as any)}
                className="h-8 px-2 rounded-md bg-[#0a1628] border border-white/10 text-white text-xs"
              >
                <option value="all">All Slots</option>
                <option value="with_jingles">With Jingles</option>
                <option value="without_jingles">Without Jingles</option>
              </select>
              <button
                onClick={toggleAll}
                className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${
                  allFilteredSelected ? 'bg-[#00d9ff]/20 text-[#00d9ff]' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {allFilteredSelected ? 'Deselect All' : 'Select All'} ({filteredSlots.length})
              </button>
            </div>

            {/* Slot list */}
            <div className="max-h-[320px] overflow-y-auto space-y-1 pr-1">
              {filteredSlots.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-xs">
                  No matching slots
                </div>
              ) : (
                filteredSlots.map(slot => {
                  const isSelected = selectedSlotIds.has(slot.id);
                  const color = slot.playlistColor || '#00d9ff';
                  const hasJingle = slot.jingleConfig && (slot.jingleConfig.introJingleId || slot.jingleConfig.outroJingleId || slot.jingleConfig.disableJingles);
                  return (
                    <button
                      key={slot.id}
                      onClick={() => toggleSlot(slot.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-[#00d9ff]/10 ring-1 ring-[#00d9ff]/30'
                          : 'bg-white/[0.02] hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-[#00d9ff] text-[#0a1628]' : 'bg-white/10'
                      }`}>
                        {isSelected && <CheckSquare className="size-3" />}
                      </div>
                      <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate font-medium">{slot.title || slot.playlistName}</p>
                        <p className="text-[10px] text-white/40">
                          {slot.dayOfWeek !== null ? DAYS_SHORT[slot.dayOfWeek] : 'Daily'} {slot.startTime}–{slot.endTime}
                        </p>
                      </div>
                      {hasJingle && <Bell className="size-3 text-amber-400/60 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="text-xs text-white/30 pt-1 border-t border-white/5">
              {selectedSlotIds.size} slot{selectedSlotIds.size !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Right — Jingle config to apply */}
          <div className="space-y-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <h3 className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <Bell className="size-3.5 text-amber-400" /> Config to Apply
            </h3>

            {/* Disable toggle */}
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-white/5">
              <input type="checkbox" checked={config.disableJingles} onChange={e => setConfig({ ...config, disableJingles: e.target.checked })} className="rounded bg-[#0a1628] border-white/20" />
              <BellOff className="size-3 text-red-400" />
              <span className="text-xs text-white/60">Disable jingles</span>
            </label>

            {!config.disableJingles && (
              <>
                {/* Intro */}
                <div>
                  <Label className="text-white/60 text-[10px] flex items-center gap-1 mb-1">
                    <ArrowRightLeft className="size-2.5 text-green-400" /> Intro
                  </Label>
                  <select value={config.introJingleId || ''} onChange={e => setConfig({ ...config, introJingleId: e.target.value || null })} className="w-full h-8 px-2 rounded bg-[#0a1628] border border-white/10 text-white text-[11px]">
                    <option value="">— None —</option>
                    {activeJingles.map(j => <option key={j.id} value={j.id}>{j.title} ({j.duration}s)</option>)}
                  </select>
                </div>

                {/* Outro */}
                <div>
                  <Label className="text-white/60 text-[10px] flex items-center gap-1 mb-1">
                    <ArrowRightLeft className="size-2.5 text-orange-400" /> Outro
                  </Label>
                  <select value={config.outroJingleId || ''} onChange={e => setConfig({ ...config, outroJingleId: e.target.value || null })} className="w-full h-8 px-2 rounded bg-[#0a1628] border border-white/10 text-white text-[11px]">
                    <option value="">— None —</option>
                    {activeJingles.map(j => <option key={j.id} value={j.id}>{j.title} ({j.duration}s)</option>)}
                  </select>
                </div>

                {/* Frequency */}
                <div>
                  <Label className="text-white/60 text-[10px] flex items-center gap-1 mb-1">
                    <SlidersHorizontal className="size-2.5 text-purple-400" /> Frequency
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min={0} max={50} placeholder="—" value={config.jingleFrequencyOverride ?? ''} onChange={e => { const val = e.target.value ? parseInt(e.target.value) : null; setConfig({ ...config, jingleFrequencyOverride: val && val > 0 ? val : null }); }} className="flex-1 h-8 px-2 rounded bg-[#0a1628] border border-white/10 text-white text-[11px] placeholder:text-white/20" />
                    <span className="text-white/30 text-[10px]">tracks</span>
                  </div>
                </div>

                {/* Category filter */}
                <div>
                  <Label className="text-white/60 text-[10px] flex items-center gap-1 mb-1.5">
                    <Volume2 className="size-2.5 text-cyan-400" /> Categories
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {JINGLE_CATEGORIES.map(cat => {
                      const isOn = config.jingleCategoryFilter?.includes(cat);
                      return (
                        <button key={cat} onClick={() => toggleCategory(cat)} className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${isOn ? 'bg-[#00d9ff]/20 text-[#00d9ff] ring-1 ring-[#00d9ff]/30' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                          {cat.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={handleApply}
              disabled={selectedSlotIds.size === 0}
              className="w-full bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold disabled:opacity-40 text-xs h-9"
            >
              <Layers className="size-3.5 mr-1.5" />
              Apply to {selectedSlotIds.size} Slot{selectedSlotIds.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== EDIT DIALOG (with Jingle Integration) ====================

function EditScheduleDialog({
  slot,
  playlists,
  jingles,
  open,
  onOpenChange,
  onSave,
}: {
  slot: ScheduleSlot;
  playlists: Playlist[];
  jingles: Jingle[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<ScheduleSlot>) => void;
}) {
  const [form, setForm] = useState({
    title: slot.title,
    playlistId: slot.playlistId,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    repeatWeekly: slot.repeatWeekly,
    scheduleMode: (slot.scheduleMode || 'recurring') as 'recurring' | 'one-time',
    scheduledDate: slot.scheduledDate || (slot.dayOfWeek !== null ? getDateForDayInCurrentWeek(slot.dayOfWeek) : null),
  });

  const defaultJingleConfig: JingleConfig = {
    introJingleId: null, outroJingleId: null,
    jingleFrequencyOverride: null, disableJingles: false, jingleCategoryFilter: null,
  };

  const [jingleConfig, setJingleConfig] = useState<JingleConfig>(slot.jingleConfig || defaultJingleConfig);
  const [showJingleSection, setShowJingleSection] = useState(
    !!(slot.jingleConfig?.introJingleId || slot.jingleConfig?.outroJingleId || slot.jingleConfig?.disableJingles || slot.jingleConfig?.jingleFrequencyOverride || slot.jingleConfig?.jingleCategoryFilter?.length)
  );

  // Audio preview state
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
    }
    setPreviewPlayingId(null);
    previewAudioRef.current = null;
  }, []);

  const playPreview = useCallback(async (jingleId: string) => {
    stopPreview();
    if (previewPlayingId === jingleId) return; // toggle off
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/jingles/${jingleId}/audio`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to get audio URL');
      const { audioUrl } = await res.json();
      const audio = new Audio(audioUrl);
      audio.volume = 0.7;
      audio.onended = () => { setPreviewPlayingId(null); previewAudioRef.current = null; };
      audio.onerror = () => { setPreviewPlayingId(null); previewAudioRef.current = null; toast.error('Playback error'); };
      await audio.play();
      setPreviewPlayingId(jingleId);
      previewAudioRef.current = audio;
    } catch (e) {
      console.error('Preview error:', e);
      toast.error('Failed to play preview');
    }
  }, [previewPlayingId, stopPreview]);

  // Cleanup audio on unmount/close
  useEffect(() => { return () => stopPreview(); }, [stopPreview]);

  useEffect(() => {
    setForm({ title: slot.title, playlistId: slot.playlistId, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime, repeatWeekly: slot.repeatWeekly, scheduleMode: (slot.scheduleMode || 'recurring') as 'recurring' | 'one-time', scheduledDate: slot.scheduledDate || (slot.dayOfWeek !== null ? getDateForDayInCurrentWeek(slot.dayOfWeek) : null) });
    setJingleConfig(slot.jingleConfig || defaultJingleConfig);
    setShowJingleSection(!!(slot.jingleConfig?.introJingleId || slot.jingleConfig?.outroJingleId || slot.jingleConfig?.disableJingles || slot.jingleConfig?.jingleFrequencyOverride || slot.jingleConfig?.jingleCategoryFilter?.length));
    stopPreview();
  }, [slot, stopPreview]);

  const activeJingles = jingles.filter(j => j.active);
  const hasJingleChanges = showJingleSection && (jingleConfig.introJingleId || jingleConfig.outroJingleId || jingleConfig.disableJingles || jingleConfig.jingleFrequencyOverride || (jingleConfig.jingleCategoryFilter && jingleConfig.jingleCategoryFilter.length > 0));

  const handleSave = () => {
    stopPreview();
    const updates: any = {
      ...form,
      jingleConfig: showJingleSection ? jingleConfig : defaultJingleConfig,
      scheduleMode: form.scheduleMode,
      scheduledDate: form.scheduleMode === 'one-time' ? form.scheduledDate : null,
      // If switching to one-time, ensure repeatWeekly is false
      repeatWeekly: form.scheduleMode === 'one-time' ? false : form.repeatWeekly,
    };
    onSave(slot.id, updates);
    onOpenChange(false);
  };

  const toggleCategory = (cat: string) => {
    const current = jingleConfig.jingleCategoryFilter || [];
    const updated = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    setJingleConfig({ ...jingleConfig, jingleCategoryFilter: updated.length > 0 ? updated : null });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopPreview(); onOpenChange(v); }}>
      <DialogContent className="bg-[#0f1c2e] border-[#00d9ff]/30 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit2 className="size-5 text-[#00d9ff]" /> Edit Schedule Slot</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-white/80">Title</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="bg-[#0a1628] border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-white/80">Playlist</Label>
            <select value={form.playlistId} onChange={e => { const pl = playlists.find(p => p.id === e.target.value); setForm({ ...form, playlistId: e.target.value, title: pl?.name || form.title }); }} className="w-full h-10 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-sm">
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/80">Start Time</Label>
              <select value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full h-10 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-sm">
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-white/80">End Time</Label>
              <select value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="w-full h-10 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-sm">
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-white/80">Day of Week</Label>
            <select value={form.dayOfWeek === null ? 'daily' : form.dayOfWeek.toString()} onChange={e => setForm({ ...form, dayOfWeek: e.target.value === 'daily' ? null : parseInt(e.target.value) })} className="w-full h-10 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-sm">
              <option value="daily">Every Day</option>
              {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          {/* ═══════════ SCHEDULE MODE ═══════════ */}
          <div>
            <Label className="text-white/80 mb-2 block">Schedule Mode</Label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => setForm({ ...form, scheduleMode: 'recurring', repeatWeekly: true })}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-all ${
                  form.scheduleMode === 'recurring'
                    ? 'bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 text-[#00d9ff] border-r border-[#00d9ff]/30'
                    : 'bg-[#0a1628] text-white/40 hover:text-white/60 border-r border-white/10'
                }`}
              >
                <Repeat className="size-4" /> Recurring
              </button>
              <button
                type="button"
                onClick={() => {
                  const date = form.dayOfWeek !== null ? getDateForDayInCurrentWeek(form.dayOfWeek) : getDateForDayInCurrentWeek(new Date().getDay());
                  setForm({ ...form, scheduleMode: 'one-time', repeatWeekly: false, scheduledDate: date });
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-all ${
                  form.scheduleMode === 'one-time'
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400'
                    : 'bg-[#0a1628] text-white/40 hover:text-white/60'
                }`}
              >
                <CalendarCheck2 className="size-4" /> This Week Only
              </button>
            </div>
          </div>

          {/* One-time: date picker */}
          <AnimatePresence>
            {form.scheduleMode === 'one-time' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div>
                  <Label className="text-amber-400/80 text-xs flex items-center gap-1.5 mb-1">
                    <CalendarCheck2 className="size-3" /> Scheduled Date
                  </Label>
                  <Input
                    type="date"
                    value={form.scheduledDate || ''}
                    onChange={e => {
                      const date = e.target.value;
                      // Sync dayOfWeek from chosen date
                      const dayOfWeek = date ? new Date(date + 'T12:00:00').getDay() : form.dayOfWeek;
                      setForm({ ...form, scheduledDate: date, dayOfWeek });
                    }}
                    className="bg-[#0a1628] border-amber-500/20 text-white"
                  />
                  {form.scheduledDate && (
                    <p className="text-[10px] text-amber-400/50 mt-1">
                      {new Date(form.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      {isOneTimeExpired({ ...slot, scheduledDate: form.scheduledDate, scheduleMode: 'one-time' }) && (
                        <span className="text-red-400 ml-2">(expired — date is in the past)</span>
                      )}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Repeat weekly (only for recurring) */}
          {form.scheduleMode === 'recurring' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.repeatWeekly} onChange={e => setForm({ ...form, repeatWeekly: e.target.checked })} className="rounded bg-[#0a1628] border-white/20" />
              <span className="text-sm text-white/70">Repeat weekly</span>
            </label>
          )}

          {/* ═══════════ JINGLE INTEGRATION SECTION ═══════════ */}
          <div className="border-t border-white/10 pt-3">
            <button onClick={() => setShowJingleSection(!showJingleSection)} className="flex items-center justify-between w-full group">
              <span className="flex items-center gap-2 text-sm font-medium text-white/90">
                <Bell className="size-4 text-amber-400" />
                Jingle Integration
                {hasJingleChanges && <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-500/20 rounded text-[10px] text-amber-300 font-normal">Configured</span>}
              </span>
              <ChevronsUpDown className="size-4 text-white/40 group-hover:text-white/60 transition-colors" />
            </button>

            <AnimatePresence>
              {showJingleSection && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="space-y-3 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                      <input type="checkbox" checked={jingleConfig.disableJingles} onChange={e => setJingleConfig({ ...jingleConfig, disableJingles: e.target.checked })} className="rounded bg-[#0a1628] border-white/20" />
                      <BellOff className="size-3.5 text-red-400" />
                      <span className="text-sm text-white/70">Disable all jingles during this slot</span>
                    </label>

                    {!jingleConfig.disableJingles && (
                      <>
                        <div>
                          <Label className="text-white/70 text-xs flex items-center gap-1.5 mb-1">
                            <ArrowRightLeft className="size-3 text-green-400" /> Intro Jingle (plays when slot starts)
                          </Label>
                          <div className="flex items-center gap-1.5">
                            <select value={jingleConfig.introJingleId || ''} onChange={e => { stopPreview(); setJingleConfig({ ...jingleConfig, introJingleId: e.target.value || null }); }} className="flex-1 h-9 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-xs">
                              <option value="">— None —</option>
                              {activeJingles.map(j => <option key={j.id} value={j.id}>{j.title} ({j.category.replace(/_/g, ' ')}, {j.duration}s)</option>)}
                            </select>
                            {jingleConfig.introJingleId && (() => {
                              const j = jingles.find(x => x.id === jingleConfig.introJingleId);
                              return j?.storageFilename ? (
                                <button
                                  onClick={() => previewPlayingId === j.id ? stopPreview() : playPreview(j.id)}
                                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    previewPlayingId === j.id
                                      ? 'bg-green-500/30 text-green-300 ring-1 ring-green-400/50'
                                      : 'bg-white/5 text-white/40 hover:bg-green-500/15 hover:text-green-400'
                                  }`}
                                  title={previewPlayingId === j.id ? 'Stop preview' : `Preview: ${j.title}`}
                                >
                                  {previewPlayingId === j.id ? <Square className="size-3" /> : <Play className="size-3" />}
                                </button>
                              ) : null;
                            })()}
                          </div>
                          {jingleConfig.introJingleId && (() => {
                            const j = jingles.find(x => x.id === jingleConfig.introJingleId);
                            return j ? (
                              <p className="text-[10px] text-green-400/50 mt-0.5">{j.duration}s &bull; {j.category.replace(/_/g, ' ')}</p>
                            ) : null;
                          })()}
                        </div>

                        <div>
                          <Label className="text-white/70 text-xs flex items-center gap-1.5 mb-1">
                            <ArrowRightLeft className="size-3 text-orange-400" /> Outro Jingle (plays when slot ends)
                          </Label>
                          <div className="flex items-center gap-1.5">
                            <select value={jingleConfig.outroJingleId || ''} onChange={e => { stopPreview(); setJingleConfig({ ...jingleConfig, outroJingleId: e.target.value || null }); }} className="flex-1 h-9 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-xs">
                              <option value="">— None —</option>
                              {activeJingles.map(j => <option key={j.id} value={j.id}>{j.title} ({j.category.replace(/_/g, ' ')}, {j.duration}s)</option>)}
                            </select>
                            {jingleConfig.outroJingleId && (() => {
                              const j = jingles.find(x => x.id === jingleConfig.outroJingleId);
                              return j?.storageFilename ? (
                                <button
                                  onClick={() => previewPlayingId === j.id ? stopPreview() : playPreview(j.id)}
                                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    previewPlayingId === j.id
                                      ? 'bg-orange-500/30 text-orange-300 ring-1 ring-orange-400/50'
                                      : 'bg-white/5 text-white/40 hover:bg-orange-500/15 hover:text-orange-400'
                                  }`}
                                  title={previewPlayingId === j.id ? 'Stop preview' : `Preview: ${j.title}`}
                                >
                                  {previewPlayingId === j.id ? <Square className="size-3" /> : <Play className="size-3" />}
                                </button>
                              ) : null;
                            })()}
                          </div>
                          {jingleConfig.outroJingleId && (() => {
                            const j = jingles.find(x => x.id === jingleConfig.outroJingleId);
                            return j ? (
                              <p className="text-[10px] text-orange-400/50 mt-0.5">{j.duration}s &bull; {j.category.replace(/_/g, ' ')}</p>
                            ) : null;
                          })()}
                        </div>

                        <div>
                          <Label className="text-white/70 text-xs flex items-center gap-1.5 mb-1">
                            <SlidersHorizontal className="size-3 text-purple-400" /> Frequency Override (play jingle every N tracks)
                          </Label>
                          <div className="flex items-center gap-2">
                            <input type="number" min={0} max={50} placeholder="Global default" value={jingleConfig.jingleFrequencyOverride ?? ''} onChange={e => { const val = e.target.value ? parseInt(e.target.value) : null; setJingleConfig({ ...jingleConfig, jingleFrequencyOverride: val && val > 0 ? val : null }); }} className="flex-1 h-9 px-3 rounded-md bg-[#0a1628] border border-white/10 text-white text-xs placeholder:text-white/30" />
                            <span className="text-white/40 text-xs whitespace-nowrap">tracks</span>
                          </div>
                          {jingleConfig.jingleFrequencyOverride && <p className="text-[10px] text-purple-300/60 mt-1">Overrides global track_count rules for this slot</p>}
                        </div>

                        <div>
                          <Label className="text-white/70 text-xs flex items-center gap-1.5 mb-1.5">
                            <Volume2 className="size-3 text-cyan-400" /> Category Filter (only these jingle types)
                          </Label>
                          <div className="flex flex-wrap gap-1.5">
                            {JINGLE_CATEGORIES.map(cat => {
                              const isOn = jingleConfig.jingleCategoryFilter?.includes(cat);
                              return (
                                <button key={cat} onClick={() => toggleCategory(cat)} className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${isOn ? 'bg-[#00d9ff]/20 text-[#00d9ff] ring-1 ring-[#00d9ff]/40' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}>
                                  {cat.replace(/_/g, ' ')}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-white/30 mt-1">{jingleConfig.jingleCategoryFilter?.length ? `${jingleConfig.jingleCategoryFilter.length} categories selected` : 'No filter — all categories allowed'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-white/10 text-white/70">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-[#0a1628] font-semibold">Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== MAIN COMPONENT ====================

export function ScheduleManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [jingles, setJingles] = useState<Jingle[]>([]);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // ── Live ON AIR status (auto-refreshes every 30s) ──
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [isLiveRefreshing, setIsLiveRefreshing] = useState(false);
  const liveStatusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Pointer-drag state ──
  const [dragInfo, setDragInfo] = useState<{ payload: DragPayload; ghostX: number; ghostY: number } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: number; hour: number } | null>(null);
  // Stable refs so the permanent pointer-event handlers always see current values
  const dragInfoRef = useRef<typeof dragInfo>(null);
  const dragOverCellRef = useRef<{ day: number; hour: number } | null>(null);
  const dropPlaylistRef = useRef<(pl: Playlist, day: number, hour: number) => void>(() => {});
  const moveBlockRef = useRef<(id: string, day: number, hour: number) => void>(() => {});
  const [showSidebar, setShowSidebar] = useState(true);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [copyingSlot, setCopyingSlot] = useState<ScheduleSlot | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<'playlist' | 'all'>('all');
  const [batchJingleOpen, setBatchJingleOpen] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>('all');

  // Undo system
  const pendingDeleteRef = useRef<PendingBulkDelete | null>(null);

  const highlightPlaylistId = searchParams.get('highlight');

  // Compute hidden schedule IDs based on active tab
  const hiddenScheduleIds = useMemo(() => {
    if (scheduleViewMode === 'all') return new Set<string>();
    if (scheduleViewMode === 'recurring') {
      return new Set(schedules.filter(s => getEffectiveMode(s) !== 'recurring').map(s => s.id));
    }
    if (scheduleViewMode === 'this-week') {
      return new Set(schedules.filter(s => {
        if (getEffectiveMode(s) === 'one-time') {
          return !isDateInCurrentWeek(s.scheduledDate);
        }
        return true; // hide recurring in "this week" view
      }).map(s => s.id));
    }
    return new Set<string>();
  }, [schedules, scheduleViewMode]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const recurringCount = schedules.filter(s => getEffectiveMode(s) === 'recurring').length;
    const thisWeekCount = schedules.filter(s => getEffectiveMode(s) === 'one-time' && isDateInCurrentWeek(s.scheduledDate)).length;
    return { all: schedules.length, recurring: recurringCount, thisWeek: thisWeekCount };
  }, [schedules]);

  const weekLabel = useMemo(() => getWeekBounds().label, []);

  useEffect(() => { loadData(); }, []);

  // ── Live ON AIR: initial fetch + 30s auto-refresh ──
  useEffect(() => {
    const fetchLiveStatus = async () => {
      setIsLiveRefreshing(true);
      try {
        const data = await api.getRadioScheduleStatus();
        setLiveStatus(data);
      } catch (e: any) {
        console.error('[Schedule] live status error:', e);
      } finally {
        setIsLiveRefreshing(false);
      }
    };

    fetchLiveStatus();
    liveStatusIntervalRef.current = setInterval(fetchLiveStatus, 30_000);

    return () => {
      if (liveStatusIntervalRef.current) {
        clearInterval(liveStatusIntervalRef.current);
      }
    };
  }, []);

  // Scroll grid to current hour once data is loaded
  useEffect(() => {
    if (!loading && gridScrollRef.current) {
      const scrollTop = Math.max(0, (nowHour - 1) * CELL_HEIGHT);
      gridScrollRef.current.scrollTop = scrollTop;
    }
  }, [loading]);

  // Cleanup pending delete timer on unmount
  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timerId);
      }
    };
  }, []);

  // ── Pointer-drag: keep refs current every render ──
  dragInfoRef.current = dragInfo;
  dragOverCellRef.current = dragOverCell;

  // ── Pointer-drag: permanent effect (runs once, uses refs to avoid stale closures) ──
  useEffect(() => {
    // Let child components start a drag
    _startPointerDrag = (payload, x, y) => {
      setDragInfo({ payload, ghostX: x, ghostY: y });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragInfoRef.current) return;
      setDragInfo(prev => prev ? { ...prev, ghostX: e.clientX, ghostY: e.clientY } : null);
      const cell = findCellAtPoint(e.clientX, e.clientY, gridScrollRef.current);
      setDragOverCell(cell);
      dragOverCellRef.current = cell;
    };

    const onPointerUp = () => {
      if (!dragInfoRef.current) return;
      const payload = dragInfoRef.current.payload;
      const cell = dragOverCellRef.current;
      if (payload && cell) {
        if (payload.type === 'playlist') dropPlaylistRef.current(payload.playlist, cell.day, cell.hour);
        else if (payload.type === 'block-move') moveBlockRef.current(payload.blockId, cell.day, cell.hour);
      }
      setDragInfo(null);
      setDragOverCell(null);
      dragOverCellRef.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragInfoRef.current) {
        setDragInfo(null);
        setDragOverCell(null);
        dragOverCellRef.current = null;
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      _startPointerDrag = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedRes, plRes, jingleRes] = await Promise.all([
        api.getAllSchedules(),
        api.getAllPlaylists(),
        api.getAllJingles().catch(() => ({ jingles: [] })),
      ]);

      // Guard: if the schedule response is an error, do NOT clear the list
      if (schedRes.error) {
        console.error('[Schedule] ❌ Server error loading schedules:', schedRes.error);
        toast.error(`Schedule load error: ${schedRes.error}`);
        // Still update playlists/jingles but keep existing schedules
        setPlaylists(plRes.playlists || []);
        setJingles(jingleRes.jingles || []);
        setLoading(false);
        return;
      }

      const loadedSchedules = schedRes.schedules || [];
      console.log(`[Schedule] ✅ loadData: ${loadedSchedules.length} schedules, ${(plRes.playlists || []).length} playlists`);
      if (loadedSchedules.length > 0) {
        console.log('[Schedule] Schedule IDs:', loadedSchedules.map((s: any) => `${s.id} (${s.title})`).join(', '));
      } else {
        console.warn('[Schedule] ⚠️ Server returned 0 schedules — all slots may have been lost or never persisted');
      }
      setSchedules(loadedSchedules);
      setPlaylists(plRes.playlists || []);
      setJingles(jingleRes.jingles || []);
    } catch (error) {
      console.error('[Schedule] ❌ Network error loading schedule data:', error);
      toast.error('Failed to load schedule data — keeping existing view');
      // Do NOT clear schedules on network error — keep stale data visible
    } finally {
      setLoading(false);
    }
  };

  const activeSlots = schedules.filter(s => s.isActive).length;
  const totalSlots = schedules.length;
  const uniquePlaylists = new Set(schedules.map(s => s.playlistId)).size;
  const slotsWithJingles = schedules.filter(s => s.jingleConfig && (s.jingleConfig.introJingleId || s.jingleConfig.outroJingleId || s.jingleConfig.disableJingles || s.jingleConfig.jingleFrequencyOverride)).length;
  const nowDay = new Date().getDay();
  const nowHour = new Date().getHours();

  const highlightedPlaylist = highlightPlaylistId ? playlists.find(p => p.id === highlightPlaylistId) : null;
  const highlightedSlotCount = highlightPlaylistId ? schedules.filter(s => s.playlistId === highlightPlaylistId).length : 0;

  // ==================== HANDLERS ====================

  const handleDropPlaylist = async (playlist: Playlist, day: number, hour: number) => {
    // Snap-to-grid: find nearest free slot if occupied
    const freeHour = findNearestFreeSlot(schedules, day, hour, 1, '');
    if (freeHour === null) {
      toast.error(`No free slot available on ${DAYS_SHORT[day]}`);
      return;
    }

    const startTime = formatHour(freeHour);
    const endTime = formatHour(freeHour + 1);
    const snapped = freeHour !== hour;

    // Determine schedule mode based on active tab
    const isOneTime = scheduleViewMode === 'this-week';
    const scheduleMode = isOneTime ? 'one-time' : 'recurring';
    const scheduledDate = isOneTime ? getDateForDayInCurrentWeek(day) : null;

    try {
      console.log('[Schedule] Creating slot:', { playlistId: playlist.id, dayOfWeek: day, startTime, endTime, scheduleMode, scheduledDate, localTime: new Date().toTimeString().slice(0,8), localDay: new Date().getDay(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
      const res = await api.createSchedule({
        playlistId: playlist.id, dayOfWeek: day, startTime, endTime,
        title: playlist.name, isActive: true,
        repeatWeekly: !isOneTime,
        scheduleMode,
        scheduledDate,
        utcOffsetMinutes: new Date().getTimezoneOffset(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      console.log('[Schedule] Create response:', res);
      if (res.error) {
        console.error('[Schedule] Server returned error:', res.error);
        toast.error(`Failed to create: ${res.error}`);
        return;
      }
      const newSlot: ScheduleSlot = { ...(res.schedule || {}), playlistName: playlist.name, playlistColor: playlist.color || '#00d9ff' };
      if (!newSlot.id) {
        console.error('[Schedule] ❌ Server returned schedule without id!', res);
        toast.error('Schedule created but server returned no ID — data may be lost');
        return;
      }
      console.log('[Schedule] ✅ New slot added to state:', newSlot.id, newSlot.title);
      setSchedules(prev => [...prev, newSlot]);

      // Verify: immediately re-read the schedule back from KV to confirm persistence
      try {
        const verifyRes = await api.getAllSchedules();
        const found = (verifyRes.schedules || []).find((s: any) => s.id === newSlot.id);
        if (!found) {
          console.error(`[Schedule] ❌ POST-CREATE VERIFY FAILED: slot ${newSlot.id} not found in GET /schedule!`);
          toast.error('⚠️ Schedule slot was created but not found on re-read — possible KV issue');
        } else {
          console.log(`[Schedule] ✅ Post-create verification passed: ${newSlot.id} found in KV`);
        }
      } catch (verifyErr) {
        console.warn('[Schedule] Post-create verify fetch failed:', verifyErr);
      }

      const modeLabel = isOneTime ? ' (this week only)' : '';
      toast.success(
        snapped
          ? `"${playlist.name}" → ${DAYS_SHORT[day]} ${startTime}${modeLabel} (snapped from ${formatHour(hour)})`
          : `"${playlist.name}" → ${DAYS_SHORT[day]} ${startTime}${modeLabel}`
      );
    } catch (error: any) {
      console.error('[Schedule] Error creating schedule:', error);
      toast.error(`Failed to create schedule slot: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMoveBlock = async (blockId: string, newDay: number, newHour: number) => {
    const block = schedules.find(s => s.id === blockId);
    if (!block) return;

    const blockDuration = parseInt(block.endTime.split(':')[0]) - parseInt(block.startTime.split(':')[0]);

    // Snap-to-grid: find nearest free slot
    const freeHour = findNearestFreeSlot(schedules, newDay, newHour, blockDuration, blockId);
    if (freeHour === null) {
      toast.error(`No free ${blockDuration}h slot available on ${DAYS_SHORT[newDay]}`);
      return;
    }

    const snapped = freeHour !== newHour;
    const newStartTime = formatHour(freeHour);
    const newEndTime = formatHour(freeHour + blockDuration);

    // If one-time, update scheduledDate to match the new day
    const updates: any = {
      dayOfWeek: newDay, startTime: newStartTime, endTime: newEndTime,
      utcOffsetMinutes: new Date().getTimezoneOffset(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    if (getEffectiveMode(block) === 'one-time') {
      updates.scheduledDate = getDateForDayInCurrentWeek(newDay);
    }

    try {
      await api.updateSchedule(blockId, updates);
      setSchedules(prev => prev.map(s => s.id === blockId ? { ...s, ...updates } : s));
      toast.success(
        snapped
          ? `Moved to ${DAYS_SHORT[newDay]} ${newStartTime}–${newEndTime} (snapped from ${formatHour(newHour)})`
          : `Moved to ${DAYS_SHORT[newDay]} ${newStartTime}–${newEndTime}`,
        { icon: snapped ? <Magnet className="size-4 text-amber-400" /> : undefined }
      );
    } catch (error) {
      console.error('Error moving schedule block:', error);
      toast.error('Failed to move');
    }
  };

  // Keep refs current so the permanent pointer-event useEffect always calls latest versions
  dropPlaylistRef.current = handleDropPlaylist;
  moveBlockRef.current = handleMoveBlock;

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule slot?')) return;
    try {
      await api.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Slot deleted');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete');
    }
  };

  const handleToggleActive = async (slot: ScheduleSlot) => {
    try {
      await api.updateSchedule(slot.id, { isActive: !slot.isActive });
      setSchedules(prev => prev.map(s => s.id === slot.id ? { ...s, isActive: !s.isActive } : s));
      toast.success(slot.isActive ? 'Deactivated' : 'Activated');
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast.error('Failed to update');
    }
  };

  const handleEditSave = async (id: string, updates: Partial<ScheduleSlot>) => {
    try {
      await api.updateSchedule(id, updates);
      const pl = playlists.find(p => p.id === updates.playlistId);
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates, playlistName: pl?.name || s.playlistName, playlistColor: pl?.color || s.playlistColor } : s));
      toast.success('Schedule updated');
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update');
    }
  };

  const handleResizeCommit = async (id: string, newEndTime: string) => {
    try {
      await api.updateSchedule(id, { endTime: newEndTime });
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, endTime: newEndTime } : s));
      toast.success('Duration updated');
    } catch (error) {
      console.error('Error resizing:', error);
      toast.error('Failed to resize');
    }
  };

  const handleClickBlock = (playlistId: string) => {
    navigate(`/admin/playlists?open=${playlistId}`);
  };

  // ==================== COPY BLOCK ====================

  const handleCopyBlock = async (slot: ScheduleSlot, targetDays: number[]) => {
    let created = 0;
    let snapped = 0;
    const startH = parseInt(slot.startTime.split(':')[0]);
    const endH = parseInt(slot.endTime.split(':')[0]);
    const duration = endH - startH;

    for (const day of targetDays) {
      // Find free slot (snap-to-grid)
      const freeHour = findNearestFreeSlot(schedules, day, startH, duration, '');
      if (freeHour === null) {
        toast.error(`No free ${duration}h slot on ${DAYS_SHORT[day]}, skipping`);
        continue;
      }
      if (freeHour !== startH) snapped++;

      try {
        const mode = getEffectiveMode(slot);
        const res = await api.createSchedule({
          playlistId: slot.playlistId,
          dayOfWeek: day,
          startTime: formatHour(freeHour),
          endTime: formatHour(freeHour + duration),
          title: slot.title || slot.playlistName || '',
          isActive: slot.isActive,
          repeatWeekly: mode === 'recurring' ? slot.repeatWeekly : false,
          scheduleMode: mode,
          scheduledDate: mode === 'one-time' ? getDateForDayInCurrentWeek(day) : null,
          jingleConfig: slot.jingleConfig || undefined,
          utcOffsetMinutes: new Date().getTimezoneOffset(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const newSlot: ScheduleSlot = {
          ...(res.schedule || {}),
          playlistName: slot.playlistName,
          playlistColor: slot.playlistColor,
        };
        setSchedules(prev => [...prev, newSlot]);
        created++;
      } catch (error) {
        console.error(`Error copying to ${DAYS_SHORT[day]}:`, error);
      }
    }

    if (created > 0) {
      const msg = snapped > 0
        ? `Copied to ${created} day${created !== 1 ? 's' : ''} (${snapped} snapped to free slots)`
        : `Copied to ${created} day${created !== 1 ? 's' : ''}`;
      toast.success(msg);
    }
  };

  // ==================== BULK DELETE WITH UNDO ====================

  const handleBulkDelete = () => {
    const slotsToDelete = bulkDeleteMode === 'playlist' && highlightPlaylistId
      ? schedules.filter(s => s.playlistId === highlightPlaylistId)
      : [...schedules];

    if (slotsToDelete.length === 0) return;
    setBulkDeleteOpen(false);

    // Cancel any previous pending delete
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timerId);
      toast.dismiss(pendingDeleteRef.current.toastId);
      // Execute the previous one immediately
      executeBulkDelete(pendingDeleteRef.current.slots);
      pendingDeleteRef.current = null;
    }

    // Soft-delete: remove from UI immediately
    const idsToRemove = new Set(slotsToDelete.map(s => s.id));
    setSchedules(prev => prev.filter(s => !idsToRemove.has(s.id)));

    const count = slotsToDelete.length;
    const label = bulkDeleteMode === 'playlist' && highlightedPlaylist
      ? `"${highlightedPlaylist.name}"`
      : 'schedule';

    // Show undo toast
    const toastId = toast(
      `Deleted ${count} slot${count !== 1 ? 's' : ''} from ${label}`,
      {
        duration: UNDO_TIMEOUT_MS,
        icon: <Trash2 className="size-4 text-red-400" />,
        action: {
          label: 'Undo',
          onClick: () => {
            // Restore slots to UI
            setSchedules(prev => [...prev, ...slotsToDelete]);
            if (pendingDeleteRef.current) {
              clearTimeout(pendingDeleteRef.current.timerId);
              pendingDeleteRef.current = null;
            }
            toast.success(`Restored ${count} slot${count !== 1 ? 's' : ''}`, { icon: <Undo2 className="size-4 text-[#00ffaa]" /> });
          },
        },
      }
    );

    // Set timer for actual deletion
    const timerId = setTimeout(() => {
      executeBulkDelete(slotsToDelete);
      pendingDeleteRef.current = null;
    }, UNDO_TIMEOUT_MS);

    pendingDeleteRef.current = { slots: slotsToDelete, timerId, toastId };
  };

  const executeBulkDelete = async (slots: ScheduleSlot[]) => {
    let deleted = 0;
    for (const slot of slots) {
      try {
        await api.deleteSchedule(slot.id);
        deleted++;
      } catch (error) {
        console.error(`Failed to delete slot ${slot.id}:`, error);
      }
    }
    if (deleted < slots.length) {
      toast.error(`Only deleted ${deleted}/${slots.length} slots`);
    }
  };

  // ==================== BATCH JINGLE APPLY ====================

  const handleBatchJingleApply = async (slotIds: string[], config: JingleConfig) => {
    let updated = 0;
    for (const id of slotIds) {
      try {
        await api.updateSchedule(id, { jingleConfig: config });
        updated++;
      } catch (error) {
        console.error(`Failed to update jingle config for slot ${id}:`, error);
      }
    }
    // Update local state
    setSchedules(prev => prev.map(s =>
      slotIds.includes(s.id) ? { ...s, jingleConfig: config } : s
    ));
    if (updated === slotIds.length) {
      toast.success(`Jingle config applied to ${updated} slot${updated !== 1 ? 's' : ''}`);
    } else {
      toast.error(`Updated ${updated}/${slotIds.length} slots`);
    }
  };

  // ==================== RENDER ====================

  return (
    <AdminLayout maxWidth="wide">
      <div className="w-full max-w-full overflow-x-hidden">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-[#00d9ff] to-[#00ffaa] rounded-xl flex-shrink-0">
                    <Calendar className="size-6 text-[#0a1628]" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>Schedule</h1>
                    <p className="text-xs sm:text-sm text-white/60">
                      Drag &amp; drop &bull; Move &amp; copy blocks &bull; Auto-snap to free slots
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap">
                {highlightedPlaylist && highlightedSlotCount > 0 && (
                  <Button onClick={() => { setBulkDeleteMode('playlist'); setBulkDeleteOpen(true); }} size="sm" className="bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs border border-red-500/30">
                    <Trash2 className="size-3.5 mr-1.5" />Clear "{highlightedPlaylist.name}" ({highlightedSlotCount})
                  </Button>
                )}
                {totalSlots > 0 && !highlightPlaylistId && (
                  <Button onClick={() => { setBulkDeleteMode('all'); setBulkDeleteOpen(true); }} size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">
                    <Trash2 className="size-3.5 mr-1.5" />Clear All
                  </Button>
                )}
                {highlightPlaylistId && (
                  <Badge className="bg-[#00ffaa]/15 text-[#00ffaa] border-[#00ffaa]/30 text-xs animate-pulse">Highlighting slots</Badge>
                )}
                {totalSlots > 0 && jingles.length > 0 && (
                  <Button onClick={() => setBatchJingleOpen(true)} size="sm" className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 text-xs border border-amber-500/30">
                    <Layers className="size-3.5 mr-1.5" />Batch Jingles
                  </Button>
                )}
                <Button onClick={() => setShowSidebar(!showSidebar)} size="sm" className={`text-xs sm:text-sm ${showSidebar ? 'bg-[#00d9ff] text-[#0a1628]' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
                  <ListMusic className="size-3.5 mr-1.5" />Playlists
                </Button>
                <Button onClick={() => navigate('/admin/playlists')} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm">
                  <ExternalLink className="size-3.5 mr-1.5" /><span className="hidden sm:inline">Manage Playlists</span>
                </Button>
                <Button
                  onClick={() => {
                    if (gridScrollRef.current) {
                      const scrollTop = Math.max(0, (nowHour - 1) * CELL_HEIGHT);
                      gridScrollRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
                    }
                  }}
                  variant="outline" size="sm"
                  className="border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/10 text-xs gap-1.5"
                  title="Scroll to current hour"
                >
                  <Clock className="size-3.5" />
                  <span className="hidden sm:inline">Now</span>
                </Button>
                <Button onClick={loadData} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                  <RefreshCw className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <Card className="bg-[#0f1c2e]/90 border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#00d9ff]/15"><Calendar className="size-4 text-[#00d9ff]" /></div>
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider">Slots</p>
                    <p className="text-white font-bold text-lg">{totalSlots}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-[#0f1c2e]/90 border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#00ffaa]/15"><Zap className="size-4 text-[#00ffaa]" /></div>
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider">Active</p>
                    <p className="text-white font-bold text-lg">{activeSlots}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-[#0f1c2e]/90 border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#9C27B0]/15"><ListMusic className="size-4 text-[#9C27B0]" /></div>
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider">Playlists</p>
                    <p className="text-white font-bold text-lg">{uniquePlaylists}</p>
                  </div>
                </div>
              </Card>
              <Card
                className="bg-[#0f1c2e]/90 border-white/10 p-3 cursor-pointer hover:border-amber-500/30 transition-colors group/jcard"
                onClick={() => jingles.length > 0 && setBatchJingleOpen(true)}
                title="Click to open Batch Jingle Assign"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/15 group-hover/jcard:bg-amber-500/25 transition-colors"><Bell className="size-4 text-amber-400" /></div>
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider">Jingle Linked</p>
                    <p className="text-white font-bold text-lg">{slotsWithJingles}<span className="text-white/20 text-xs font-normal ml-1">/ {totalSlots}</span></p>
                  </div>
                </div>
              </Card>
            </div>

            {/* ═══════════ LIVE ON AIR BANNER ═══════════ */}
            <AnimatePresence>
              {liveStatus && (liveStatus.isOnline || liveStatus.currentSchedule) && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4"
                >
                  <div className={`p-3 rounded-xl border backdrop-blur-sm flex items-center gap-3 ${
                    liveStatus.currentSchedule
                      ? 'border-[#00ffaa]/30 bg-[#00ffaa]/5'
                      : 'border-[#00d9ff]/20 bg-[#00d9ff]/5'
                  }`}>
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                      liveStatus.currentSchedule ? 'bg-[#00ffaa]/15' : 'bg-[#00d9ff]/15'
                    }`}>
                      <Radio className={`size-4 ${
                        liveStatus.currentSchedule ? 'text-[#00ffaa] animate-pulse' : 'text-[#00d9ff]'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {liveStatus.currentSchedule ? (
                        <>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-white">NOW ON AIR</span>
                            <Badge className="bg-[#00ffaa]/15 text-[#00ffaa] border-[#00ffaa]/30 text-[9px] px-1.5 py-0">
                              SCHEDULE
                            </Badge>
                          </div>
                          <p className="text-sm text-white/80 font-semibold truncate">
                            {liveStatus.currentSchedule.title}
                          </p>
                          <p className="text-[10px] text-white/40 truncate">
                            {liveStatus.currentSchedule.playlistName || liveStatus.currentSchedule.playlistId}
                            {' · '}
                            {DAYS_SHORT[liveStatus.currentSchedule.dayOfWeek ?? new Date().getDay()]}{' '}
                            {liveStatus.currentSchedule.startTime}–{liveStatus.currentSchedule.endTime}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-white">ON AIR</span>
                          <p className="text-[10px] text-white/50">
                            Auto DJ is broadcasting from the Live Stream playlist (no schedule slot active)
                          </p>
                        </>
                      )}
                    </div>
                    <RefreshCw className={`size-3 text-white/15 flex-shrink-0 ${isLiveRefreshing ? 'animate-spin text-[#00d9ff]/40' : ''}`} />
                    <span className="text-[8px] text-white/15 flex-shrink-0">30s</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══════════ SCHEDULE MODE TABS ═══════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex bg-[#0a1628]/80 rounded-xl p-1 border border-white/10">
                {([
                  { id: 'all' as ScheduleViewMode, label: 'All', icon: Calendar, count: tabCounts.all },
                  { id: 'recurring' as ScheduleViewMode, label: 'Recurring', icon: Repeat, count: tabCounts.recurring },
                  { id: 'this-week' as ScheduleViewMode, label: 'This Week', icon: CalendarDays, count: tabCounts.thisWeek },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setScheduleViewMode(tab.id)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                      scheduleViewMode === tab.id
                        ? tab.id === 'this-week'
                          ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 shadow-lg shadow-amber-500/10'
                          : 'bg-gradient-to-r from-[#00d9ff]/20 to-[#00ffaa]/20 text-[#00d9ff] shadow-lg shadow-[#00d9ff]/10'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="size-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      scheduleViewMode === tab.id
                        ? tab.id === 'this-week' ? 'bg-amber-500/20 text-amber-300' : 'bg-[#00d9ff]/20 text-[#00d9ff]'
                        : 'bg-white/5 text-white/30'
                    }`}>{tab.count}</span>
                  </button>
                ))}
              </div>

              {scheduleViewMode === 'this-week' && (
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-xs">{weekLabel}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded-lg text-[10px] text-amber-400/70 border border-amber-500/15">
                    <CalendarCheck2 className="size-3" />
                    Drop playlists here to schedule for this week only
                  </span>
                </div>
              )}

              {scheduleViewMode === 'recurring' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#00d9ff]/10 rounded-lg text-[10px] text-[#00d9ff]/70 border border-[#00d9ff]/15">
                  <Repeat className="size-3" />
                  Permanent weekly schedule
                </span>
              )}
            </div>
          </motion.div>

          <div className={`grid gap-4 w-full ${showSidebar ? 'grid-cols-1 xl:grid-cols-[280px_1fr]' : 'grid-cols-1'}`}>
            {/* Sidebar */}
            <AnimatePresence>
              {showSidebar && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card className="p-4 bg-[#0f1c2e]/90 border-white/10 xl:sticky xl:top-4 xl:max-h-[calc(100vh-200px)] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <ListMusic className="size-4 text-[#00d9ff]" />
                        Drag to Schedule
                      </h2>
                      <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{playlists.length}</Badge>
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
                      {playlists.length === 0 ? (
                        <div className="text-center py-8 text-white/30">
                          <Music className="size-10 mx-auto mb-2 opacity-20" />
                          <p className="text-xs">No playlists</p>
                          <Button size="sm" variant="outline" onClick={() => navigate('/admin/playlists')} className="mt-3 border-[#00d9ff]/30 text-[#00d9ff] text-xs">
                            <Plus className="size-3 mr-1" /> Create Playlist
                          </Button>
                        </div>
                      ) : (
                        playlists.map(pl => <DraggablePlaylist key={pl.id} playlist={pl} />)
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-white/30 space-y-1.5">
                      <p className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-[#00ffaa] inline-block" />
                        <Move className="size-2.5 inline" /> Drag blocks to move
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-[#00d9ff] inline-block" />
                        <Copy className="size-2.5 inline" /> Copy to other days
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-amber-400 inline-block" />
                        <Magnet className="size-2.5 inline" /> Auto-snap to free slots
                      </p>
                      <div className="border-t border-white/5 pt-1.5 mt-1.5">
                        <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1">Jingle markers</p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                          Intro trigger
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                          Outro trigger
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 inline-block" />
                          Frequency dots
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Schedule Grid */}
            <Card className="bg-[#0f1c2e]/90 border-white/10 overflow-hidden w-full flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center h-[500px]">
                  <div className="text-center">
                    <Loader2 className="size-8 text-[#00d9ff] animate-spin mx-auto mb-3" />
                    <p className="text-white/40 text-sm">Loading schedule...</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={gridScrollRef}
                  className="overflow-auto w-full"
                  style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '400px' }}
                >
                  <div className="min-w-[850px]">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-20">
                        <tr className="bg-[#0a1628]/95 backdrop-blur-sm">
                          <th className="p-2.5 text-left text-white/60 font-medium border-b border-r border-white/10 min-w-[70px] text-xs">
                            <Clock className="size-3.5 inline mr-1.5 opacity-50" />Time
                          </th>
                          {DAYS_OF_WEEK.map((day, index) => {
                            const isToday = index === nowDay;
                            return (
                              <th key={day} className={`p-2.5 text-center font-medium border-b border-white/10 min-w-[110px] text-xs transition-colors ${isToday ? 'bg-[#00d9ff]/5 text-[#00d9ff]' : 'text-white/60'}`}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="hidden lg:inline">{day}</span>
                                  <span className="lg:hidden">{DAYS_SHORT[index]}</span>
                                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#00d9ff] animate-pulse" />}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {TIME_SLOTS.map((time, hourIndex) => {
                          const isNowRow = hourIndex === nowHour;
                          return (
                            <tr key={time} style={{ height: `${CELL_HEIGHT}px` }}>
                              <td className={`p-2 text-xs font-mono border-b border-r border-white/5 bg-[#0a1628]/30 w-[70px] ${isNowRow ? 'text-[#00d9ff] font-semibold' : 'text-white/30'}`}>
                                {time}
                              </td>
                              {DAYS_OF_WEEK.map((_, dayIndex) => (
                                <td key={dayIndex} className={`p-0 ${dayIndex === nowDay && hourIndex === nowHour ? 'bg-[#00d9ff]/[0.03]' : ''}`}>
                                  <ScheduleCell
                                    day={dayIndex}
                                    hour={hourIndex}
                                    schedules={schedules}
                                    hiddenScheduleIds={hiddenScheduleIds}
                                    isOver={!!(dragOverCell && dragOverCell.day === dayIndex && dragOverCell.hour === hourIndex)}
                                    onDelete={handleDelete}
                                    onToggleActive={handleToggleActive}
                                    onClickBlock={handleClickBlock}
                                    onEditBlock={slot => setEditingSlot(slot)}
                                    highlightPlaylistId={highlightPlaylistId}
                                    onResizeCommit={handleResizeCommit}
                                    onCopyBlock={slot => setCopyingSlot(slot)}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

      {/* Edit Dialog */}
      {editingSlot && (
        <EditScheduleDialog slot={editingSlot} playlists={playlists} jingles={jingles} open={!!editingSlot} onOpenChange={open => !open && setEditingSlot(null)} onSave={handleEditSave} />
      )}

      {/* Copy Slot Dialog */}
      {copyingSlot && (
        <CopySlotDialog slot={copyingSlot} schedules={schedules} open={!!copyingSlot} onOpenChange={open => !open && setCopyingSlot(null)} onCopy={handleCopyBlock} />
      )}

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        targetPlaylistName={bulkDeleteMode === 'playlist' ? (highlightedPlaylist?.name || null) : null}
        count={bulkDeleteMode === 'playlist' ? highlightedSlotCount : totalSlots}
        onConfirm={handleBulkDelete}
      />

      {/* Batch Jingle Assign Dialog */}
      <BatchJingleDialog
        schedules={schedules}
        jingles={jingles}
        open={batchJingleOpen}
        onOpenChange={setBatchJingleOpen}
        onBatchApply={handleBatchJingleApply}
      />

      {/* Drag ghost — follows pointer, pointer-events:none so it doesn't block elementFromPoint */}
      {dragInfo && (
        <div
          style={{
            position: 'fixed',
            left: dragInfo.ghostX + 14,
            top: dragInfo.ghostY - 18,
            pointerEvents: 'none',
            zIndex: 9999,
            transform: 'rotate(-2deg)',
          }}
          className="flex items-center gap-2 bg-[#0f1c2e] border border-[#00d9ff]/50 rounded-lg px-3 py-2 shadow-2xl shadow-[#00d9ff]/20 text-sm text-white select-none"
        >
          <GripVertical className="size-3.5 text-[#00d9ff] flex-shrink-0" />
          <span className="font-medium max-w-[160px] truncate">
            {dragInfo.payload.type === 'playlist'
              ? dragInfo.payload.playlist.name
              : 'Move Block'}
          </span>
          {dragOverCell
            ? <span className="text-[#00ffaa] text-xs opacity-80">{DAYS_SHORT[dragOverCell.day]} {TIME_SLOTS[dragOverCell.hour]}</span>
            : <span className="text-white/30 text-xs">drop on grid</span>
          }
        </div>
      )}
    </AdminLayout>
  );
}
