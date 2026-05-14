import { useState, useCallback, useRef } from 'react'
import type {
  ContentSession,
  SegmentMap,
  SegmentId,
  SSEEvent,
  ChatMessage,
  Segment,
  TextbookStructure,
  SingleMedium,
  DBChapter,
  SegmentContentMap,
} from '../types'
import { SEGMENT_LABELS, SEGMENT_ORDER } from '../types'
import type { AuditStatus } from '../components/SegmentAuditWrapper'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// ── Initial state ─────────────────────────────────────────────────

function buildInitialSegments(): SegmentMap {
  return Object.fromEntries(
    SEGMENT_ORDER.map((id): [SegmentId, Segment] => [
      id,
      { id, label: SEGMENT_LABELS[id], status: 'pending', content: null },
    ]),
  ) as SegmentMap
}

type DualSegments = { ENGLISH: SegmentMap; TELUGU: SegmentMap }

function buildDualSegments(): DualSegments {
  return { ENGLISH: buildInitialSegments(), TELUGU: buildInitialSegments() }
}

// ── Parse SSE stream ──────────────────────────────────────────────

async function* readSseStream(response: Response): AsyncGenerator<SSEEvent> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      const lines = block.split('\n')
      const eventLine = lines.find((l) => l.startsWith('event: '))
      const dataLine = lines.find((l) => l.startsWith('data: '))
      if (!eventLine || !dataLine) continue

      const eventType = eventLine.replace('event: ', '').trim()
      const dataStr = dataLine.replace('data: ', '').trim()

      try {
        const data = JSON.parse(dataStr)
        yield { type: eventType, ...data } as SSEEvent
      } catch {
        // skip malformed event
      }
    }
  }
}

// ── Parsed index chapters type ────────────────────────────────────

export interface ParsedChapter {
  chapter_number: number
  title_en: string
  title_te?: string
  topics: Array<{ topic_number: number; title_en: string; title_te?: string; synthetic?: boolean }>
}

// ── All Topics progress type ──────────────────────────────────────

export interface TopicProgress {
  topicId: string
  topicNumber: number
  title: string
  status: 'pending' | 'generating' | 'done' | 'error'
}

// ── Hook ──────────────────────────────────────────────────────────

export function useContentStudio() {
  const [allSegments, setAllSegments] = useState<DualSegments>(buildDualSegments)
  const [activeMedium, setActiveMedium] = useState<SingleMedium>('ENGLISH')
  const [isGeneratingEN, setIsGeneratingEN] = useState(false)
  const [isGeneratingTE, setIsGeneratingTE] = useState(false)
  const [progressEN, setProgressEN] = useState(0)
  const [progressTE, setProgressTE] = useState(0)

  const [session, setSession] = useState<Partial<ContentSession>>({})
  const [textbookStructure, setTextbookStructure] = useState<TextbookStructure | null>(null)
  const [isLoadingStructure, setIsLoadingStructure] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [missingMedium, setMissingMedium] = useState<SingleMedium | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isChatting, setIsChatting] = useState(false)

  // All Topics mode
  const [isAllTopicsMode, setIsAllTopicsMode] = useState(false)
  const [allTopicsProgress, setAllTopicsProgress] = useState<TopicProgress[]>([])
  const [allTopicsSegmentsMap, setAllTopicsSegmentsMap] = useState<
    Record<string, Partial<Record<SingleMedium, SegmentMap>>>
  >({})

  const generatedContentIdsRef = useRef<{ ENGLISH?: string; TELUGU?: string }>({})
  const abortCtrlRef = useRef<{ ENGLISH: AbortController | null; TELUGU: AbortController | null }>({
    ENGLISH: null,
    TELUGU: null,
  })
  const stopAllTopicsRef = useRef(false)

  // ── Audit state ───────────────────────────────────────────────
  const [auditStates, setAuditStates] = useState<Partial<Record<SegmentId, AuditStatus>>>({})
  const [refiningSegments, setRefiningSegments] = useState<Partial<Record<SegmentId, boolean>>>({})
  const [prerequisiteTopics, setPrerequisiteTopics] = useState<Array<{ grade: number; chapter_title: string; topic_title: string; subject: string }>>([])
  const [isFetchingPrereqs, setIsFetchingPrereqs] = useState(false)

  // ── Session ───────────────────────────────────────────────────

  const updateSession = useCallback((updates: Partial<ContentSession>) => {
    setSession((prev) => ({ ...prev, ...updates }))
    if (updates.medium === 'ENGLISH') setActiveMedium('ENGLISH')
    if (updates.medium === 'TELUGU') setActiveMedium('TELUGU')
  }, [])

  // ── Textbook structure ─────────────────────────────────────────

  const loadTextbookStructure = useCallback(async (board: string, grade: number, subject: string) => {
    setTextbookStructure(null)
    setLoadError(null)
    setIsLoadingStructure(true)
    setSelectedTopicId(null)
    setMissingMedium(null)
    setAllSegments(buildDualSegments())
    generatedContentIdsRef.current = {}
    setIsAllTopicsMode(false)
    setAllTopicsProgress([])
    setAllTopicsSegmentsMap({})

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/content-studio/textbooks?board=${encodeURIComponent(board)}&grade=${grade}&subject=${encodeURIComponent(subject)}`,
      )
      if (res.status === 404 || !res.ok) {
        if (!res.ok && res.status !== 404) {
          setLoadError('Database tables not ready — push the Supabase migration first.')
        }
        setTextbookStructure({ textbook: null as never, chapters: [], exists: false })
        return
      }
      const json = await res.json()
      setTextbookStructure({ textbook: json.data.textbook, chapters: json.data.chapters, exists: true })
    } catch {
      setLoadError('Could not connect to the API.')
      setTextbookStructure({ textbook: null as never, chapters: [], exists: false })
    } finally {
      setIsLoadingStructure(false)
    }
  }, [])

  const parseIndexText = useCallback(async (text: string, images?: string[]): Promise<{ chapters: ParsedChapter[]; garbledFontDetected?: boolean }> => {
    const res = await fetch(`${API_BASE}/api/v1/content-studio/parse-index-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model: session.model ?? 'claude', images }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message ?? 'Failed to parse index')
    }
    const json = await res.json()
    return { ...json.data, garbledFontDetected: json.garbledFontDetected ?? false }
  }, [session.model])

  const saveTextbookStructure = useCallback(async (
    board: string,
    grade: number,
    subject: string,
    chapters: ParsedChapter[],
  ) => {
    const res = await fetch(`${API_BASE}/api/v1/content-studio/textbooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board, grade, subject, chapters }),
    })
    if (!res.ok) throw new Error('Failed to save textbook structure')
    const json = await res.json()
    setTextbookStructure({ textbook: json.data.textbook, chapters: json.data.chapters, exists: true })
  }, [])

  const appendChapters = useCallback(async (textbookId: string, chapters: ParsedChapter[]) => {
    const res = await fetch(`${API_BASE}/api/v1/content-studio/textbooks/${textbookId}/append-chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapters }),
    })
    if (!res.ok) throw new Error('Failed to append chapters')
    const json = await res.json()
    setTextbookStructure((prev) =>
      prev ? { ...prev, chapters: json.data.chapters, exists: true } : prev,
    )
  }, [])

  // ── Topic selection ────────────────────────────────────────────

  const selectTopic = useCallback(async (
    topicId: string,
    titleEn: string,
    _titleTe: string | null,
    chapterTitleEn: string,
    chapterNumber: number,
    chapterTopics?: Array<{ number: number; title: string }>,
  ) => {
    setSelectedTopicId(topicId)
    setIsAllTopicsMode(false)
    setAllTopicsProgress([])
    setAllTopicsSegmentsMap({})
    setMissingMedium(null)
    setSession((prev) => ({ ...prev, topicTitle: titleEn, chapterTitle: chapterTitleEn, chapterNumber, chapterTopics }))
    setAllSegments(buildDualSegments())
    generatedContentIdsRef.current = {}

    try {
      const res = await fetch(`${API_BASE}/api/v1/content-studio/topics/${topicId}/content`)
      if (!res.ok) return

      const json = await res.json()
      const existing = json.data as Record<string, { id: string; segments: Record<string, unknown> }>

      setAllSegments(() => {
        const next = buildDualSegments()
        for (const med of ['ENGLISH', 'TELUGU'] as const) {
          if (existing[med]) {
            const { segments } = existing[med]
            const segMap = buildInitialSegments()
            for (const segId of SEGMENT_ORDER) {
              if (segments[segId] !== undefined) {
                segMap[segId] = { ...segMap[segId], status: 'complete', content: segments[segId] as SegmentContentMap[SegmentId] }
              }
            }
            next[med] = segMap
          }
        }
        return next
      })

      generatedContentIdsRef.current = {
        ENGLISH: existing.ENGLISH?.id,
        TELUGU: existing.TELUGU?.id,
      }

      const hasEN = !!existing.ENGLISH
      const hasTE = !!existing.TELUGU

      if (hasEN && !hasTE) setActiveMedium('ENGLISH')
      else if (hasTE && !hasEN) setActiveMedium('TELUGU')

      setSession((prev) => {
        if (prev.medium === 'BOTH') {
          if (hasEN && !hasTE) setMissingMedium('TELUGU')
          else if (hasTE && !hasEN) setMissingMedium('ENGLISH')
        }
        return prev
      })
    } catch {
      // no existing content
    }
  }, [])

  const selectAllTopics = useCallback((
    chapterId: string,
    chapterTitleEn: string,
    chapterNumber: number,
  ) => {
    setSelectedTopicId(null)
    setIsAllTopicsMode(true)
    setAllTopicsProgress([])
    setAllTopicsSegmentsMap({})
    setMissingMedium(null)
    setAllSegments(buildDualSegments())
    generatedContentIdsRef.current = {}
    setSession((prev) => ({ ...prev, chapterTitle: chapterTitleEn, chapterNumber, topicTitle: '' }))
    // chapterId stored in session for reference if needed
    setSession((prev) => ({ ...prev, chapterTitle: chapterTitleEn, chapterNumber, topicTitle: '' }))
    void chapterId // acknowledged but stored via session context
  }, [])

  // ── Silent English generator — collects segments without touching UI state ──
  // Used when medium=TELUGU: Claude generates English privately, then Gemini translates.

  const generateEnglishForTranslation = useCallback(async (
    fullSession: ContentSession,
  ): Promise<Record<string, unknown>> => {
    const res = await fetch(`${API_BASE}/api/v1/content-studio/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fullSession, medium: 'ENGLISH', model: 'claude' }),
      signal: abortCtrlRef.current.TELUGU?.signal ?? undefined,
    })
    if (!res.ok) throw new Error(`English generation HTTP ${res.status}`)

    const collected: Record<string, unknown> = {}
    for await (const event of readSseStream(res)) {
      if (event.type === 'segment_complete') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { id, content } = event as any
        collected[id] = content
      }
    }
    return collected
  }, [])

  // ── Core generation runner (returns finalSegments) ────────────

  const runMedium = useCallback(async (
    medium: SingleMedium,
    fullSession: ContentSession,
    topicId: string | null | undefined,
    // When provided for TELUGU medium: sends to Gemini translation path instead of Claude
    referenceSegments?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    const setIsGen = medium === 'ENGLISH' ? setIsGeneratingEN : setIsGeneratingTE
    const setProgress = medium === 'ENGLISH' ? setProgressEN : setProgressTE

    const ctrl = new AbortController()
    abortCtrlRef.current[medium] = ctrl

    setIsGen(true)
    setProgress(0)
    setAllSegments((prev) => ({
      ...prev,
      [medium]: Object.fromEntries(
        SEGMENT_ORDER.map((id) => [id, { ...prev[medium][id], status: 'generating' as const }]),
      ) as SegmentMap,
    }))

    // Telugu translation path: send English segments to Gemini instead of generating fresh
    const isTeluguTranslation = medium === 'TELUGU' && !!referenceSegments
    const topicContext = fullSession.topicContext || ''

    const finalSegments: Record<string, unknown> = {}

    try {
      const res = await fetch(`${API_BASE}/api/v1/content-studio/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fullSession,
          medium,
          topicContext,
          // English always uses Claude; Telugu translation always uses Gemini
          model: isTeluguTranslation ? 'gemini' : 'claude',
          // Send English segments so the API uses the Gemini translation fast-path
          ...(isTeluguTranslation ? { englishSegments: referenceSegments } : {}),
        }),
        signal: ctrl.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      let completed = 0
      for await (const event of readSseStream(res)) {
        if (event.type === 'segment_complete') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { id, content } = event as any
          finalSegments[id] = content
          setAllSegments((prev) => ({
            ...prev,
            [medium]: {
              ...prev[medium],
              [id]: { ...prev[medium][id as SegmentId], status: 'complete', content },
            },
          }))
          completed++
          setProgress(Math.round((completed / 12) * 100))
        } else if (event.type === 'segment_error') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { id, message } = event as any
          setAllSegments((prev) => ({
            ...prev,
            [medium]: {
              ...prev[medium],
              [id]: { ...prev[medium][id as SegmentId], status: 'error', error: message },
            },
          }))
          completed++
          setProgress(Math.round((completed / 12) * 100))
        }
      }

      // Save to DB
      if (topicId && Object.keys(finalSegments).length > 0) {
        const existingId = generatedContentIdsRef.current[medium]
        if (existingId) {
          await fetch(`${API_BASE}/api/v1/content-studio/generated-content/${existingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segments: finalSegments }),
          })
        } else {
          const saved = await fetch(`${API_BASE}/api/v1/content-studio/topics/${topicId}/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medium, segments: finalSegments }),
          })
          if (saved.ok) {
            const json = await saved.json()
            generatedContentIdsRef.current = {
              ...generatedContentIdsRef.current,
              [medium]: json.data?.id,
            }
          }
        }
      }

      setMissingMedium((prev) => (prev === medium ? null : prev))
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setAllSegments((prev) => {
          const medSegs = { ...prev[medium] }
          for (const id of SEGMENT_ORDER) {
            if (medSegs[id].status === 'generating') {
              medSegs[id] = { ...medSegs[id], status: 'error', error: 'Generation interrupted' }
            }
          }
          return { ...prev, [medium]: medSegs }
        })
      }
    } finally {
      setIsGen(false)
      abortCtrlRef.current[medium] = null
    }

    return finalSegments
  }, [])

  // ── Public generate (single topic) ────────────────────────────

  const generate = useCallback(async (fullSession: ContentSession, topicId?: string | null) => {
    setSession(fullSession)
    setIsAllTopicsMode(false)
    setAllTopicsProgress([])
    setAllTopicsSegmentsMap({})
    setProgressEN(0)
    setProgressTE(0)
    setAuditStates({})
    setRefiningSegments({})

    const mediumsToRun: SingleMedium[] = fullSession.medium === 'BOTH'
      ? ['ENGLISH', 'TELUGU']
      : [fullSession.medium as SingleMedium]

    setAllSegments((prev) => {
      const next = { ...prev }
      for (const m of mediumsToRun) {
        next[m] = buildInitialSegments()
      }
      return next
    })

    if (fullSession.medium === 'BOTH') {
      // Claude generates English → Gemini translates to Telugu
      const enSegments = await runMedium('ENGLISH', fullSession, topicId)
      await runMedium('TELUGU', fullSession, topicId, enSegments)
    } else if (fullSession.medium === 'TELUGU') {
      // Claude generates English silently → Gemini translates to Telugu
      // Show loading state immediately during the silent English phase
      setIsGeneratingTE(true)
      let enSegments: Record<string, unknown> = {}
      try {
        enSegments = await generateEnglishForTranslation(fullSession)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setAllSegments((prev) => ({
            ...prev,
            TELUGU: Object.fromEntries(
              SEGMENT_ORDER.map((id) => [id, { ...prev.TELUGU[id], status: 'error' as const, error: 'Base content generation failed' }]),
            ) as SegmentMap,
          }))
        }
        setIsGeneratingTE(false)
        return
      }
      await runMedium('TELUGU', fullSession, topicId, enSegments)
    } else {
      // English only — Claude
      await runMedium('ENGLISH', fullSession, topicId)
    }
  }, [runMedium, generateEnglishForTranslation])

  // ── Generate missing medium ────────────────────────────────────

  const generateMissingMedium = useCallback(async (topicId: string | null) => {
    if (!missingMedium || !session.board) return

    const sourceMedium: SingleMedium = missingMedium === 'TELUGU' ? 'ENGLISH' : 'TELUGU'
    const sourceSegments: Record<string, unknown> = {}
    const sourceMap = allSegments[sourceMedium]
    for (const id of SEGMENT_ORDER) {
      if (sourceMap[id].content !== null) sourceSegments[id] = sourceMap[id].content
    }

    const fullSession: ContentSession = {
      board: session.board,
      grade: session.grade!,
      subject: session.subject!,
      chapterNumber: session.chapterNumber ?? 1,
      chapterTitle: session.chapterTitle!,
      topicTitle: session.topicTitle!,
      topicContext: session.topicContext ?? '',
      medium: missingMedium,
      model: session.model ?? 'claude',
    }

    setAllSegments((prev) => ({ ...prev, [missingMedium]: buildInitialSegments() }))

    await runMedium(missingMedium, fullSession, topicId, sourceSegments)
  }, [missingMedium, session, allSegments, runMedium])

  // ── Generate ALL topics in a chapter ──────────────────────────

  const generateAllTopics = useCallback(async (
    chapter: DBChapter,
    baseSession: ContentSession,
  ) => {
    stopAllTopicsRef.current = false

    const mediumsToRun: SingleMedium[] = baseSession.medium === 'BOTH'
      ? ['ENGLISH', 'TELUGU']
      : [baseSession.medium as SingleMedium]

    setIsAllTopicsMode(true)
    setAllTopicsSegmentsMap({})
    setAllTopicsProgress(
      chapter.topics.map((t) => ({
        topicId: t.id,
        topicNumber: t.topic_number,
        title: t.title_en,
        status: 'pending' as const,
      })),
    )

    for (const topic of chapter.topics) {
      if (stopAllTopicsRef.current) break

      const topicSession: ContentSession = {
        ...baseSession,
        chapterTitle: chapter.title_en,
        chapterNumber: chapter.chapter_number,
        topicTitle: topic.title_en,
        chapterTopics: chapter.topics.map((t) => ({ number: t.topic_number, title: t.title_en })),
      }

      setAllTopicsProgress((prev) =>
        prev.map((p) => (p.topicId === topic.id ? { ...p, status: 'generating' } : p)),
      )

      // Reset generatedContentIdsRef for this new topic
      generatedContentIdsRef.current = {}

      try {
        // Track English segments for Gemini translation when needed
        let cachedEnSegments: Record<string, unknown> | undefined

        for (const med of mediumsToRun) {
          if (stopAllTopicsRef.current) break

          let finalSegments: Record<string, unknown>

          if (med === 'ENGLISH') {
            // Always Claude for English
            finalSegments = await runMedium('ENGLISH', topicSession, topic.id)
            cachedEnSegments = finalSegments
          } else if (med === 'TELUGU') {
            if (!cachedEnSegments) {
              // TELUGU-only mode: generate English silently first
              cachedEnSegments = await generateEnglishForTranslation(topicSession)
            }
            // Gemini translates English → Telugu
            finalSegments = await runMedium('TELUGU', topicSession, topic.id, cachedEnSegments)
          } else {
            finalSegments = await runMedium(med, topicSession, topic.id)
          }

          // Build a SegmentMap from the returned segments
          const segMap = buildInitialSegments()
          for (const segId of SEGMENT_ORDER) {
            if (finalSegments[segId] !== undefined) {
              segMap[segId as SegmentId] = {
                ...segMap[segId as SegmentId],
                status: 'complete',
                content: finalSegments[segId] as SegmentContentMap[SegmentId],
              }
            }
          }

          setAllTopicsSegmentsMap((prev) => ({
            ...prev,
            [topic.id]: { ...prev[topic.id], [med]: segMap },
          }))
        }

        if (!stopAllTopicsRef.current) {
          setAllTopicsProgress((prev) =>
            prev.map((p) => (p.topicId === topic.id ? { ...p, status: 'done' } : p)),
          )
        }
      } catch {
        setAllTopicsProgress((prev) =>
          prev.map((p) => (p.topicId === topic.id ? { ...p, status: 'error' } : p)),
        )
      }
    }
  }, [runMedium, generateEnglishForTranslation])

  // ── Stop ──────────────────────────────────────────────────────

  const stopGeneration = useCallback(() => {
    stopAllTopicsRef.current = true
    abortCtrlRef.current.ENGLISH?.abort()
    abortCtrlRef.current.TELUGU?.abort()
    setIsGeneratingEN(false)
    setIsGeneratingTE(false)
    // Mark any currently-generating topic as error
    setAllTopicsProgress((prev) =>
      prev.map((p) => (p.status === 'generating' ? { ...p, status: 'error' } : p)),
    )
  }, [])

  // ── Chat ──────────────────────────────────────────────────────

  const chat = useCallback(async (message: string, targetSegment?: SegmentId) => {
    if (!session.topicTitle) return
    setIsChatting(true)

    const userMsg: ChatMessage = { role: 'user', content: message }
    setChatHistory((prev) => [...prev, userMsg])

    try {
      const activeSegs = allSegments[activeMedium]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentSegments: Record<string, any> = {}
      for (const id of SEGMENT_ORDER) {
        if (activeSegs[id].content) currentSegments[id] = activeSegs[id].content
      }

      const res = await fetch(`${API_BASE}/api/v1/content-studio/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          targetSegment,
          currentSegments,
          model: session.model ?? 'claude',
          topicContext: {
            board: session.board,
            grade: session.grade,
            subject: session.subject,
            chapterTitle: session.chapterTitle,
            topicTitle: session.topicTitle,
          },
        }),
      })

      const json = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reply: { reply: string; updatedSegments?: Record<string, any> } = json.data

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply.reply,
        updatedSegments: reply.updatedSegments,
      }
      setChatHistory((prev) => [...prev, assistantMsg])

      if (reply.updatedSegments) {
        setAllSegments((prev) => {
          const medSegs = { ...prev[activeMedium] }
          for (const [id, content] of Object.entries(reply.updatedSegments!)) {
            const segId = id as SegmentId
            if (medSegs[segId]) {
              medSegs[segId] = { ...medSegs[segId], content, modified: true, status: 'complete' }
            }
          }
          return { ...prev, [activeMedium]: medSegs }
        })
      }
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setIsChatting(false)
    }
  }, [session, allSegments, activeMedium])

  const clearChat = useCallback(() => setChatHistory([]), [])

  // ── Prerequisites from DB ──────────────────────────────────────

  const fetchPrerequisites = useCallback(async (board: string, grade: number, subject: string) => {
    setIsFetchingPrereqs(true)
    setPrerequisiteTopics([])
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/content-studio/prerequisites?board=${encodeURIComponent(board)}&grade=${grade}&subject=${encodeURIComponent(subject)}`,
      )
      if (!res.ok) return
      const json = await res.json()
      setPrerequisiteTopics(json.data ?? [])
    } catch {
      // silent — no prereqs available
    } finally {
      setIsFetchingPrereqs(false)
    }
  }, [])

  // ── Audit ─────────────────────────────────────────────────────

  const markSegmentApproved = useCallback((id: SegmentId) => {
    setAuditStates((prev) => {
      const newStatus = prev[id] === 'approved' ? 'pending' : 'approved'
      const next = { ...prev, [id]: newStatus }
      // css_diagram shares the audit wrapper with svg_diagram — mirror its approval state
      if (id === 'svg_diagram') next['css_diagram'] = newStatus
      return next
    })
  }, [])

  // Translate an updated English segment to Telugu via Gemini and update the TELUGU slice
  const syncTeluguSegment = useCallback(async (id: SegmentId, englishContent: unknown) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/content-studio/refine-segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: id,
          currentContent: englishContent,
          mode: 'translate',
          session: {
            board: session.board,
            grade: session.grade,
            subject: session.subject,
            chapterTitle: session.chapterTitle,
            topicTitle: session.topicTitle,
            medium: 'TELUGU',
            topicContext: session.topicContext,
          },
          model: 'gemini',
        }),
      })
      if (!res.ok) return
      const json = await res.json()
      const teluguContent = json.data?.content
      if (teluguContent !== undefined) {
        setAllSegments((prev) => ({
          ...prev,
          TELUGU: {
            ...prev.TELUGU,
            [id]: { ...prev.TELUGU[id], content: teluguContent as SegmentContentMap[SegmentId], status: 'complete', modified: true },
          },
        }))
        setAuditStates((prev) => ({ ...prev, [id]: 'pending' }))
      }
    } catch {
      // silent — Telugu sync failure should not block English update
    }
  }, [session])

  const commentOnSegment = useCallback(async (id: SegmentId, comment: string) => {
    if (!session.topicTitle) return
    const currentContent = allSegments[activeMedium][id]?.content
    setRefiningSegments((prev) => ({ ...prev, [id]: true }))

    try {
      const res = await fetch(`${API_BASE}/api/v1/content-studio/refine-segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: id,
          currentContent,
          comment,
          mode: 'refine',
          session: {
            board: session.board,
            grade: session.grade,
            subject: session.subject,
            chapterTitle: session.chapterTitle,
            topicTitle: session.topicTitle,
            medium: activeMedium,
            topicContext: session.topicContext,
          },
          model: session.model ?? 'claude',
        }),
      })

      if (!res.ok) return
      const json = await res.json()
      const updatedContent = json.data?.content
      if (updatedContent !== undefined) {
        setAllSegments((prev) => ({
          ...prev,
          [activeMedium]: {
            ...prev[activeMedium],
            [id]: { ...prev[activeMedium][id], content: updatedContent as SegmentContentMap[SegmentId], status: 'complete', modified: true },
          },
        }))
        setAuditStates((prev) => ({ ...prev, [id]: 'pending' }))

        // If we just updated the English segment and Telugu segments exist, sync Telugu
        if (activeMedium === 'ENGLISH' && allSegments.TELUGU[id]?.content !== undefined) {
          void syncTeluguSegment(id, updatedContent)
        }
      }
    } catch {
      // silent
    } finally {
      setRefiningSegments((prev) => ({ ...prev, [id]: false }))
    }
  }, [session, allSegments, activeMedium, syncTeluguSegment])

  const regenerateSegment = useCallback(async (id: SegmentId) => {
    if (!session.topicTitle) return
    const currentContent = allSegments[activeMedium][id]?.content
    setRefiningSegments((prev) => ({ ...prev, [id]: true }))

    try {
      const res = await fetch(`${API_BASE}/api/v1/content-studio/refine-segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: id,
          currentContent,
          mode: 'regenerate',
          session: {
            board: session.board,
            grade: session.grade,
            subject: session.subject,
            chapterTitle: session.chapterTitle,
            topicTitle: session.topicTitle,
            medium: activeMedium,
            topicContext: session.topicContext,
          },
          model: session.model ?? 'claude',
        }),
      })

      if (!res.ok) return
      const json = await res.json()
      const updatedContent = json.data?.content
      if (updatedContent !== undefined) {
        setAllSegments((prev) => ({
          ...prev,
          [activeMedium]: {
            ...prev[activeMedium],
            [id]: { ...prev[activeMedium][id], content: updatedContent as SegmentContentMap[SegmentId], status: 'complete', modified: true },
          },
        }))
        setAuditStates((prev) => ({ ...prev, [id]: 'pending' }))

        // If we just regenerated the English segment and Telugu segments exist, sync Telugu
        if (activeMedium === 'ENGLISH' && allSegments.TELUGU[id]?.content !== undefined) {
          void syncTeluguSegment(id, updatedContent)
        }
      }
    } catch {
      // silent
    } finally {
      setRefiningSegments((prev) => ({ ...prev, [id]: false }))
    }
  }, [session, allSegments, activeMedium, syncTeluguSegment])

  const editSegmentCode = useCallback((id: SegmentId, newContent: unknown) => {
    setAllSegments((prev) => ({
      ...prev,
      [activeMedium]: {
        ...prev[activeMedium],
        [id]: { ...prev[activeMedium][id], content: newContent as SegmentContentMap[SegmentId], status: 'complete', modified: true },
      },
    }))
    setAuditStates((prev) => ({ ...prev, [id]: 'pending' }))
  }, [activeMedium])

  const submitToDatabase = useCallback(async () => {
    // Approve every medium that was generated — both ENGLISH and TELUGU if present
    const mediumsToSubmit: SingleMedium[] = (['ENGLISH', 'TELUGU'] as SingleMedium[]).filter(
      (m) => !!generatedContentIdsRef.current[m],
    )
    if (mediumsToSubmit.length === 0) return false

    let anyOk = false
    for (const medium of mediumsToSubmit) {
      const contentId = generatedContentIdsRef.current[medium]!
      const segs = allSegments[medium]
      const segments: Record<string, unknown> = {}
      for (const id of SEGMENT_ORDER) {
        if (segs[id].content !== null && segs[id].content !== undefined) {
          segments[id] = segs[id].content
        }
      }
      if (Object.keys(segments).length === 0) continue
      try {
        const res = await fetch(`${API_BASE}/api/v1/content-studio/generated-content/${contentId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segments }),
        })
        if (res.ok) anyOk = true
      } catch {
        // continue to next medium
      }
    }
    return anyOk
  }, [allSegments])

  // ── Derived ───────────────────────────────────────────────────

  const isAnyGenerating = isGeneratingEN || isGeneratingTE
  const activeSegments = allSegments[activeMedium]
  const completedSegments = SEGMENT_ORDER.filter((id) => activeSegments[id].status === 'complete')
  const completedCount = completedSegments.length
  const hasContent = isAllTopicsMode
    ? allTopicsProgress.some((t) => t.status === 'done' || t.status === 'generating')
    : completedCount > 0

  // Segments that must be individually approved before submit.
  // Exclude: css_diagram (approval mirrored from svg_diagram), prerequisites with no topics (renders null), free_style with no content.
  const approveableSegments = completedSegments.filter((id) => {
    if (id === 'css_diagram') return false // auto-approved with svg_diagram
    if (id === 'free_style') return (activeSegments['free_style']?.content as { html?: string } | null)?.html != null
    if (id === 'prerequisites') {
      const c = activeSegments['prerequisites']?.content
      const topics = Array.isArray(c) ? c : ((c as { topics?: unknown[] } | null)?.topics ?? [])
      return topics.length > 0
    }
    return true
  })
  const allSegmentsApproved = approveableSegments.length > 0 && approveableSegments.every((id) => auditStates[id] === 'approved')
  const approvedCount = approveableSegments.filter((id) => auditStates[id] === 'approved').length

  const combinedProgress = session.medium === 'BOTH'
    ? Math.round((progressEN + progressTE) / 2)
    : (activeMedium === 'ENGLISH' ? progressEN : progressTE)

  // AuditCallbacks object for ContentViewer + FreestyleViewer
  const auditCallbacks = hasContent && !isAllTopicsMode ? {
    getStatus: (id: SegmentId): AuditStatus => auditStates[id] ?? 'pending',
    onComment: commentOnSegment,
    onRegenerate: regenerateSegment,
    onApprove: markSegmentApproved,
    isRefining: (id: SegmentId) => refiningSegments[id] === true,
    onEditCode: editSegmentCode,
  } : undefined

  return {
    activeSegments,
    activeMedium,
    setActiveMedium,
    isAnyGenerating,
    isGeneratingEN,
    isGeneratingTE,
    combinedProgress,
    session,
    updateSession,
    textbookStructure,
    isLoadingStructure,
    loadError,
    loadTextbookStructure,
    parseIndexText,
    saveTextbookStructure,
    appendChapters,
    selectedTopicId,
    selectTopic,
    missingMedium,
    generateMissingMedium,
    generate,
    stopGeneration,
    // All Topics
    isAllTopicsMode,
    allTopicsProgress,
    allTopicsSegmentsMap,
    selectAllTopics,
    generateAllTopics,
    // Chat
    chatHistory,
    isChatting,
    chat,
    clearChat,
    completedCount,
    hasContent,
    // Audit
    auditCallbacks,
    allSegmentsApproved,
    approvedCount,
    approveableCount: approveableSegments.length,
    submitToDatabase,
    // Prerequisites
    prerequisiteTopics,
    isFetchingPrereqs,
    fetchPrerequisites,
  }
}
