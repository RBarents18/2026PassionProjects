import type { Project } from '../types';

const STORAGE_KEY = 'passion_projects_v1';

export function loadProjects(): Project[] {
  const seedProjects = getSampleProjects();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return seedProjects;
    const stored = JSON.parse(data) as Project[];
    // Backward compatibility: ensure milestones field exists
    const storedProjects = stored.map(p => ({
      ...p,
      milestones: p.milestones ?? [],
      ganttEntries: p.ganttEntries ?? [],
    }));
    // Merge: include any seed projects whose IDs are not already in stored data.
    // This ensures projects added to getSampleProjects() always appear even when
    // localStorage already has entries, preventing manual additions from being lost.
    const storedIds = new Set(storedProjects.map(p => p.id));
    const missingSeedProjects = seedProjects.filter(p => !storedIds.has(p.id));
    return [...missingSeedProjects, ...storedProjects];
  } catch {
    return seedProjects;
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getSampleProjects(): Project[] {
  return [
    {
      id: '1',
      studentName: 'Alex Rivera',
      title: 'Solar-Powered Water Purifier',
      description: 'Designing a low-cost solar energy system to purify water in rural communities using UV sterilization.',
      category: 'Environmental Engineering',
      status: 'on-track',
      startDate: '2026-01-15',
      targetDate: '2026-05-01',
      updates: [
        {
          id: 'u1',
          date: '2026-02-10',
          content: 'Completed initial research on UV sterilization methods. Found three promising approaches.',
          recommendation: 'Document your research sources in a bibliography as you go.',
        },
        {
          id: 'u2',
          date: '2026-03-01',
          content: 'Started building the first prototype using recycled PVC pipe. Testing basic water flow.',
          recommendation: 'Focus on a minimum viable prototype first before adding features.',
        },
      ],
      notes: 'Alex is very motivated. Connect with the UA engineering department for mentorship.',
      brainstorm: ['Add a simple filter for particles', 'Explore graphene-based filtration', 'Partner with local NGO for field testing'],
      milestones: [],
      ganttEntries: [],
      color: 'from-blue-500 to-cyan-400',
      emoji: '☀️',
    },
    {
      id: '2',
      studentName: 'Jordan Kim',
      title: 'AI Music Composer',
      description: 'Building a machine learning model that generates original music based on emotional input parameters.',
      category: 'Computer Science & Arts',
      status: 'needs-attention',
      startDate: '2026-01-20',
      targetDate: '2026-05-01',
      updates: [
        {
          id: 'u3',
          date: '2026-02-15',
          content: 'Researching LSTM neural networks for music generation. Getting confused by the math.',
          recommendation: 'Consider breaking the problem into smaller, manageable tasks.',
        },
      ],
      notes: 'Jordan has great creative vision but may need help with the ML fundamentals.',
      brainstorm: ['Use pre-trained model (Magenta)', 'Focus on one genre first', 'Create web interface for input'],
      milestones: [],
      ganttEntries: [],
      color: 'from-purple-500 to-pink-400',
      emoji: '🎵',
    },
    {
      id: '3',
      studentName: 'Sam Chen',
      title: 'Urban Vertical Garden System',
      description: 'Designing an automated hydroponic vertical garden for urban apartments with IoT monitoring.',
      category: 'Biotechnology & IoT',
      status: 'on-track',
      startDate: '2026-01-10',
      targetDate: '2026-05-01',
      updates: [
        {
          id: 'u4',
          date: '2026-02-20',
          content: 'Completed the Arduino-based moisture sensor and nutrient pump. Everything working!',
          recommendation: 'Great momentum! Set your next milestone to keep the energy going.',
        },
      ],
      notes: 'Sam is ahead of schedule. Encourage to add data logging to the IoT system.',
      brainstorm: ['Add mobile app for monitoring', 'Experiment with different crops', 'Add growth rate tracking'],
      milestones: [],
      ganttEntries: [],
      color: 'from-green-500 to-emerald-400',
      emoji: '🌱',
    },
  ];
}
