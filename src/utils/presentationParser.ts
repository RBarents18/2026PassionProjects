import * as pdfjs from 'pdfjs-dist';
import type { Milestone } from '../types';

// Configure PDF.js worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

export interface ParsedPresentation {
  studentName: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  targetDate: string;
  milestones: Milestone[];
  nextSteps: string[];
}

/** Extract plain text from an uploaded PDF or text file. */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(pageText);
  }
  return pages.join('\n');
}

// ---------------------------------------------------------------------------
// Category detection
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Computer Science': [
    'algorithm', 'software', 'programming', 'app', 'application', 'code',
    'web', 'mobile', 'database', 'machine learning', 'neural', 'artificial intelligence',
  ],
  'Environmental Engineering': [
    'solar', 'renewable energy', 'water purif', 'filter', 'waste', 'recycle',
    'sustainability', 'clean energy', 'carbon', 'emission',
  ],
  'Environmental Science': [
    'environment', 'climate', 'ecology', 'pollution', 'conservation',
    'biodiversity', 'ecosystem', 'habitat',
  ],
  Biotechnology: [
    'biology', 'genetic', 'dna', 'cell', 'protein', 'enzyme',
    'biotech', 'organism', 'bacteria', 'virus',
  ],
  Engineering: [
    'design', 'build', 'construct', 'structural', 'mechanical',
    'electrical', 'circuit', 'robot', 'hardware',
  ],
  Physics: [
    'physics', 'quantum', 'force', 'energy', 'wave', 'light', 'matter', 'particle',
  ],
  Chemistry: [
    'chemistry', 'chemical', 'reaction', 'molecule', 'compound', 'element', 'synthesis',
  ],
  Mathematics: [
    'math', 'algebra', 'calculus', 'statistics', 'equation', 'theorem', 'probability',
  ],
  'Social Science': [
    'social', 'psychology', 'survey', 'behavior', 'community', 'culture', 'economics',
  ],
};

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  let bestCategory = 'Other';
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  // Month DD, YYYY
  const named = trimmed.match(
    /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2}),?\s+(\d{4})$/i,
  );
  if (named) {
    const m = MONTH_MAP[named[1].toLowerCase()];
    return `${named[3]}-${m}-${named[2].padStart(2, '0')}`;
  }
  return '';
}

const DATE_RE =
  /\b(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2}|(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+\d{1,2},?\s+\d{4})\b/gi;

function extractAllDates(text: string): string[] {
  const raw = [...text.matchAll(DATE_RE)].map(m => m[0]);
  return [...new Set(raw.map(normalizeDate).filter(Boolean))].sort();
}

// ---------------------------------------------------------------------------
// Section extraction helpers
// ---------------------------------------------------------------------------
function extractLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

function stripBullet(line: string): string {
  return line.replace(/^[\s\-•*◦▪▸►]+/, '').replace(/^\d+[.)]\s*/, '').trim();
}

/**
 * Collect the lines that follow any of the given section header keywords.
 * Stops collecting when another header-like line is encountered.
 */
function extractSectionLines(lines: string[], headerKeywords: string[]): string[] {
  const result: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Detect section header
    if (headerKeywords.some(kw => lower.includes(kw))) {
      collecting = true;
      continue;
    }
    // Stop on a new heading (short line ending with colon, or all-caps short line)
    if (
      collecting &&
      ((/^[A-Z][^:]{0,40}:$/.test(line) && !line.startsWith('-') && !line.startsWith('•')) ||
        (/^[A-Z\s]{4,40}$/.test(line) && line === line.toUpperCase()))
    ) {
      collecting = false;
    }
    if (collecting && line.length > 3) {
      result.push(stripBullet(line));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------
export function parsePresentation(text: string): ParsedPresentation {
  const lines = extractLines(text);

  // ---- Student Name --------------------------------------------------------
  let studentName = '';
  const nameRe =
    /(?:by|name|student|presenter|author|prepared\s+by)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
  const nameMatch = text.match(nameRe);
  if (nameMatch) {
    studentName = nameMatch[1].trim();
  }

  // ---- Title ---------------------------------------------------------------
  let title = '';
  const titleRe = /(?:project\s*title|title)[:\s]+([^\n]{3,100})/i;
  const titleMatch = text.match(titleRe);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }
  // Fallback: first non-trivial line that isn't a student name
  if (!title) {
    const candidate = lines.find(
      l => l.length >= 6 && l.length <= 120 && l !== studentName,
    );
    if (candidate) title = candidate;
  }

  // ---- Description ---------------------------------------------------------
  let description = '';
  const descRe =
    /(?:description|abstract|overview|summary|introduction|background)[:\s]+([^\n]+(?:\n(?![A-Z\s]{4,}:)[^\n]+){0,4})/i;
  const descMatch = text.match(descRe);
  if (descMatch) {
    description = descMatch[1].replace(/\s+/g, ' ').trim();
  }
  if (!description) {
    const para = lines.find(l => l.length > 80 && l.length < 600 && l !== title);
    if (para) description = para;
  }

  // ---- Category ------------------------------------------------------------
  const category = detectCategory(text);

  // ---- Dates ---------------------------------------------------------------
  const allDates = extractAllDates(text);

  let startDate = '';
  let targetDate = '';

  const startRe =
    /(?:start\s*date|begin(?:ning)?|started|from|kickoff)[:\s]+([^\n,;]{3,30})/i;
  const endRe =
    /(?:end\s*date|due\s*date|target\s*date|deadline|completion|finish(?:es)?|deliver(?:y|able)\s*date|by)[:\s]+([^\n,;]{3,30})/i;

  const startMatch = text.match(startRe);
  const endMatch = text.match(endRe);

  if (startMatch) startDate = normalizeDate(startMatch[1].trim());
  if (endMatch) targetDate = normalizeDate(endMatch[1].trim());

  if (!startDate && allDates.length > 0) startDate = allDates[0];
  if (!targetDate && allDates.length > 1) targetDate = allDates[allDates.length - 1];

  // ---- Milestones ----------------------------------------------------------
  const milestoneLines = extractSectionLines(lines, [
    'milestone', 'timeline', 'schedule', 'phase', 'deliverable', 'task', 'checkpoint',
  ]);

  const milestones: Milestone[] = milestoneLines.slice(0, 10).map((line, i) => {
    const dateHit = line.match(DATE_RE);
    const dueDate = dateHit ? normalizeDate(dateHit[0]) : '';
    const cleanTitle = line.replace(DATE_RE, '').replace(/[-–:]+$/, '').trim() || line;
    return {
      id: `m_${Date.now()}_${i}`,
      title: cleanTitle,
      dueDate,
      completed: false,
    };
  });

  // ---- Next Steps ----------------------------------------------------------
  const nextStepLines = extractSectionLines(lines, [
    'next step', 'future work', 'future plan', 'to do', 'todo', 'planned',
    'upcoming', 'next phase', 'recommendation', 'action item',
  ]);

  const nextSteps =
    nextStepLines.length > 0
      ? nextStepLines.slice(0, 6)
      : inferNextSteps(text);

  return {
    studentName,
    title,
    description,
    category,
    startDate: startDate || new Date().toISOString().split('T')[0],
    targetDate,
    milestones,
    nextSteps,
  };
}

/** Generate generic next-step suggestions from keywords when none are explicit. */
function inferNextSteps(text: string): string[] {
  const lower = text.toLowerCase();
  const suggestions: string[] = [];

  if (lower.includes('research') || lower.includes('literature'))
    suggestions.push('Compile and organize research findings into a summary document');
  if (lower.includes('design') || lower.includes('prototype'))
    suggestions.push('Create detailed design sketches or wireframes before building');
  if (lower.includes('test') || lower.includes('experiment'))
    suggestions.push('Define clear success criteria for your experiments');
  if (lower.includes('data') || lower.includes('analysis'))
    suggestions.push('Plan data visualizations to communicate your findings clearly');
  if (lower.includes('present') || lower.includes('demo'))
    suggestions.push('Practice the presentation and prepare for likely Q&A questions');

  if (suggestions.length === 0) {
    suggestions.push('Break the project into smaller milestones with specific deadlines');
    suggestions.push('Schedule regular check-ins with your teacher');
  }
  return suggestions;
}
