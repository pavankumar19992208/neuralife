import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Tablet, Smartphone, MonitorSmartphone, Sun, EyeOff, MessageSquare, CheckCircle2, ChevronLeft, Layers, Database, Loader2, LayoutList } from 'lucide-react'
import type { DeviceType, RenderMode, SegmentId, SingleMedium, ContentSession, DBChapter, PrerequisiteTopicDB } from './types'
import { DEVICE_DIMENSIONS } from './types'
import { useContentStudio } from './hooks/useContentStudio'
import UploadPanel from './components/UploadPanel'
import DeviceFrame from './components/DeviceFrame'
import ContentViewer from './components/ContentViewer'
import AllTopicsViewer from './components/AllTopicsViewer'
import ChatPanel from './components/ChatPanel'
import FreestyleModeViewer from './components/FreestyleModeViewer'

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  smartpad: <Tablet className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <MonitorSmartphone className="h-4 w-4" />,
}

export default function ContentStudioPage() {
  const [deviceType, setDeviceType] = useState<DeviceType>('smartpad')
  const [renderMode, setRenderMode] = useState<RenderMode>('color')
  const [isChatOpen, setIsChatOpen] = useState(false)

  const {
    activeSegments,
    activeMedium,
    setActiveMedium,
    isAnyGenerating,
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
    isAllTopicsMode,
    allTopicsProgress,
    allTopicsSegmentsMap,
    selectAllTopics,
    generateAllTopics,
    chatHistory,
    isChatting,
    chat,
    completedCount,
    hasContent,
    auditCallbacks,
    allSegmentsApproved,
    approvedCount,
    approveableCount,
    submitToDatabase,
    prerequisiteTopics,
    fetchPrerequisites,
  } = useContentStudio()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)
  const [viewMode, setViewMode] = useState<'device' | 'freestyle'>('device')

  const dim = DEVICE_DIMENSIONS[deviceType]
  const frameDisplayWidth = Math.round(dim.width * dim.scale)
  const isDualMedium = session.medium === 'BOTH'

  // Fetch prerequisites from DB whenever board/grade/subject are set
  useEffect(() => {
    if (session.board && session.grade && session.subject) {
      void fetchPrerequisites(session.board, session.grade, session.subject)
    }
  }, [session.board, session.grade, session.subject, fetchPrerequisites])

  // Reset submit state when new generation starts
  useEffect(() => {
    if (isAnyGenerating) {
      setSubmitDone(false)
    }
  }, [isAnyGenerating])

  // ── Generate callbacks ─────────────────────────────────────────

  function handleGenerate(fullSession: ContentSession) {
    setSubmitDone(false)
    generate({ ...fullSession, prerequisiteTopics: prerequisiteTopics as PrerequisiteTopicDB[] }, selectedTopicId)
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    const ok = await submitToDatabase()
    setIsSubmitting(false)
    if (ok) setSubmitDone(true)
  }

  function handleGenerateAllTopics(chapter: DBChapter, partialSession: Partial<ContentSession>) {
    const fullSession: ContentSession = {
      board: partialSession.board!,
      grade: partialSession.grade!,
      subject: partialSession.subject!,
      medium: (partialSession.medium ?? 'ENGLISH') as ContentSession['medium'],
      topicContext: partialSession.topicContext ?? '',
      chapterNumber: chapter.chapter_number,
      chapterTitle: chapter.title_en,
      topicTitle: '', // set per-topic inside generateAllTopics
      model: partialSession.model ?? 'claude',
    }
    generateAllTopics(chapter, fullSession)
  }

  // ── Progress display ──────────────────────────────────────────

  const allTopicsDoneCount = allTopicsProgress.filter((t) => t.status === 'done').length
  const allTopicsTotalCount = allTopicsProgress.length

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Top Header Bar ──────────────────────────────────────── */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-white">CS</span>
            </div>
            <span className="text-sm font-bold text-slate-900">Content Studio</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              INTERNAL
            </span>
          </div>
        </div>

        {/* Progress indicators */}
        {isAnyGenerating && isAllTopicsMode && allTopicsTotalCount > 0 && (
          <div className="flex items-center gap-3">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs text-slate-600 font-medium">
              Generating topic {allTopicsDoneCount + 1} of {allTopicsTotalCount}
            </span>
            <div className="h-1.5 w-36 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((allTopicsDoneCount / allTopicsTotalCount) * 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {isAnyGenerating && !isAllTopicsMode && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-48 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${combinedProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {combinedProgress}% — {completedCount}/12 segments
              {isDualMedium && <span className="ml-1 text-slate-400">(EN + TE)</span>}
            </span>
          </div>
        )}

        {hasContent && !isAnyGenerating && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">
                {isAllTopicsMode
                  ? `${allTopicsDoneCount}/${allTopicsTotalCount} topics done`
                  : `${completedCount}/12 segments`}
              </span>
            </div>
            {session.model && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                session.model === 'gemini'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {session.model === 'gemini' ? 'Gemini 2.5 Pro' : 'Claude Sonnet'}
              </span>
            )}
          </div>
        )}
      </header>

      {/* ── Main 2-column layout ─────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Upload Panel (320px fixed) */}
        <div className="w-[320px] flex-shrink-0 h-full">
          <UploadPanel
            session={session}
            textbookStructure={textbookStructure}
            isLoadingStructure={isLoadingStructure}
            loadError={loadError}
            selectedTopicId={selectedTopicId}
            isAllTopicsMode={isAllTopicsMode}
            isAnyGenerating={isAnyGenerating}
            missingMedium={missingMedium}
            onSessionChange={updateSession}
            onLoadStructure={loadTextbookStructure}
            onParseIndexText={parseIndexText}
            onSaveStructure={saveTextbookStructure}
            onAppendChapters={appendChapters}
            onSelectTopic={selectTopic}
            onSelectAllTopics={selectAllTopics}
            onGenerate={handleGenerate}
            onGenerateAllTopics={handleGenerateAllTopics}
            onStop={stopGeneration}
            onGenerateMissing={generateMissingMedium}
          />
        </div>

        {/* Right: Device Viewer */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Device controls bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5 flex-shrink-0">
            {/* View mode switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {(['smartpad', 'mobile', 'tablet'] as DeviceType[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDeviceType(d); setViewMode('device') }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === 'device' && deviceType === d ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {DEVICE_ICONS[d]}
                    {DEVICE_DIMENSIONS[d].label}
                  </button>
                ))}
              </div>
              {/* Free Style view toggle */}
              <button
                onClick={() => setViewMode((v) => v === 'freestyle' ? 'device' : 'freestyle')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  viewMode === 'freestyle'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                aria-label="Toggle Free Style audit mode"
              >
                <LayoutList className="h-3.5 w-3.5" />
                Free Style
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Language tabs (only when BOTH medium) */}
              {isDualMedium && (
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                  {(['ENGLISH', 'TELUGU'] as SingleMedium[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setActiveMedium(m)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeMedium === m
                          ? 'bg-white shadow-sm text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {m === 'ENGLISH' ? 'EN' : 'TE'}
                    </button>
                  ))}
                </div>
              )}

              {/* Render mode */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setRenderMode('color')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    renderMode === 'color' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Color
                </button>
                <button
                  onClick={() => setRenderMode('eink')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    renderMode === 'eink' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  E-Ink
                </button>
              </div>

              {/* Chat — only available in single-topic mode */}
              {!isAllTopicsMode && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  disabled={!hasContent}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    hasContent
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat with Claude
                  {chatHistory.length > 0 && (
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold">
                      {chatHistory.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Viewport — device frame OR free style mode */}
          {viewMode === 'freestyle' && hasContent && !isAllTopicsMode ? (
            /* Free Style audit mode — fills all available space */
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <FreestyleModeViewer
                segments={activeSegments}
                medium={activeMedium}
                auditCallbacks={auditCallbacks}
                topicTitle={session.topicTitle}
              />
              {/* Submit bar */}
              {!isAnyGenerating && auditCallbacks && (
                <div className="flex-shrink-0 border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                      {approvedCount}/{approveableCount}
                    </div>
                    <p className="text-sm text-slate-600">
                      {allSegmentsApproved ? 'All segments approved' : 'Approve each segment, then submit'}
                    </p>
                  </div>
                  {allSegmentsApproved && (
                    submitDone ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-semibold">Saved to Database</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                        Submit to Database
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Device frame mode */
            <div className="flex-1 overflow-auto bg-slate-200">
              <div className="flex flex-col items-center px-8 py-8 gap-6 min-h-full">
                {!hasContent && !isAnyGenerating ? (
                  <EmptyState isAllTopicsMode={isAllTopicsMode} />
                ) : (
                  <div className="relative flex-shrink-0">
                    <DeviceFrame deviceType={deviceType} renderMode={renderMode}>
                      <div className="w-full h-full overflow-y-auto">
                        {isAllTopicsMode ? (
                          <AllTopicsViewer
                            chapterTitle={session.chapterTitle ?? ''}
                            chapterNumber={session.chapterNumber ?? 1}
                            progress={allTopicsProgress}
                            segmentsMap={allTopicsSegmentsMap}
                            activeMedium={activeMedium}
                            renderMode={renderMode}
                            deviceType={deviceType}
                          />
                        ) : (
                          <ContentViewer
                            segments={activeSegments}
                            renderMode={renderMode}
                            topicTitle={session.topicTitle}
                            chapterTitle={session.chapterTitle}
                            deviceType={deviceType}
                            medium={activeMedium}
                            auditCallbacks={auditCallbacks}
                          />
                        )}
                      </div>

                      {/* Chat FAB — single topic only */}
                      {hasContent && !isAllTopicsMode && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setIsChatOpen(true)}
                          className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg hover:bg-primary/90 transition-colors"
                          style={{ zIndex: 20 }}
                          title="Chat with Claude"
                        >
                          <MessageSquare className="h-5 w-5 text-white" />
                        </motion.button>
                      )}
                    </DeviceFrame>

                    <p className="mt-3 text-center text-xs text-slate-400">
                      {DEVICE_DIMENSIONS[deviceType].label} · {renderMode === 'eink' ? 'E-Ink' : 'Color'}
                      {isDualMedium && ` · ${activeMedium === 'ENGLISH' ? 'English' : 'Telugu'}`}
                      {' · '}{frameDisplayWidth}px preview
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel — single topic only */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatHistory}
        isLoading={isChatting}
        topicTitle={session.topicTitle ?? ''}
        onSend={(msg, seg) => chat(msg, seg as SegmentId | undefined)}
      />
    </div>
  )
}

function EmptyState({ isAllTopicsMode }: { isAllTopicsMode: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md mb-4">
        <span className="text-2xl">{isAllTopicsMode ? '📚' : '✨'}</span>
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-2">
        {isAllTopicsMode ? 'Ready to generate all topics' : 'No content yet'}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed">
        {isAllTopicsMode
          ? 'All topics in this chapter are selected. Optionally upload the chapter PDF for context, then click Generate All Topics.'
          : 'Configure the syllabus and select a topic in the left panel, then click Generate Content.'}
      </p>
      {!isAllTopicsMode && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {['Concept + Explanation', 'SVG + CSS Diagrams', '30 Problems (3 levels)'].map((f, i) => (
            <div key={i} className="rounded-xl bg-white p-3 shadow-sm text-center">
              <p className="text-[10px] font-medium text-slate-600">{f}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
