export interface Update {
  id: string;
  date: string;
  content: string;
  recommendation?: string;
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface Project {
  id: string;
  studentName: string;
  title: string;
  description: string;
  category: string;
  status: 'on-track' | 'needs-attention' | 'at-risk' | 'completed';
  startDate: string;
  targetDate: string;
  updates: Update[];
  notes: string;
  brainstorm: string[];
  milestones: Milestone[];
  color: string;
  emoji: string;
}
