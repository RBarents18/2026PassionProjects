export interface Update {
  id: string;
  date: string;
  content: string;
  recommendation?: string;
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
  color: string;
  emoji: string;
}
