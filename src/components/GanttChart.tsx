import { useState, useRef } from 'react';
import type { Project, GanttEntry } from '../types';
import {
  Plus, X, Edit2, Check, Upload, Image, Calendar,
  TrendingUp, AlertTriangle, CheckCircle, MessageSquare,
  Trash2,
} from 'lucide-react';

interface GanttChartProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

const ENTRY_STATUS_CONFIG = {
  'on-track': {
    label: 'On Track',
    color: 'text-green-400',
    bg: 'bg-green-900/40 border-green-700',
    barColor: 'bg-green-500',
    icon: TrendingUp,
  },
  'late': {
    label: 'Late',
    color: 'text-red-400',
    bg: 'bg-red-900/40 border-red-700',
    barColor: 'bg-red-500',
    icon: AlertTriangle,
  },
  'complete': {
    label: 'Complete',
    color: 'text-blue-400',
    bg: 'bg-blue-900/40 border-blue-700',
    barColor: 'bg-blue-500',
    icon: CheckCircle,
  },
};

type EntryStatus = GanttEntry['status'];

/** Returns a fractional position [0,1] for a date within [rangeStart, rangeEnd]. */
function dateFraction(date: string, rangeStart: string, rangeEnd: string): number {
  const d = new Date(date).getTime();
  const s = new Date(rangeStart).getTime();
  const e = new Date(rangeEnd).getTime();
  if (e <= s) return 0;
  return Math.min(1, Math.max(0, (d - s) / (e - s)));
}

interface EditState {
  title: string;
  startDate: string;
  endDate: string;
  status: EntryStatus;
  comment: string;
}

export default function GanttChart({ project, onUpdate }: GanttChartProps) {
  const ganttEntries: GanttEntry[] = project.ganttEntries ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    title: '',
    startDate: '',
    endDate: '',
    status: 'on-track',
    comment: '',
  });

  const [newEntry, setNewEntry] = useState<EditState>({
    title: '',
    startDate: project.startDate,
    endDate: project.targetDate,
    status: 'on-track',
    comment: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [imageError, setImageError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image upload ──────────────────────────────────────────────────────────

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

  // ── Add entry ─────────────────────────────────────────────────────────────

  const handleAddEntry = () => {
    if (!newEntry.title.trim()) return;
    const entry: GanttEntry = {
      id: crypto.randomUUID(),
      title: newEntry.title.trim(),
      startDate: newEntry.startDate,
      endDate: newEntry.endDate,
      status: newEntry.status,
      comment: newEntry.comment.trim(),
    };
    onUpdate({ ...project, ganttEntries: [...ganttEntries, entry] });
    setNewEntry({
      title: '',
      startDate: project.startDate,
      endDate: project.targetDate,
      status: 'on-track',
      comment: '',
    });
    setShowAddForm(false);
  };

  // ── Edit entry ────────────────────────────────────────────────────────────

  const startEditing = (entry: GanttEntry) => {
    setEditingId(entry.id);
    setEditState({
      title: entry.title,
      startDate: entry.startDate,
      endDate: entry.endDate,
      status: entry.status,
      comment: entry.comment,
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
            }
          : e,
      ),
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleDeleteEntry = (id: string) => {
    onUpdate({ ...project, ganttEntries: ganttEntries.filter(e => e.id !== id) });
  };

  // ── Compute timeline range ─────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
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

      {/* Editable Entries Section */}
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

        {/* Add entry form */}
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

        {/* Entries list */}
        <div className="space-y-3">
          {ganttEntries.map(entry => {
            const cfg = ENTRY_STATUS_CONFIG[entry.status];
            const StatusIcon = cfg.icon;
            const isEditing = editingId === entry.id;

            return (
              <div
                key={entry.id}
                className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
              >
                {isEditing ? (
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

                        {/* Timeline bar */}
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

                        {/* Comment */}
                        {entry.comment && (
                          <div className="mt-2 flex items-start gap-1.5 text-gray-400 text-xs">
                            <MessageSquare size={12} className="flex-shrink-0 mt-0.5" />
                            <span>{entry.comment}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
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
              No Gantt entries yet. Upload a reference chart above or add entries manually.
            </p>
          )}
        </div>

        {/* Timeline summary */}
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
          </div>
        )}
      </div>
    </div>
  );
}
