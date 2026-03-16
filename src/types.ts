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

export interface GanttEntry {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'on-track' | 'late' | 'complete';
  comment: string;
  /** IDs of GanttEntry tasks that must be completed before this one can start. */
  dependsOn?: string[];
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
  ganttEntries: GanttEntry[];
  ganttImageUrl?: string;
}
