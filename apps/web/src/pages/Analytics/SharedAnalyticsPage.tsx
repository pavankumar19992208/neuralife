import { useParams } from 'react-router-dom'
import { AlertTriangle, Lock, Sparkles, GraduationCap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSharedAnalytics } from '@/hooks/useAnalytics'

export default function SharedAnalyticsPage() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, isError } = useSharedAnalytics(token ?? '')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7 text-danger" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Link Expired or Invalid</h1>
          <p className="text-sm text-slate-500 max-w-xs">
            This analytics share link has expired or is no longer valid.
            Please ask the school to generate a new link.
          </p>
        </div>
      </div>
    )
  }

  const narrative = data.narrative
  const academic = data.academic

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">NeuraLife Analytics</p>
              <p className="text-xs text-slate-400">Shared Report · {new Date(narrative.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Narrative */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />AI School Narrative
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">{narrative.narrative_text}</p>
            {narrative.key_insights.length > 0 && (
              <ul className="space-y-1">
                {narrative.key_insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Subject mastery */}
        {academic.subject_mastery.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />Subject Mastery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={academic.subject_mastery} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="subject" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Mastery']} />
                  <Bar dataKey="avg_score" radius={[0, 4, 4, 0]}>
                    {academic.subject_mastery.map((m, i) => (
                      <Cell key={i} fill={m.avg_score >= 70 ? '#10b981' : m.avg_score >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* At-risk funnel summary */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Student Risk Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{academic.at_risk_funnel.stage_1_total}</p>
                <p className="text-xs text-slate-500 mt-1">Total Students</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{academic.at_risk_funnel.stage_3_at_risk}</p>
                <p className="text-xs text-slate-500 mt-1">At-Risk</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-danger">{academic.at_risk_funnel.stage_5_critical}</p>
                <p className="text-xs text-slate-500 mt-1">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400 text-center">
          Powered by NeuraLife · This report was shared and may not reflect current data.
        </p>
      </div>
    </div>
  )
}
