import type { Project } from '../types';
import { Plus, BookOpen, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
}

const STATUS_CONFIG = {
  'on-track': { label: 'On Track', color: 'text-green-400', bg: 'bg-green-900/50', icon: TrendingUp },
  'needs-attention': { label: 'Needs Attention', color: 'text-yellow-400', bg: 'bg-yellow-900/50', icon: AlertTriangle },
  'at-risk': { label: 'At Risk', color: 'text-red-400', bg: 'bg-red-900/50', icon: AlertTriangle },
  'completed': { label: 'Completed', color: 'text-blue-400', bg: 'bg-blue-900/50', icon: CheckCircle },
};

export default function Dashboard({ projects, onSelectProject, onCreateProject }: DashboardProps) {
  const stats = {
    total: projects.length,
    onTrack: projects.filter(p => p.status === 'on-track').length,
    needsAttention: projects.filter(p => p.status === 'needs-attention' || p.status === 'at-risk').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BookOpen className="text-indigo-400" size={32} />
              Passion Projects Tracker
            </h1>
            <p className="text-gray-400 mt-1">University of Arizona Dual Enrollment — STEM Passion Projects</p>
          </div>
          <button
            onClick={onCreateProject}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Total Projects</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm flex items-center gap-1">
              <TrendingUp size={14} className="text-green-400" /> On Track
            </p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.onTrack}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm flex items-center gap-1">
              <AlertTriangle size={14} className="text-yellow-400" /> Needs Attention
            </p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.needsAttention}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm flex items-center gap-1">
              <CheckCircle size={14} className="text-blue-400" /> Completed
            </p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.completed}</p>
          </div>
        </div>

        {/* Project Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">No projects yet. Add your first student project!</p>
            <button
              onClick={onCreateProject}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} onClick={() => onSelectProject(project.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG['on-track'];
  const StatusIcon = status.icon;
  const updates = project.updates ?? [];
  const lastUpdate = updates[updates.length - 1];

  const daysUntilTarget = Math.ceil(
    (new Date(project.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden cursor-pointer hover:border-gray-600 hover:shadow-lg hover:shadow-black/30 transition-all duration-200 group"
    >
      {/* Gradient Header */}
      <div className={`bg-gradient-to-r ${project.color} p-5 relative`}>
        <span className="text-4xl">{project.emoji}</span>
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${status.bg} ${status.color} backdrop-blur-sm`}>
            <StatusIcon size={12} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{project.category}</p>
        <h3 className="font-bold text-white text-lg leading-tight group-hover:text-indigo-300 transition-colors">{project.title}</h3>
        <p className="text-indigo-300 text-sm font-medium mt-1">{project.studentName}</p>
        <p className="text-gray-400 text-sm mt-2 line-clamp-2">{project.description}</p>

        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Clock size={12} />
            {daysUntilTarget > 0
              ? `${daysUntilTarget}d remaining`
              : daysUntilTarget === 0
              ? 'Due today'
              : `${Math.abs(daysUntilTarget)}d overdue`}
          </div>
          <span className="text-gray-500 text-xs">
            {updates.length} update{updates.length !== 1 ? 's' : ''}
          </span>
        </div>

        {lastUpdate && (
          <div className="mt-3 bg-gray-800/60 rounded-lg p-3">
            <p className="text-gray-300 text-xs line-clamp-2">💬 {lastUpdate.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}
