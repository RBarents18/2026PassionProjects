import { useState, useRef } from 'react';
import type { Project, GanttEntry } from '../types';
import {
  Plus, X, Edit2, Check, Upload, Image, Calendar,
  TrendingUp, AlertTriangle, CheckCircle, MessageSquare,
  Trash2, Link2, FileSpreadsheet, Download, BarChart2,
} from 'lucide-react';

interface GanttChartProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

// ── Status config ──────────────────────────────────────────────────────────────

const ENTRY_STATUS_CONFIG = {
  'on-track': {
    label: 'On Track',
    color: 'text-green-400',
    bg: 'bg-green-900/40 border-green-700',
    barColor: 'bg-green-500',
    svgFill: '#22c55e',
    icon: TrendingUp,
  },
  'late': {
    label: 'Late',
    color: 'text-red-400',
    bg: 'bg-red-900/40 border-red-700',
    barColor: 'bg-red-500',
    svgFill: '#ef4444',
    icon: AlertTriangle,
  },
  'complete': {
    label: 'Complete',
    color: 'text-blue-400',
    bg: 'bg-blue-900/40 border-blue-700',
    barColor: 'bg-blue-500',
    svgFill: '#3b82f6',
    icon: CheckCircle,
  },
};

type EntryStatus = GanttEntry['status'];

// ── Utility helpers ────────────────────────────────────────────────────────────

/** Returns fractional position [0,1] for a date within [rangeStart, rangeEnd]. */
function dateFraction(date: string, rangeStart: string, rangeEnd: string): number {
  const d = new Date(date).getTime();
  const s = new Date(rangeStart).getTime();
  const e = new Date(rangeEnd).getTime();
  if (e <= s) return 0;
  return Math.min(1, Math.max(0, (d - s) / (e - s)));
}

/** Generates month-boundary tick marks for the timeline header. */
function getMonthTicks(rangeStart: string, rangeEnd: string): { date: string; label: string }[] {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  const ticks: { date: string; label: string }[] = [];
  const startYear = start.getFullYear();
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const label = cur.toLocaleDateString('en-US', {
      month: 'short',
      ...(y !== startYear ? { year: '2-digit' } : {}),
    });
    ticks.push({ date: dateStr, label });
    cur.setMonth(m + 1);
  }
  return ticks;
}

// ── CSV parsing ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function normalizeStatus(s: string): EntryStatus {
  const lower = s.toLowerCase().trim();
  if (lower.includes('late') || lower.includes('behind') || lower.includes('delay')) return 'late';
  if (lower.includes('complet') || lower.includes('done') || lower.includes('finish')) return 'complete';
  return 'on-track';
}

type ParsedCSVEntry = Omit<GanttEntry, 'id' | 'dependsOn'> & { _depNames: string[] };

function parseGanttCSV(text: string): ParsedCSVEntry[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

  const idx = {
    title: header.findIndex(h => ['title', 'task', 'name', 'activity'].includes(h)),
    start: header.findIndex(h => h.includes('start')),
    end: header.findIndex(h => h.includes('end') || h.includes('finish') || h.includes('due')),
    status: header.findIndex(h => h === 'status'),
    depends: header.findIndex(h =>
      h.includes('depend') || h.includes('predecessor') || h.includes('requires'),
    ),
    comment: header.findIndex(h =>
      h.includes('comment') || h.includes('note') || h.includes('description'),
    ),
  };

  if (idx.title === -1) return [];

  return lines
    .slice(1)
    .map((line): ParsedCSVEntry | null => {
      if (!line.trim()) return null;
      const cells = parseCSVLine(line);
      const get = (i: number) => (i >= 0 ? (cells[i] ?? '').trim() : '');
      const title = get(idx.title);
      if (!title) return null;
      // "Depends On" column uses semicolons / pipes so it doesn't conflict with CSV commas
      const depStr = get(idx.depends);
      const _depNames = depStr
        ? depStr.split(/[;|]/).map(d => d.trim()).filter(Boolean)
        : [];
      return {
        title,
        startDate: get(idx.start),
        endDate: get(idx.end),
        status: normalizeStatus(get(idx.status)),
        comment: get(idx.comment),
        _depNames,
      };
    })
    .filter((e): e is ParsedCSVEntry => e !== null);
}

// ── Visual Gantt Timeline ──────────────────────────────────────────────────────

const LABEL_W = 170;
const BAR_H = 22;
const ROW_H = 46;
const HEADER_H = 40;

interface GanttTimelineProps {
  entries: GanttEntry[];
  rangeStart: string;
  rangeEnd: string;
}

function GanttTimeline({ entries, rangeStart, rangeEnd }: GanttTimelineProps) {
  if (entries.length === 0 || !rangeStart || !rangeEnd) return null;

  // Scale bar area to ~80 px per month, minimum 560 px
  const monthsDiff = Math.max(
    2,
    Math.ceil(
      (new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) /
        (1000 * 60 * 60 * 24 * 30),
    ),
  );
  const BAR_AREA_W = Math.max(560, monthsDiff * 80);
  const TOTAL_W = LABEL_W + BAR_AREA_W;
  const TOTAL_H = HEADER_H + entries.length * ROW_H;

  const ticks = getMonthTicks(rangeStart, rangeEnd);
  const idToIndex = Object.fromEntries(entries.map((e, i) => [e.id, i]));

  const getX = (date: string) =>
    LABEL_W + dateFraction(date, rangeStart, rangeEnd) * (BAR_AREA_W - 12);
  const getY = (i: number) => HEADER_H + i * ROW_H + ROW_H / 2;

  const today = new Date().toISOString().split('T')[0];
  const showToday = today >= rangeStart && today <= rangeEnd;
  const todayX = getX(today);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
      <svg
        width={TOTAL_W}
        height={TOTAL_H}
        style={{ display: 'block', minWidth: TOTAL_W }}
        aria-label="Gantt chart timeline"
      >
        {/* ── Backgrounds ─────────────────────────────────── */}
        <rect width={TOTAL_W} height={TOTAL_H} fill="#111827" />
        <rect width={LABEL_W} height={TOTAL_H} fill="#0f172a" />
        {entries.map((_, i) =>
          i % 2 === 0 ? (
            <rect
              key={i}
              x={LABEL_W}
              y={HEADER_H + i * ROW_H}
              width={BAR_AREA_W}
              height={ROW_H}
              fill="rgba(255,255,255,0.02)"
            />
          ) : null,
        )}

        {/* ── Grid lines ──────────────────────────────────── */}
        {ticks.map((tick, i) => {
          const x = getX(tick.date);
          return x > LABEL_W ? (
            <line key={i} x1={x} y1={HEADER_H} x2={x} y2={TOTAL_H} stroke="#1f2937" strokeWidth={1} />
          ) : null;
        })}
        {entries.map((_, i) => (
          <line
            key={i}
            x1={0}
            y1={HEADER_H + i * ROW_H}
            x2={TOTAL_W}
            y2={HEADER_H + i * ROW_H}
            stroke="#1f2937"
            strokeWidth={1}
          />
        ))}
        <line x1={0} y1={TOTAL_H - 1} x2={TOTAL_W} y2={TOTAL_H - 1} stroke="#1f2937" strokeWidth={1} />

        {/* ── Header ──────────────────────────────────────── */}
        <rect width={TOTAL_W} height={HEADER_H} fill="#0f172a" />
        <line x1={0} y1={HEADER_H} x2={TOTAL_W} y2={HEADER_H} stroke="#374151" strokeWidth={1} />
        <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={TOTAL_H} stroke="#374151" strokeWidth={1} />

        <text x={8} y={HEADER_H - 12} fill="#6b7280" fontSize={9} fontFamily="system-ui, sans-serif" fontWeight="700" letterSpacing="0.08em">
          TASK
        </text>
        {ticks.map((tick, i) => {
          const x = getX(tick.date);
          return x >= LABEL_W ? (
            <text key={i} x={x + 4} y={HEADER_H - 12} fill="#9ca3af" fontSize={10} fontFamily="system-ui, sans-serif">
              {tick.label}
            </text>
          ) : null;
        })}

        {/* ── Today marker ────────────────────────────────── */}
        {showToday && (
          <g>
            <line x1={todayX} y1={HEADER_H} x2={todayX} y2={TOTAL_H} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={todayX + 3} y={HEADER_H - 12} fill="#f59e0b" fontSize={9} fontFamily="system-ui, sans-serif">
              Today
            </text>
          </g>
        )}

        {/* ── Arrowhead marker ────────────────────────────── */}
        <defs>
          <marker id="dep-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#818cf8" />
          </marker>
        </defs>

        {/* ── Dependency arrows (behind bars) ─────────────── */}
        {entries.map(entry =>
          (entry.dependsOn ?? []).map(depId => {
            const depIdx = idToIndex[depId];
            if (depIdx === undefined) return null;
            const depEntry = entries[depIdx];
            if (!depEntry.endDate || !entry.startDate) return null;
            const entryIdx = idToIndex[entry.id];

            const x1 = getX(depEntry.endDate);
            const y1 = getY(depIdx);
            const x2 = getX(entry.startDate);
            const y2 = getY(entryIdx);
            const turnX = Math.max(x1 + 14, x2 - 6);
            const d = `M ${x1} ${y1} L ${turnX} ${y1} L ${turnX} ${y2} L ${x2} ${y2}`;

            return (
              <path
                key={`${depId}-${entry.id}`}
                d={d}
                stroke="#818cf8"
                strokeWidth={1.5}
                fill="none"
                strokeDasharray="5 3"
                markerEnd="url(#dep-arrow)"
                opacity={0.7}
              />
            );
          }),
        )}

        {/* ── Task bars + row labels ───────────────────────── */}
        {entries.map((entry, i) => {
          const cfg = ENTRY_STATUS_CONFIG[entry.status] ?? ENTRY_STATUS_CONFIG['on-track'];
          const hasPrereqs = (entry.dependsOn?.length ?? 0) > 0;
          const hasDependents = entries.some(e => e.dependsOn?.includes(entry.id));

          const startX = entry.startDate ? getX(entry.startDate) : LABEL_W;
          const endX = entry.endDate ? getX(entry.endDate) : startX + 4;
          const barW = Math.max(endX - startX, 6);
          const cy = getY(i);
          const labelText =
            entry.title.length > 23 ? entry.title.slice(0, 21) + '\u2026' : entry.title;

          return (
            <g key={entry.id}>
              <text x={8} y={cy + 4} fill="#d1d5db" fontSize={11} fontFamily="system-ui, sans-serif">
                {labelText}
              </text>
              {hasPrereqs && <circle cx={startX} cy={cy} r={4} fill="#818cf8" />}
              <rect x={startX} y={cy - BAR_H / 2} width={barW} height={BAR_H} rx={5} fill={cfg.svgFill} opacity={0.85} />
              {entry.status === 'complete' && (
                <rect x={startX} y={cy - BAR_H / 2} width={barW} height={BAR_H} rx={5} fill="rgba(255,255,255,0.18)" />
              )}
              {hasDependents && <circle cx={startX + barW} cy={cy} r={4} fill="#818cf8" />}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-2 border-t border-gray-800 text-xs text-gray-400">
        {Object.entries(ENTRY_STATUS_CONFIG).map(([, cfg]) => (
          <span key={cfg.label} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded-sm ${cfg.barColor}`} />
            {cfg.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <svg width="24" height="12" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <line x1="0" y1="6" x2="18" y2="6" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4 2" />
            <polygon points="18,2 18,10 24,6" fill="#818cf8" />
          </svg>
          Dependency
        </span>
        {showToday && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-px h-3 bg-yellow-400 opacity-70" />
            Today
          </span>
        )}
      </div>
    </div>
  );
}

// ── Edit state ─────────────────────────────────────────────────────────────────

interface EditState {
  title: string;
  startDate: string;
  endDate: string;
  status: EntryStatus;
  comment: string;
  dependsOn: string[];
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GanttChart({ project, onUpdate }: GanttChartProps) {
  const ganttEntries: GanttEntry[] = project.ganttEntries ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    title: '',
    startDate: '',
    endDate: '',
    status: 'on-track',
    comment: '',
    dependsOn: [],
  });

  const [newEntry, setNewEntry] = useState<EditState>({
    title: '',
    startDate: project.startDate,
    endDate: project.targetDate,
    status: 'on-track',
    comment: '',
    dependsOn: [],
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const [imageDragOver, setImageDragOver] = useState(false);
  const [imageError, setImageError] = useState('');

  const [csvDragOver, setCsvDragOver] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── Image upload ────────────────────────────────────────────────────────────

  const processImageFile = (file: File) => {
    setImageError('');
    if (!file.type.startsWith('image/')) {
      setImageError('Please upload an image file (PNG, JPG, GIF, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be under 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      onUpdate({ ...project, ganttImageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = '';
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setImageDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleRemoveImage = () => {
    onUpdate({ ...project, ganttImageUrl: undefined });
  };

  // ── CSV upload ──────────────────────────────────────────────────────────────

  const processCSVFile = (file: File) => {
    setCsvError('');
    setCsvSuccess('');
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      setCsvError('Please upload a CSV file (.csv, .tsv, or .txt).');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setCsvError('File must be under 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseGanttCSV(text);
      if (parsed.length === 0) {
        setCsvError(
          'No valid tasks found. Make sure your CSV has a "Title" column header.',
        );
        return;
      }
      // Assign IDs first so we can cross-reference dependencies
      const withIds: GanttEntry[] = parsed.map(p => ({
        id: crypto.randomUUID(),
        title: p.title,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        comment: p.comment,
        dependsOn: [],
      }));
      // Resolve "Depends On" names to IDs (case-insensitive title match)
      const titleToId = Object.fromEntries(
        withIds.map(e => [e.title.toLowerCase(), e.id]),
      );
      withIds.forEach((entry, i) => {
        entry.dependsOn = parsed[i]._depNames
          .map(n => titleToId[n.toLowerCase()])
          .filter(Boolean) as string[];
      });
      onUpdate({ ...project, ganttEntries: [...ganttEntries, ...withIds] });
      setCsvSuccess(
        `Imported ${withIds.length} task${withIds.length !== 1 ? 's' : ''} successfully!`,
      );
    };
    reader.readAsText(file);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processCSVFile(file);
    e.target.value = '';
  };

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setCsvDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processCSVFile(file);
  };

  const handleDownloadTemplate = () => {
    const s = project.startDate || '2025-01-01';
    const t = project.targetDate || '2025-06-30';
    const csv = [
      'Title,Start Date,End Date,Status,Depends On,Comment',
      `Research & Planning,${s},${s},on-track,,Initial research phase`,
      `Design,${s},${t},on-track,Research & Planning,Design based on research`,
      `Implementation,${s},${t},on-track,Design,Build the project`,
      `Testing,${s},${t},on-track,Implementation,Test the project`,
      `Documentation,${s},${t},on-track,,Can run in parallel with other tasks`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gantt-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Add entry ───────────────────────────────────────────────────────────────

  const handleAddEntry = () => {
    if (!newEntry.title.trim()) return;
    const entry: GanttEntry = {
      id: crypto.randomUUID(),
      title: newEntry.title.trim(),
      startDate: newEntry.startDate,
      endDate: newEntry.endDate,
      status: newEntry.status,
      comment: newEntry.comment.trim(),
      dependsOn: newEntry.dependsOn,
    };
    onUpdate({ ...project, ganttEntries: [...ganttEntries, entry] });
    setNewEntry({
      title: '',
      startDate: project.startDate,
      endDate: project.targetDate,
      status: 'on-track',
      comment: '',
      dependsOn: [],
    });
    setShowAddForm(false);
  };

  // ── Edit entry ──────────────────────────────────────────────────────────────

  const startEditing = (entry: GanttEntry) => {
    setEditingId(entry.id);
    setEditState({
      title: entry.title,
      startDate: entry.startDate,
      endDate: entry.endDate,
      status: entry.status,
      comment: entry.comment,
      dependsOn: entry.dependsOn ?? [],
    });
  };

  const saveEdit = () => {
    if (!editState.title.trim() || !editingId) return;
    onUpdate({
      ...project,
      ganttEntries: ganttEntries.map(e =>
        e.id === editingId
          ? {
              ...e,
              title: editState.title.trim(),
              startDate: editState.startDate,
              endDate: editState.endDate,
              status: editState.status,
              comment: editState.comment.trim(),
              dependsOn: editState.dependsOn,
            }
          : e,
      ),
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleDeleteEntry = (id: string) => {
    // Remove entry and clean up any dependsOn references pointing to it
    onUpdate({
      ...project,
      ganttEntries: ganttEntries
        .filter(e => e.id !== id)
        .map(e => ({
          ...e,
          dependsOn: (e.dependsOn ?? []).filter(depId => depId !== id),
        })),
    });
  };

  // ── Dependency toggle helper ─────────────────────────────────────────────────

  const toggleDep = (
    depId: string,
    setter: React.Dispatch<React.SetStateAction<EditState>>,
  ) => {
    setter(s => ({
      ...s,
      dependsOn: s.dependsOn.includes(depId)
        ? s.dependsOn.filter(d => d !== depId)
        : [...s.dependsOn, depId],
    }));
  };

  // ── Compute timeline range ──────────────────────────────────────────────────

  const allDates = [
    project.startDate,
    project.targetDate,
    ...ganttEntries.map(e => e.startDate),
    ...ganttEntries.map(e => e.endDate),
  ].filter(Boolean);

  const rangeStart = allDates.length > 0
    ? allDates.reduce((a, b) => (a < b ? a : b))
    : project.startDate;
  const rangeEnd = allDates.length > 0
    ? allDates.reduce((a, b) => (a > b ? a : b))
    : project.targetDate;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Visual Timeline ──────────────────────────────── */}
      {ganttEntries.length > 0 && (
        <div>
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-400" />
            Timeline View
          </h3>
          <GanttTimeline
            entries={ganttEntries}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </div>
      )}

      {/* ── CSV Import ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-indigo-400" />
            Import from CSV / Spreadsheet
          </h3>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <Download size={13} />
            Download Template
          </button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setCsvDragOver(true); }}
          onDragLeave={() => setCsvDragOver(false)}
          onDrop={handleCsvDrop}
          onClick={() => csvInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            csvDragOver
              ? 'border-indigo-500 bg-indigo-950/30'
              : 'border-gray-700 hover:border-indigo-600 bg-gray-900/50 hover:bg-indigo-950/10'
          }`}
        >
          <FileSpreadsheet size={28} className="mx-auto text-gray-500 mb-2" />
          <p className="text-gray-400 text-sm font-medium">
            Drop your exported Gantt CSV here, or click to upload
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Columns: <span className="text-gray-500">Title, Start Date, End Date, Status, Depends On, Comment</span>
          </p>
          <p className="text-gray-700 text-xs mt-0.5">
            Use semicolons to list multiple predecessors in "Depends On" (e.g. <span className="text-gray-600">Design;Research</span>)
          </p>
        </div>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleCsvFileChange}
          className="hidden"
        />
        {csvError && (
          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
            <AlertTriangle size={14} />
            {csvError}
          </p>
        )}
        {csvSuccess && (
          <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
            <CheckCircle size={14} />
            {csvSuccess}
          </p>
        )}
      </div>

      {/* ── Reference Image Upload ───────────────────────── */}
      <div>
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Image size={16} className="text-indigo-400" />
          Reference Gantt Chart Image
        </h3>

        {project.ganttImageUrl ? (
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <img
              src={project.ganttImageUrl}
              alt="Uploaded Gantt chart"
              className="w-full max-h-96 object-contain"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-500 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Remove image"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setImageDragOver(true); }}
            onDragLeave={() => setImageDragOver(false)}
            onDrop={handleImageDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              imageDragOver
                ? 'border-indigo-500 bg-indigo-950/30'
                : 'border-gray-700 hover:border-indigo-600 bg-gray-900/50 hover:bg-indigo-950/10'
            }`}
          >
            <Upload size={32} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400 text-sm font-medium">
              Drop a Gantt chart image here, or click to upload
            </p>
            <p className="text-gray-600 text-xs mt-1">PNG, JPG, GIF — max 5 MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />
        {imageError && (
          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
            <AlertTriangle size={14} />
            {imageError}
          </p>
        )}
      </div>

      {/* ── Entries list ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Calendar size={16} className="text-indigo-400" />
            Gantt Chart Entries
          </h3>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Add Entry
          </button>
        </div>

        {/* Add-entry form */}
        {showAddForm && (
          <div className="bg-gray-900 rounded-xl border border-indigo-800 p-4 mb-4">
            <p className="text-indigo-300 text-sm font-medium mb-3">New Entry</p>
            <div className="space-y-3">
              <input
                type="text"
                value={newEntry.title}
                onChange={e => setNewEntry(s => ({ ...s, title: e.target.value }))}
                placeholder="Task / phase name…"
                className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex gap-2 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Start date</label>
                  <input
                    type="date"
                    value={newEntry.startDate}
                    onChange={e => setNewEntry(s => ({ ...s, startDate: e.target.value }))}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">End date</label>
                  <input
                    type="date"
                    value={newEntry.endDate}
                    onChange={e => setNewEntry(s => ({ ...s, endDate: e.target.value }))}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Status</label>
                  <select
                    value={newEntry.status}
                    onChange={e => setNewEntry(s => ({ ...s, status: e.target.value as EntryStatus }))}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="on-track">On Track</option>
                    <option value="late">Late</option>
                    <option value="complete">Complete</option>
                  </select>
                </div>
              </div>
              <textarea
                value={newEntry.comment}
                onChange={e => setNewEntry(s => ({ ...s, comment: e.target.value }))}
                placeholder="Comment (optional)…"
                rows={2}
                className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none resize-none"
              />
              {/* Dependency selector */}
              {ganttEntries.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1 mb-1.5">
                    <Link2 size={11} />
                    Depends on (parallel tasks need no selection)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ganttEntries.map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggleDep(e.id, setNewEntry)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                          newEntry.dependsOn.includes(e.id)
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-600'
                        }`}
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={!newEntry.title.trim()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Entry cards */}
        <div className="space-y-3">
          {ganttEntries.map(entry => {
            const cfg = ENTRY_STATUS_CONFIG[entry.status] ?? ENTRY_STATUS_CONFIG['on-track'];
            const StatusIcon = cfg.icon;
            const isEditing = editingId === entry.id;

            return (
              <div
                key={entry.id}
                className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
              >
                {isEditing ? (
                  /* ── Edit form ── */
                  <div className="p-4 space-y-3">
                    <input
                      type="text"
                      value={editState.title}
                      onChange={e => setEditState(s => ({ ...s, title: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Start date</label>
                        <input
                          type="date"
                          value={editState.startDate}
                          onChange={e => setEditState(s => ({ ...s, startDate: e.target.value }))}
                          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">End date</label>
                        <input
                          type="date"
                          value={editState.endDate}
                          onChange={e => setEditState(s => ({ ...s, endDate: e.target.value }))}
                          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Status</label>
                        <select
                          value={editState.status}
                          onChange={e => setEditState(s => ({ ...s, status: e.target.value as EntryStatus }))}
                          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="on-track">On Track</option>
                          <option value="late">Late</option>
                          <option value="complete">Complete</option>
                        </select>
                      </div>
                    </div>
                    <textarea
                      value={editState.comment}
                      onChange={e => setEditState(s => ({ ...s, comment: e.target.value }))}
                      placeholder="Comment…"
                      rows={2}
                      className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none resize-none"
                    />
                    {/* Dependency selector (excludes self) */}
                    {ganttEntries.filter(e => e.id !== editingId).length > 0 && (
                      <div>
                        <label className="text-xs text-gray-500 flex items-center gap-1 mb-1.5">
                          <Link2 size={11} />
                          Depends on
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {ganttEntries
                            .filter(e => e.id !== editingId)
                            .map(e => (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => toggleDep(e.id, setEditState)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                                  editState.dependsOn.includes(e.id)
                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-600'
                                }`}
                              >
                                {e.title}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={!editState.title.trim()}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        <Check size={14} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── View card ── */
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border flex-shrink-0 ${cfg.bg} ${cfg.color}`}
                      >
                        <StatusIcon size={12} />
                        {cfg.label}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{entry.title}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {entry.startDate && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar size={11} />
                              {entry.startDate}
                            </span>
                          )}
                          {entry.endDate && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar size={11} />
                              → {entry.endDate}
                            </span>
                          )}
                        </div>

                        {/* Mini timeline bar */}
                        {entry.startDate && entry.endDate && rangeStart && rangeEnd && (
                          <div className="mt-2 relative h-3 bg-gray-800 rounded-full overflow-hidden">
                            {(() => {
                              const left = dateFraction(entry.startDate, rangeStart, rangeEnd);
                              const right = dateFraction(entry.endDate, rangeStart, rangeEnd);
                              const width = Math.max(right - left, 0.02);
                              return (
                                <div
                                  className={`absolute top-0 h-full rounded-full ${cfg.barColor} opacity-80`}
                                  style={{ left: `${left * 100}%`, width: `${width * 100}%` }}
                                />
                              );
                            })()}
                          </div>
                        )}

                        {/* Dependency tags */}
                        {(entry.dependsOn?.length ?? 0) > 0 && (
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <Link2 size={11} className="text-indigo-400 flex-shrink-0" />
                            {entry.dependsOn!.map(depId => {
                              const dep = ganttEntries.find(e => e.id === depId);
                              return dep ? (
                                <span
                                  key={depId}
                                  className="text-xs text-indigo-300 bg-indigo-950/50 border border-indigo-900/50 rounded px-1.5 py-0.5"
                                >
                                  {dep.title}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}

                        {/* Comment */}
                        {entry.comment && (
                          <div className="mt-2 flex items-start gap-1.5 text-gray-400 text-xs">
                            <MessageSquare size={12} className="flex-shrink-0 mt-0.5" />
                            <span>{entry.comment}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditing(entry)}
                          className="text-gray-600 hover:text-indigo-400 transition-colors p-1 rounded cursor-pointer"
                          title="Edit entry"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded cursor-pointer"
                          title="Delete entry"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {ganttEntries.length === 0 && !showAddForm && (
            <p className="text-gray-500 text-center py-8">
              No Gantt entries yet. Import from CSV above or add entries manually.
            </p>
          )}
        </div>

        {/* Summary counters */}
        {ganttEntries.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
              {ganttEntries.filter(e => e.status === 'on-track').length} on track
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
              {ganttEntries.filter(e => e.status === 'late').length} late
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
              {ganttEntries.filter(e => e.status === 'complete').length} complete
            </span>
            <span className="flex items-center gap-1">
              <Link2 size={11} className="text-indigo-400" />
              {ganttEntries.filter(e => (e.dependsOn?.length ?? 0) > 0).length} with dependencies
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
