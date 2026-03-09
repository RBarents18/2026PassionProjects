import { useState } from 'react';
import type { Project, Update } from '../types';
import { generateRecommendation } from '../utils/recommendations';
import {
  ArrowLeft, Edit, Trash2, Plus, Lightbulb, MessageSquare,
  FileText, Sparkles, Calendar, Tag, Clock, AlertTriangle,
  TrendingUp, CheckCircle, X
} from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (project: Project) => void;
}

const STATUS_CONFIG = {
  'on-track': { label: 'On Track', color: 'text-green-400', bg: 'bg-green-900/30 border-green-800', icon: TrendingUp },
  'needs-attention': { label: 'Needs Attention', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800', icon: AlertTriangle },
  'at-risk': { label: 'At Risk', color: 'text-red-400', bg: 'bg-red-900/30 border-red-800', icon: AlertTriangle },
  'completed': { label: 'Completed', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800', icon: CheckCircle },
};

type Tab = 'updates' | 'notes' | 'brainstorm';

export default function ProjectDetail({ project, onBack, onEdit, onDelete, onUpdate }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('updates');
  const [newUpdateText, setNewUpdateText] = useState('');
  const [newBrainstormItem, setNewBrainstormItem] = useState('');
  const [notes, setNotes] = useState(project.notes);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const status = STATUS_CONFIG[project.status];
  const StatusIcon = status.icon;

  const handleAddUpdate = () => {
    if (!newUpdateText.trim()) return;
    const recommendation = generateRecommendation(newUpdateText);
    const newUpdate: Update = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      content: newUpdateText.trim(),
      recommendation,
    };
    onUpdate({ ...project, updates: [...project.updates, newUpdate] });
    setNewUpdateText('');
  };

  const handleDeleteUpdate = (updateId: string) => {
    onUpdate({ ...project, updates: project.updates.filter(u => u.id !== updateId) });
  };

  const handleSaveNotes = () => {
    onUpdate({ ...project, notes });
  };

  const handleAddBrainstorm = () => {
    if (!newBrainstormItem.trim()) return;
    onUpdate({ ...project, brainstorm: [...project.brainstorm, newBrainstormItem.trim()] });
    setNewBrainstormItem('');
  };

  const handleDeleteBrainstorm = (index: number) => {
    onUpdate({ ...project, brainstorm: project.brainstorm.filter((_, i) => i !== index) });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Header */}
      <div className={`bg-gradient-to-r ${project.color} relative`}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/30 px-3 py-2 rounded-lg cursor-pointer"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 bg-red-500/30 hover:bg-red-500/50 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-6xl">{project.emoji}</span>
            <div>
              <p className="text-white/70 text-sm uppercase tracking-wide">{project.category}</p>
              <h1 className="text-3xl font-bold text-white mt-1">{project.title}</h1>
              <p className="text-white/90 text-lg mt-1">{project.studentName}</p>
              <p className="text-white/70 mt-2 max-w-2xl">{project.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <span className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${status.bg} ${status.color}`}>
              <StatusIcon size={14} />
              {status.label}
            </span>
            <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-black/20 text-white/80">
              <Calendar size={14} />
              Started {project.startDate}
            </span>
            <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-black/20 text-white/80">
              <Clock size={14} />
              Target: {project.targetDate}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex gap-1 mt-6 bg-gray-900 rounded-xl p-1 w-fit">
          {([
            { id: 'updates', label: 'Updates Log', icon: MessageSquare },
            { id: 'notes', label: 'Teacher Notes', icon: FileText },
            { id: 'brainstorm', label: 'Brainstorm', icon: Lightbulb },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6 pb-10">
          {/* Updates Tab */}
          {activeTab === 'updates' && (
            <div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
                <h3 className="text-white font-medium mb-3">Add Student Update</h3>
                <textarea
                  value={newUpdateText}
                  onChange={e => setNewUpdateText(e.target.value)}
                  placeholder="Enter a student update... (e.g., 'Completed prototype testing, working on data analysis')"
                  className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg p-3 text-sm resize-none border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  rows={3}
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-gray-500 text-xs flex items-center gap-1">
                    <Sparkles size={12} className="text-indigo-400" />
                    AI recommendation will be generated automatically
                  </p>
                  <button
                    onClick={handleAddUpdate}
                    disabled={!newUpdateText.trim()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Plus size={16} />
                    Add Update
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {[...project.updates].reverse().map(update => (
                  <div key={update.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Tag size={14} className="text-gray-500" />
                            <span className="text-gray-400 text-xs">{update.date}</span>
                          </div>
                          <p className="text-white text-sm">{update.content}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteUpdate(update.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {update.recommendation && (
                        <div className="mt-3 bg-indigo-950/50 border border-indigo-900/50 rounded-lg p-3 flex gap-2">
                          <Sparkles size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                          <p className="text-indigo-200 text-sm">{update.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {project.updates.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No updates yet. Add the first student update above.</p>
                )}
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <h3 className="text-white font-medium mb-3">Teacher Notes</h3>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add private teacher notes about this student and project..."
                  className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg p-3 text-sm resize-none border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  rows={10}
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSaveNotes}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Brainstorm Tab */}
          {activeTab === 'brainstorm' && (
            <div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
                <h3 className="text-white font-medium mb-3">Add Brainstorm Idea</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBrainstormItem}
                    onChange={e => setNewBrainstormItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddBrainstorm()}
                    placeholder="Enter an idea, next step, or question..."
                    className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddBrainstorm}
                    disabled={!newBrainstormItem.trim()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {project.brainstorm.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-start gap-3 group"
                  >
                    <Lightbulb size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-300 text-sm flex-1">{item}</p>
                    <button
                      onClick={() => handleDeleteBrainstorm(index)}
                      className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {project.brainstorm.length === 0 && (
                  <p className="text-gray-500 text-center py-8 col-span-2">No brainstorm ideas yet. Add ideas to explore!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 max-w-sm w-full">
            <h3 className="text-white font-bold text-lg mb-2">Delete Project?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete &quot;{project.title}&quot; and all its data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
