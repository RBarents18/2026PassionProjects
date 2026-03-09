import { useState, useEffect } from 'react';
import type { Project } from './types';
import { loadProjects, saveProjects } from './utils/storage';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import ProjectForm from './components/ProjectForm';

type View = 'dashboard' | 'detail' | 'create' | 'edit';

export default function App() {
  // Lazy initializer so projects are loaded once from storage on mount
  // without needing a separate effect — this also prevents the save effect
  // from running before data has been loaded.
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [view, setView] = useState<View>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setView('detail');
  };

  const handleCreateProject = () => {
    setSelectedProjectId(null);
    setView('create');
  };

  const handleEditProject = (id: string) => {
    setSelectedProjectId(id);
    setView('edit');
  };

  const handleSaveProject = (project: Project) => {
    setProjects(prev => {
      const exists = prev.find(p => p.id === project.id);
      if (exists) {
        return prev.map(p => p.id === project.id ? project : p);
      }
      return [...prev, project];
    });
    setSelectedProjectId(project.id);
    setView('detail');
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setView('dashboard');
    setSelectedProjectId(null);
  };

  const handleUpdateProject = (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
  };

  const handleBack = () => {
    if (view === 'detail') {
      setView('dashboard');
      setSelectedProjectId(null);
    } else if (view === 'create') {
      setView('dashboard');
    } else if (view === 'edit' && selectedProjectId) {
      setView('detail');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {view === 'dashboard' && (
        <Dashboard
          projects={projects}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
        />
      )}
      {view === 'detail' && selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onBack={handleBack}
          onEdit={() => handleEditProject(selectedProject.id)}
          onDelete={() => handleDeleteProject(selectedProject.id)}
          onUpdate={handleUpdateProject}
        />
      )}
      {(view === 'create' || view === 'edit') && (
        <ProjectForm
          project={view === 'edit' ? selectedProject : null}
          onSave={handleSaveProject}
          onCancel={handleBack}
        />
      )}
    </div>
  );
}

