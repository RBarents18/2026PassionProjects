
const RECOMMENDATIONS: Record<string, string[]> = {
  stuck: [
    "Consider breaking the problem into smaller, manageable tasks.",
    "Try discussing your challenge with a peer or mentor.",
    "Look for existing solutions or examples online to inspire your approach.",
  ],
  research: [
    "Document your research sources in a bibliography as you go.",
    "Consider creating a summary or mind map of your findings.",
    "Look for primary sources and expert opinions to strengthen your work.",
  ],
  design: [
    "Create wireframes or sketches before building to save time.",
    "Consider user feedback early in the design process.",
    "Explore multiple design options before committing to one.",
  ],
  prototype: [
    "Focus on a minimum viable prototype first before adding features.",
    "Test your prototype with real users to get meaningful feedback.",
    "Document what works and what doesn't as you iterate.",
  ],
  testing: [
    "Create a structured test plan with clear success criteria.",
    "Involve peers or target users in your testing process.",
    "Track and categorize bugs or issues for systematic resolution.",
  ],
  presentation: [
    "Practice your presentation at least 3 times before the final.",
    "Create a compelling story arc for your project narrative.",
    "Prepare for questions by anticipating what reviewers might ask.",
  ],
  data: [
    "Ensure your data collection method is consistent and documented.",
    "Consider what visualizations best represent your data.",
    "Look for patterns and outliers in your dataset.",
  ],
  coding: [
    "Break your code into small, testable functions.",
    "Add comments to explain complex logic for future reference.",
    "Use version control to track your progress and avoid losing work.",
  ],
  deadline: [
    "Create a detailed timeline working backwards from your deadline.",
    "Identify which tasks are on the critical path and prioritize them.",
    "Consider what can be simplified if time runs short.",
  ],
  progress: [
    "Great momentum! Set your next milestone to keep the energy going.",
    "Document your successes so far - they'll help in your final presentation.",
    "Consider what the next biggest challenge will be and start planning for it.",
  ],
};

const DEFAULT_RECOMMENDATIONS = [
  "Set a specific goal for your next work session.",
  "Review your project timeline and adjust if needed.",
  "Consider sharing an update with your teacher or classmates.",
  "Look for connections between your project and real-world applications.",
];

export function generateRecommendation(updateContent: string): string {
  const lowerContent = updateContent.toLowerCase();

  const keywordVariants: Record<string, string[]> = {
    stuck: ['stuck', 'blocked', 'confused', 'struggling', 'problem', 'issue', 'difficult', 'hard'],
    research: ['research', 'reading', 'studying', 'literature', 'sources', 'information'],
    design: ['design', 'designing', 'sketch', 'layout', 'ui', 'interface', 'look'],
    prototype: ['prototype', 'build', 'building', 'making', 'creating', 'construct'],
    testing: ['test', 'testing', 'experiment', 'trial', 'debug', 'debugging', 'error'],
    presentation: ['present', 'presentation', 'demo', 'showcase', 'display', 'show'],
    data: ['data', 'survey', 'results', 'statistics', 'measurement', 'analysis', 'analyze'],
    coding: ['code', 'coding', 'programming', 'script', 'function', 'class', 'algorithm'],
    deadline: ['deadline', 'due', 'time', 'schedule', 'behind', 'late', 'rush'],
    progress: ['finished', 'completed', 'done', 'achieved', 'success', 'working', 'great'],
  };

  for (const [keyword, variants] of Object.entries(keywordVariants)) {
    if (variants.some(v => lowerContent.includes(v))) {
      const recs = RECOMMENDATIONS[keyword];
      return recs[Math.floor(Math.random() * recs.length)];
    }
  }

  return DEFAULT_RECOMMENDATIONS[Math.floor(Math.random() * DEFAULT_RECOMMENDATIONS.length)];
}
