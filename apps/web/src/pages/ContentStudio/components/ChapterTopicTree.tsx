import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, Circle, BookOpen } from 'lucide-react'
import type { DBChapter } from '../types'
import { formatBilingualTitle } from '../types'

interface Props {
  chapters: DBChapter[]
  selectedTopicId: string | null
  onSelectTopic: (
    topicId: string,
    titleEn: string,
    titleTe: string | null,
    chapterTitleEn: string,
    chapterNumber: number,
    chapterTopics: Array<{ number: number; title: string }>,
  ) => void
}

export default function ChapterTopicTree({ chapters, selectedTopicId, onSelectTopic }: Props) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    () => new Set(chapters.map((c) => c.id)),
  )

  function toggleChapter(id: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!chapters.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center">
        <p className="text-xs text-slate-400">No chapters found</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden max-h-[18rem] overflow-y-auto">
      {chapters.map((ch, chIdx) => (
        <div key={ch.id} className={chIdx > 0 ? 'border-t border-slate-100' : ''}>
          {/* Chapter row */}
          <button
            onClick={() => toggleChapter(ch.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            {expandedChapters.has(ch.id) ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            )}
            <BookOpen className="h-3 w-3 text-slate-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-700 truncate flex-1 leading-tight">
              Ch.{ch.chapter_number} · {formatBilingualTitle(ch.title_en, ch.title_te)}
            </span>
            <span className="ml-1 text-[9px] text-slate-400 flex-shrink-0 tabular-nums">
              {ch.topics.length}T
            </span>
          </button>

          {/* Topic rows */}
          {expandedChapters.has(ch.id) &&
            ch.topics.map((topic) => {
              const isSelected = selectedTopicId === topic.id
              return (
                <button
                  key={topic.id}
                  onClick={() =>
                    onSelectTopic(
                      topic.id, topic.title_en, topic.title_te, ch.title_en, ch.chapter_number,
                      ch.topics.map((t) => ({ number: t.topic_number, title: t.title_en })),
                    )
                  }
                  className={`
                    w-full flex items-center gap-2 px-4 py-1.5 text-left text-[11px] leading-tight
                    border-t border-slate-50 transition-colors
                    ${isSelected
                      ? 'bg-primary/10 text-primary font-semibold border-l-2 border-l-primary'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  {isSelected ? (
                    <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="h-3 w-3 text-slate-300 flex-shrink-0" />
                  )}
                  <span className="truncate">
                    {topic.topic_number}. {formatBilingualTitle(topic.title_en, topic.title_te)}
                  </span>
                </button>
              )
            })}
        </div>
      ))}
    </div>
  )
}
