import { useState, lazy, Suspense } from 'react';
import type { Project, Update, Milestone, BudgetItem } from '../types';
import { generateRecommendation } from '../utils/recommendations';
import {
  ArrowLeft, Edit, Trash2, Plus, MessageSquare,
  FileText, Sparkles, Calendar, Tag, Clock, AlertTriangle,
  TrendingUp, TrendingDown, CheckCircle, X, Upload, Flag, BarChart2,
  DollarSign, Wallet,
} from 'lucide-react';
import type { ParsedPresentation } from '../utils/presentationParser';

const PresentationUpload = lazy(() => import('./PresentationUpload'));
const GanttChart = lazy(() => import('./GanttChart'));

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

type Tab = 'updates' | 'notes' | 'budget' | 'presentation' | 'gantt';

export default function ProjectDetail({ project, onBack, onEdit, onDelete, onUpdate }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('updates');
  const [newUpdateText, setNewUpdateText] = useState('');
  const [newBudgetDescription, setNewBudgetDescription] = useState('');
  const [newBudgetCategory, setNewBudgetCategory] = useState('Materials');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [newBudgetType, setNewBudgetType] = useState<'expense' | 'income'>('expense');
  const [newBudgetDate, setNewBudgetDate] = useState(new Date().toISOString().split('T')[0]);
  const [newBudgetStatus, setNewBudgetStatus] = useState<'planned' | 'actual'>('planned');
  const [notes, setNotes] = useState(project.notes);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');

  const milestones: Milestone[] = project.milestones ?? [];

  const handleApplyPresentation = (data: ParsedPresentation) => {
    const newMilestones: Milestone[] = data.milestones.map(m => ({
      ...m,
      id: crypto.randomUUID(),
    }));
    onUpdate({
      ...project,
      studentName: data.studentName || project.studentName,
      title: data.title || project.title,
      description: data.description || project.description,
      milestones: [...milestones, ...newMilestones],
    });
    setActiveTab('presentation');
  };

  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG['on-track'];
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

  const BUDGET_CATEGORIES = [
    'Materials', 'Equipment', 'Travel / Transportation', 'Printing',
    'Software / Tech', 'Food / Refreshments', 'Marketing', 'Other',
  ];

  const budget: BudgetItem[] = project.budget ?? [];

  const totalIncome = budget.filter(b => b.type === 'income').reduce((sum, b) => sum + b.amount, 0);
  const totalExpenses = budget.filter(b => b.type === 'expense').reduce((sum, b) => sum + b.amount, 0);
  const balance = totalIncome - totalExpenses;

  const handleAddBudgetItem = () => {
    const amount = parseFloat(newBudgetAmount);
    if (!newBudgetDescription.trim() || isNaN(amount) || amount <= 0) return;
    const item: BudgetItem = {
      id: crypto.randomUUID(),
      description: newBudgetDescription.trim(),
      category: newBudgetCategory,
      amount,
      type: newBudgetType,
      date: newBudgetDate,
      status: newBudgetStatus,
    };
    onUpdate({ ...project, budget: [...budget, item] });
    setNewBudgetDescription('');
    setNewBudgetAmount('');
    setNewBudgetDate(new Date().toISOString().split('T')[0]);
    setNewBudgetStatus('planned');
  };

  const handleDeleteBudgetItem = (id: string) => {
    onUpdate({ ...project, budget: budget.filter(b => b.id !== id) });
  };

  const handleAddMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      title: newMilestoneTitle.trim(),
      dueDate: newMilestoneDueDate,
      completed: false,
    };
    onUpdate({ ...project, milestones: [...milestones, newMilestone] });
    setNewMilestoneTitle('');
    setNewMilestoneDueDate('');
  };

  const handleToggleMilestone = (id: string) => {
    onUpdate({
      ...project,
      milestones: milestones.map(m => m.id === id ? { ...m, completed: !m.completed } : m),
    });
  };

  const handleDeleteMilestone = (id: string) => {
    onUpdate({ ...project, milestones: milestones.filter(m => m.id !== id) });
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
            { id: 'budget', label: 'Budget', icon: DollarSign },
            { id: 'presentation', label: 'Presentation', icon: Upload },
            { id: 'gantt', label: 'Gantt Chart', icon: BarChart2 },
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

          {/* Budget Tab */}
          {activeTab === 'budget' && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-green-400 mb-1">
                    <TrendingUp size={16} />
                    <span className="text-xs font-medium uppercase tracking-wide">Total Income</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">${totalIncome.toFixed(2)}</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-red-400 mb-1">
                    <TrendingDown size={16} />
                    <span className="text-xs font-medium uppercase tracking-wide">Total Expenses</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">${totalExpenses.toFixed(2)}</p>
                </div>
                <div className={`bg-gray-900 rounded-xl border p-4 text-center ${balance >= 0 ? 'border-green-800' : 'border-red-800'}`}>
                  <div className={`flex items-center justify-center gap-1.5 mb-1 ${balance >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                    <Wallet size={16} />
                    <span className="text-xs font-medium uppercase tracking-wide">Balance</span>
                  </div>
                  <p className={`text-2xl font-bold ${balance >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                    {balance < 0 ? '-' : ''}${Math.abs(balance).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Add Entry Form */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
                <h3 className="text-white font-medium mb-3">Add Budget Entry</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={newBudgetDescription}
                    onChange={e => setNewBudgetDescription(e.target.value)}
                    placeholder="Description (e.g., PVC pipe, batteries…)"
                    className="col-span-2 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  />
                  <select
                    value={newBudgetCategory}
                    onChange={e => setNewBudgetCategory(e.target.value)}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  >
                    {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newBudgetAmount}
                    onChange={e => setNewBudgetAmount(e.target.value)}
                    placeholder="Amount ($)"
                    className="bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewBudgetType('expense')}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${newBudgetType === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBudgetType('income')}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${newBudgetType === 'income' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                      Income
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewBudgetStatus('planned')}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${newBudgetStatus === 'planned' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                      Planned
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBudgetStatus('actual')}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${newBudgetStatus === 'actual' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                      Actual
                    </button>
                  </div>
                  <input
                    type="date"
                    value={newBudgetDate}
                    onChange={e => setNewBudgetDate(e.target.value)}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddBudgetItem}
                    disabled={!newBudgetDescription.trim() || !newBudgetAmount || parseFloat(newBudgetAmount) <= 0}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Plus size={16} />
                    Add Entry
                  </button>
                </div>
              </div>

              {/* Budget Table */}
              {budget.length > 0 ? (
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {[...budget].sort((a, b) => a.date.localeCompare(b.date)).map(item => (
                        <tr key={item.id} className="group hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-white">{item.description}</td>
                          <td className="px-4 py-3 text-gray-400">{item.category}</td>
                          <td className="px-4 py-3 text-gray-400">{item.date}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status === 'actual' ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                              {item.status === 'actual' ? 'Actual' : 'Planned'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                            {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteBudgetItem(item.id)}
                              className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No budget entries yet. Add income and expenses above to get started!</p>
              )}
            </div>
          )}

          {/* Presentation Tab */}
          {activeTab === 'presentation' && (
            <div className="space-y-6">
              {/* Upload section */}
              <Suspense fallback={<div className="text-gray-400 text-sm p-4">Loading…</div>}>
                <PresentationUpload onApply={handleApplyPresentation} />
              </Suspense>

              {/* Milestones / Timeline */}
              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Flag size={16} className="text-indigo-400" />
                  Project Timeline &amp; Milestones
                </h3>

                {/* Add milestone */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
                  <p className="text-sm text-gray-400 mb-3">Add a milestone manually</p>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="text"
                      value={newMilestoneTitle}
                      onChange={e => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddMilestone()}
                      placeholder="Milestone title…"
                      className="flex-1 min-w-[160px] bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={newMilestoneDueDate}
                      onChange={e => setNewMilestoneDueDate(e.target.value)}
                      className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={handleAddMilestone}
                      disabled={!newMilestoneTitle.trim()}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                </div>

                {/* Milestone list */}
                <div className="space-y-2">
                  {milestones.map(m => (
                    <div
                      key={m.id}
                      className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-start gap-3 group"
                    >
                      <button
                        onClick={() => handleToggleMilestone(m.id)}
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-colors cursor-pointer ${
                          m.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-600 hover:border-green-400'
                        }`}
                        title={m.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {m.completed && <CheckCircle size={14} className="m-auto" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${m.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                          {m.title}
                        </p>
                        {m.dueDate && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <Calendar size={11} />
                            Due {m.dueDate}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteMilestone(m.id)}
                        className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {milestones.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No milestones yet. Upload a presentation or add one manually above.
                    </p>
                  )}
                </div>

                {milestones.length > 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    {milestones.filter(m => m.completed).length} of {milestones.length} milestones completed
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Gantt Chart Tab */}
          {activeTab === 'gantt' && (
            <Suspense fallback={<div className="text-gray-400 text-sm p-4">Loading…</div>}>
              <GanttChart project={project} onUpdate={onUpdate} />
            </Suspense>
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
