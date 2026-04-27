import { useState, lazy, Suspense } from 'react';
import type { Project } from '../types';
import { ArrowLeft, Save } from 'lucide-react';
import type { ParsedPresentation } from '../utils/presentationParser';

const PresentationUpload = lazy(() => import('./PresentationUpload'));

interface ProjectFormProps {
  project: Project | null;
  onSave: (project: Project) => void;
  onCancel: () => void;
}

const COLORS = [
  { value: 'from-blue-500 to-cyan-400', label: 'Ocean Blue' },
  { value: 'from-purple-500 to-pink-400', label: 'Purple Pink' },
  { value: 'from-green-500 to-emerald-400', label: 'Forest Green' },
  { value: 'from-orange-500 to-amber-400', label: 'Sunset Orange' },
  { value: 'from-red-500 to-rose-400', label: 'Crimson Red' },
  { value: 'from-indigo-500 to-violet-400', label: 'Deep Indigo' },
  { value: 'from-teal-500 to-cyan-400', label: 'Teal' },
  { value: 'from-yellow-500 to-orange-400', label: 'Golden Yellow' },
  { value: 'from-pink-500 to-fuchsia-400', label: 'Hot Pink' },
  { value: 'from-sky-500 to-blue-400', label: 'Sky Blue' },
  { value: 'from-lime-500 to-green-400', label: 'Lime Green' },
  { value: 'from-amber-500 to-yellow-400', label: 'Amber' },
  { value: 'from-violet-500 to-purple-400', label: 'Violet' },
  { value: 'from-cyan-500 to-teal-400', label: 'Aqua' },
  { value: 'from-rose-500 to-pink-400', label: 'Rose' },
  { value: 'from-fuchsia-500 to-violet-400', label: 'Fuchsia' },
  { value: 'from-emerald-500 to-lime-400', label: 'Emerald Lime' },
  { value: 'from-blue-600 to-indigo-400', label: 'Royal Blue' },
  { value: 'from-orange-600 to-red-400', label: 'Lava' },
  { value: 'from-slate-500 to-gray-400', label: 'Silver' },
];

const EMOJIS = [
  // Science & Research
  '🔬', '🧬', '🧪', '🧲', '🔭', '⚗️', '🧠',
  // Technology & Computing
  '💻', '🤖', '📡', '📱', '🖥️', '💾', '🎮',
  // Engineering & Making
  '⚙️', '🔧', '🔩', '🛠️', '🏗️', '🔋', '💡',
  // Space & Physics
  '🚀', '🛸', '✈️', '🌍', '🌙', '⭐', '☀️', '⚡',
  // Nature & Environment
  '🌱', '🌿', '🌲', '💧', '🌊', '🌬️', '♻️',
  // Health & Medicine
  '🩺', '💊', '❤️', '🏥',
  // Arts & Creativity
  '🎨', '🎵', '🎭', '📷', '✏️',
  // Sports
  '⛳', '🎾', '⚽', '🏀', '🏈', '⚾', '🎯',
  '🏊', '🚴', '🏋️', '🏆', '🥇',
  // Agriculture & Food
  '🌾', '🥬', '🍃',
  // Other
  '📚', '🎓', '🌟', '🗺️', '📊',
];

const CATEGORIES = [
  // Computer Science
  'Computer Science',
  'Software Engineering',
  'Computer Engineering',
  'Data Science & Machine Learning',
  'Cybersecurity',
  'Computer Science & Arts',
  // Engineering Sub-disciplines
  'Aerospace Engineering',
  'Agricultural Engineering',
  'Biomedical Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Environmental Engineering',
  'Industrial Engineering',
  'Materials Science & Engineering',
  'Mechanical Engineering',
  'Nuclear Engineering',
  'Robotics & Automation',
  'Structural Engineering',
  'Systems Engineering',
  // Science
  'Biotechnology',
  'Biotechnology & IoT',
  'Chemistry',
  'Environmental Science',
  'Physics',
  // Other STEM & Interdisciplinary
  'Mathematics',
  'Social Science',
  'Other',
];

export default function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const isEdit = project !== null;
  const [form, setForm] = useState({
    studentName: project?.studentName ?? '',
    title: project?.title ?? '',
    description: project?.description ?? '',
    category: project?.category ?? 'Computer Science',
    status: (project?.status ?? 'on-track') as Project['status'],
    startDate: project?.startDate ?? new Date().toISOString().split('T')[0],
    targetDate: project?.targetDate ?? '',
    color: project?.color ?? 'from-indigo-500 to-violet-400',
    emoji: project?.emoji ?? '🔬',
    notes: project?.notes ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const saved: Project = {
      id: project?.id ?? Date.now().toString(),
      ...form,
      updates: project?.updates ?? [],
      brainstorm: project?.brainstorm ?? [],
      milestones: project?.milestones ?? [],
      ganttEntries: project?.ganttEntries ?? [],
      ganttImageUrl: project?.ganttImageUrl,
    };
    onSave(saved);
  };

  const applyParsed = (data: ParsedPresentation) => {
    setForm(prev => ({
      ...prev,
      studentName: data.studentName || prev.studentName,
      title: data.title || prev.title,
      description: data.description || prev.description,
      category: CATEGORIES.includes(data.category) ? data.category : prev.category,
      startDate: data.startDate || prev.startDate,
      targetDate: data.targetDate || prev.targetDate,
    }));
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Project' : 'New Project'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Presentation Upload */}
          <Suspense fallback={<div className="text-gray-400 text-sm p-4">Loading…</div>}>
            <PresentationUpload onApply={applyParsed} compact />
          </Suspense>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Student Name *</label>
              <input
                required
                type="text"
                value={form.studentName}
                onChange={e => update('studentName', e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., Alex Rivera"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Project Title *</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="e.g., Solar-Powered Water Purifier"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={3}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none resize-none"
                placeholder="Brief description of the project..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <select
                value={form.category}
                onChange={e => update('category', e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={form.status}
                onChange={e => update('status', e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="on-track">On Track</option>
                <option value="needs-attention">Needs Attention</option>
                <option value="at-risk">At Risk</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => update('startDate', e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Target Date</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={e => update('targetDate', e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Card Color</label>
            <div className="grid grid-cols-5 gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => update('color', c.value)}
                  className={`h-10 rounded-lg bg-gradient-to-r ${c.value} transition-all cursor-pointer ${
                    form.color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-950' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Emoji Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Project Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => update('emoji', e)}
                  className={`text-2xl p-2 rounded-lg transition-all cursor-pointer ${
                    form.emoji === e ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer"
            >
              <Save size={18} />
              {isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
