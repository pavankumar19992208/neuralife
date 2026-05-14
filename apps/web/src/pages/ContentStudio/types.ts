export type Board = 'SCERT_AP' | 'SCERT_TS' | 'NCERT' | 'CBSE' | 'ICSE'
export type Medium = 'ENGLISH' | 'TELUGU' | 'BOTH'
export type SingleMedium = 'ENGLISH' | 'TELUGU'
export type DeviceType = 'smartpad' | 'mobile' | 'tablet'
export type RenderMode = 'color' | 'eink'
export type SegmentStatus = 'pending' | 'generating' | 'complete' | 'error'
export type LLMProvider = 'claude' | 'gemini'

export interface PrerequisiteTopicDB {
  grade: number
  chapter_title: string
  topic_title: string
  subject: string
}

export interface ContentSession {
  board: Board
  grade: number
  subject: string
  chapterNumber: number
  chapterTitle: string
  topicTitle: string
  topicContext: string
  medium: Medium
  model: LLMProvider
  prerequisiteTopics?: PrerequisiteTopicDB[]
  chapterTopics?: Array<{ number: number; title: string }>
}

export interface Topic {
  number: number
  title: string
}

// ── DB-backed types ───────────────────────────────────────────────

export interface DBTextbook {
  id: string
  board: string
  grade: number
  subject: string
  created_at: string
}

export interface DBTopic {
  id: string
  chapter_id: string
  topic_number: number
  title_en: string
  title_te: string | null
  created_at: string
}

export interface DBChapter {
  id: string
  textbook_id: string
  chapter_number: number
  title_en: string
  title_te: string | null
  created_at: string
  topics: DBTopic[]
}

export interface DBGeneratedContent {
  id: string
  topic_id: string
  medium: SingleMedium
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segments: Record<string, any>
  generated_at: string
  last_modified_at: string
  audit_status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'
}

export interface TextbookStructure {
  textbook: DBTextbook
  chapters: DBChapter[]
  exists: boolean
}

// Format: "English Name / Telugu Name" or just "English Name"
export function formatBilingualTitle(title_en: string, title_te: string | null): string {
  if (title_te) return `${title_en} / ${title_te}`
  return title_en
}

// ── Segment content types ──────────────────────────────────────────

export interface ConceptSummaryContent {
  text: string
}

export interface ConceptExplanationContent {
  text: string
}

export interface KeyTerm {
  term: string
  definition: string
  example?: string
}

export interface KeyTermsContent {
  terms: KeyTerm[]
}

export interface SvgDiagramContent {
  svg_code: string
  caption: string
  interaction_hints: string[]
}

export interface CssDiagramContent {
  html: string
  caption: string
}

export interface DidYouKnowContent {
  fact: string
  source?: string
}

export interface InteractionContent {
  type: 'Tap-to-Sequence' | 'Label-the-Diagram' | 'Slider-Parameter' | 'Stylus-Fill-Equation'
  description: string
  instructions: string
  steps?: string[]
  wrong_feedback?: string
  success_message?: string
}

export interface Problem {
  id: string
  text: string
  hints: [string, string, string]
  solution: string
  solution_steps: string[]
  error_patterns: string[]
}

export interface ProblemsContent {
  foundation: Problem[]
  standard: Problem[]
  advanced: Problem[]
}

export interface PrerequisiteTopic {
  title: string
  class_year: number
  subject: string
}

export interface PrerequisitesContent {
  topics: PrerequisiteTopic[]
}

export interface AudioTextContent {
  text: string
}

export interface YoutubeVideoItem {
  title: string
  channel: string
  search_url: string
  duration_estimate: string
  language: 'ENGLISH' | 'TELUGU'
  why: string
}

export interface YoutubeQueryContent {
  videos: YoutubeVideoItem[]
}

export interface FreestyleContent {
  title: string
  html: string
}

// ── Segment union ─────────────────────────────────────────────────

export type SegmentContentMap = {
  concept_summary: ConceptSummaryContent
  concept_explanation: ConceptExplanationContent
  key_terms: KeyTermsContent
  did_you_know: DidYouKnowContent
  interaction: InteractionContent
  prerequisites: PrerequisitesContent
  audio_text: AudioTextContent
  youtube_query: YoutubeQueryContent
  svg_diagram: SvgDiagramContent
  css_diagram: CssDiagramContent
  problems: ProblemsContent
  free_style: FreestyleContent
}

export type SegmentId = keyof SegmentContentMap

export interface Segment {
  id: SegmentId
  label: string
  status: SegmentStatus
  content: SegmentContentMap[SegmentId] | null | undefined
  error?: string
  modified?: boolean
}

export type SegmentMap = Record<SegmentId, Segment>

// ── Chat ──────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  updatedSegments?: Partial<SegmentContentMap>
}

// ── SSE events ────────────────────────────────────────────────────

export interface SSEStartEvent {
  type: 'start'
  totalSegments: number
  batches: number
}

export interface SSEBatchStartEvent {
  type: 'batch_start'
  batch: number
  segmentIds: SegmentId[]
}

export interface SSESegmentCompleteEvent {
  type: 'segment_complete'
  id: SegmentId
  content: SegmentContentMap[SegmentId]
}

export interface SSESegmentErrorEvent {
  type: 'segment_error'
  id: SegmentId
  message: string
}

export interface SSEDoneEvent {
  type: 'done'
}

export type SSEEvent =
  | SSEStartEvent
  | SSEBatchStartEvent
  | SSESegmentCompleteEvent
  | SSESegmentErrorEvent
  | SSEDoneEvent

// ── Defaults ─────────────────────────────────────────────────────

export const SEGMENT_LABELS: Record<SegmentId, string> = {
  concept_summary: 'Concept Summary',
  concept_explanation: 'Explanation',
  key_terms: 'Key Terms',
  did_you_know: 'Did You Know?',
  interaction: 'Activity',
  prerequisites: 'Prerequisites',
  audio_text: 'Audio Text',
  youtube_query: 'Videos',
  svg_diagram: 'E-Ink Diagram',
  css_diagram: 'Color Diagram',
  problems: 'Problem Set',
  free_style: 'Free Style',
}

// Order matches the E-Library student journey (one segment per screen)
export const SEGMENT_ORDER: SegmentId[] = [
  'concept_summary',     // 1 — hook/headline
  'concept_explanation', // 2 — full narrative
  'key_terms',           // 3 — vocabulary
  'did_you_know',        // 4 — curiosity spike
  'interaction',         // 5 — play-to-learn
  'prerequisites',       // 6 — foundation check (hidden if empty)
  'audio_text',          // 7 — listen-along
  'svg_diagram',         // 8 — E-Ink diagram
  'css_diagram',         // 9 — colour diagram (LCD only)
  'free_style',          // 10 — visual memory anchor
  'youtube_query',       // 11 — video references
  'problems',            // 12 — assessment gate
]

export const MEDIUM_OPTIONS: { value: Medium; label: string }[] = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'TELUGU', label: 'Telugu' },
  { value: 'BOTH', label: 'Both (EN + TE)' },
]

export const LLM_PROVIDER_OPTIONS: { value: LLMProvider; label: string; description: string }[] = [
  { value: 'claude', label: 'Claude', description: 'Sonnet via AWS Bedrock' },
  { value: 'gemini', label: 'Gemini', description: '2.5 Pro via Google AI' },
]

export const BOARDS: { value: Board; label: string }[] = [
  { value: 'SCERT_AP', label: 'SCERT AP (Andhra Pradesh)' },
  { value: 'SCERT_TS', label: 'SCERT TS (Telangana)' },
  { value: 'NCERT', label: 'NCERT / CBSE' },
  { value: 'CBSE', label: 'CBSE Private' },
  { value: 'ICSE', label: 'ICSE' },
]

export const SUBJECTS: Record<number, string[]> = {
  9: ['Mathematics', 'Physical Science', 'Biological Science', 'Social Studies', 'English', 'Telugu', 'Hindi'],
  10: ['Mathematics', 'Physical Science', 'Biological Science', 'Social Studies', 'English', 'Telugu', 'Hindi'],
  8: ['Mathematics', 'Physical Science', 'Biological Science', 'Social Studies', 'English', 'Telugu', 'Hindi'],
  7: ['Mathematics', 'Physical Science', 'Biological Science', 'Social Studies', 'English', 'Telugu', 'Hindi'],
  6: ['Mathematics', 'Science', 'Social Studies', 'English', 'Telugu', 'Hindi'],
}

export const DEVICE_DIMENSIONS: Record<DeviceType, { width: number; height: number; scale: number; label: string }> = {
  smartpad: { width: 1404, height: 1872, scale: 0.34, label: 'SmartPad 10.3"' },
  mobile: { width: 390, height: 844, scale: 0.82, label: 'Mobile' },
  tablet: { width: 810, height: 1080, scale: 0.6, label: 'Tablet' },
}
