export const EXAM_TYPE_DEFAULTS = {
  SCERT_AP: {
    FA1: { max: 20, pass: 8 }, FA2: { max: 20, pass: 8 },
    FA3: { max: 20, pass: 8 }, FA4: { max: 20, pass: 8 },
    SA1: { max: 80, pass: 32 }, SA2: { max: 80, pass: 32 },
    UNIT_TEST: { max: 20, pass: 7 }, PTM: { max: 0, pass: 0 },
  },
  SCERT_TS: {
    FA1: { max: 20, pass: 8 }, FA2: { max: 20, pass: 8 },
    FA3: { max: 20, pass: 8 }, FA4: { max: 20, pass: 8 },
    SA1: { max: 80, pass: 32 }, SA2: { max: 80, pass: 32 },
    UNIT_TEST: { max: 20, pass: 7 }, PTM: { max: 0, pass: 0 },
  },
  CBSE: {
    FA1: { max: 40, pass: 13 }, FA2: { max: 40, pass: 13 },
    FA3: { max: 40, pass: 13 }, FA4: { max: 40, pass: 13 },
    SA1: { max: 80, pass: 26 }, SA2: { max: 80, pass: 26 },
    UNIT_TEST: { max: 25, pass: 8 }, PTM: { max: 0, pass: 0 },
  },
} as const

export const EXAM_TYPE_LABELS: Record<string, string> = {
  FA1: 'Formative Assessment 1',
  FA2: 'Formative Assessment 2',
  FA3: 'Formative Assessment 3',
  FA4: 'Formative Assessment 4',
  SA1: 'Summative Assessment 1',
  SA2: 'Summative Assessment 2 (Final)',
  UNIT_TEST: 'Unit Test',
  PTM: 'Parent-Teacher Meeting',
}

export const EXAM_TYPE_SHORT: Record<string, string> = {
  FA1: 'FA1', FA2: 'FA2', FA3: 'FA3', FA4: 'FA4',
  SA1: 'SA1', SA2: 'SA2', UNIT_TEST: 'Unit Test', PTM: 'PTM',
}

export const GRADE_COLORS: Record<string, string> = {
  'A+': '#10b981', A: '#0d9488', B: '#1e40af',
  C: '#6366f1', D: '#f59e0b', F: '#ef4444', AB: '#94a3b8',
}

export const EXAM_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:         { bg: 'bg-slate-100',   text: 'text-slate-600',  label: 'Draft' },
  SCHEDULED:     { bg: 'bg-blue-100',    text: 'text-blue-700',   label: 'Scheduled' },
  IN_PROGRESS:   { bg: 'bg-amber-100',   text: 'text-amber-700',  label: 'In Progress' },
  MARKS_PENDING: { bg: 'bg-orange-100',  text: 'text-orange-700', label: 'Marks Pending' },
  PUBLISHED:     { bg: 'bg-green-100',   text: 'text-green-700',  label: 'Published' },
  ARCHIVED:      { bg: 'bg-slate-100',   text: 'text-slate-500',  label: 'Archived' },
}

export const EXAM_TYPE_BADGE_COLORS: Record<string, string> = {
  FA1: 'bg-amber-100 text-amber-700',
  FA2: 'bg-amber-100 text-amber-700',
  FA3: 'bg-amber-100 text-amber-700',
  FA4: 'bg-amber-100 text-amber-700',
  SA1: 'bg-blue-100 text-blue-700',
  SA2: 'bg-blue-100 text-blue-700',
  UNIT_TEST: 'bg-slate-100 text-slate-600',
  PTM: 'bg-purple-100 text-purple-700',
}

export function buildExamName(examType: string, classYear?: number): string {
  const typeLabel = EXAM_TYPE_SHORT[examType] ?? examType
  const year = new Date().getFullYear()
  const parts: string[] = [typeLabel]
  if (classYear) parts.push(`Class ${classYear}`)
  parts.push(`${year}-${String(year + 1).slice(2)}`)
  return parts.join(' — ')
}

export function getDefaultMarks(board: string, examType: string): { max: number; pass: number } {
  const boardDefaults = EXAM_TYPE_DEFAULTS[board as keyof typeof EXAM_TYPE_DEFAULTS]
  if (!boardDefaults) return { max: 100, pass: 35 }
  return boardDefaults[examType as keyof typeof boardDefaults] ?? { max: 100, pass: 35 }
}

export function resolveGradeFromPct(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 75) return 'A'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 35) return 'D'
  return 'F'
}

export function nextExamType(current: string): string {
  const seq: Record<string, string> = {
    FA1: 'FA2', FA2: 'FA3', FA3: 'FA4', FA4: 'SA1', SA1: 'SA2',
  }
  return seq[current] ?? 'FA1'
}

export const SUBJECTS_LIST = [
  'Mathematics', 'Physical Science', 'Biological Science', 'English',
  'Telugu', 'Hindi', 'Social Studies', 'Environmental Science',
  'Sanskrit', 'Urdu', 'Computer Science', 'Drawing', 'Physical Education',
]

export const BOARDS_LIST = [
  { value: 'SCERT_AP', label: 'SCERT AP' },
  { value: 'SCERT_TS', label: 'SCERT Telangana' },
  { value: 'CBSE', label: 'CBSE' },
]
