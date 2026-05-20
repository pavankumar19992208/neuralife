import { motion } from 'framer-motion'
import { AlertTriangle, Trophy, Upload } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PageHeader from '@/components/layout/PageHeader'
import { slideUp } from '@/lib/animations'
import { useBoardResults, usePredictionAccuracy } from '@/hooks/useAnalytics'
import { cn } from '@/lib/utils'

function pct(n: number) { return `${n.toFixed(1)}%` }

const GRADE_COLORS: Record<string, string> = {
  A1: 'bg-green-100 text-green-700',
  A2: 'bg-green-50 text-green-600',
  B1: 'bg-blue-50 text-blue-600',
  B2: 'bg-blue-50 text-blue-500',
  C1: 'bg-yellow-50 text-yellow-600',
  C2: 'bg-yellow-50 text-yellow-500',
  D:  'bg-orange-50 text-orange-600',
  F:  'bg-red-50 text-red-700',
}

export default function BoardResultsPage() {
  const { data: results, isLoading: resultsLoading, isError, refetch } = useBoardResults()
  const { data: accuracy, isLoading: accLoading } = usePredictionAccuracy()

  // Group by subject
  const bySubject = (results ?? []).reduce<Record<string, typeof results>>((acc, r) => {
    if (!acc[r.subject]) acc[r.subject] = []
    acc[r.subject]!.push(r)
    return acc
  }, {})

  const subjectAvgs = Object.entries(bySubject).map(([subject, rows]) => ({
    subject,
    avg: rows!.reduce((s, r) => s + (r.marks / r.max_marks) * 100, 0) / rows!.length,
    count: rows!.length,
  }))

  return (
    <div>
      <PageHeader
        title="Board Exam Results"
        description="Class 10 board exam performance and AI prediction accuracy"
        backHref="/analytics"
        bookmarkUrl="/analytics/board-results"
        action={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" />
            Import Results
          </Button>
        }
      />

      {(resultsLoading || accLoading) && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Failed to load board results.
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!resultsLoading && !isError && (!results || results.length === 0) && (
        <motion.div
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-slate-300" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">No Board Results Yet</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">
              Import Class 10 board exam results to see subject-wise analysis and compare
              against NeuraLife AI predictions.
            </p>
          </div>
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Import Board Results
          </Button>
        </motion.div>
      )}

      {results && results.length > 0 && (
        <motion.div variants={slideUp} initial="initial" animate="animate" className="space-y-6">
          {/* Subject averages chart */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Subject-wise Score Averages</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={subjectAvgs} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Avg Score']} />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]} fill="#1e40af" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Prediction accuracy */}
          {accuracy && accuracy.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  AI Prediction Accuracy
                  <Badge variant="outline" className="text-xs ml-auto">
                    Avg: {pct(accuracy.reduce((s, a) => s + a.accuracy_pct, 0) / accuracy.length)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-slate-500">
                        <th className="text-left py-2 font-medium">Subject</th>
                        <th className="text-right py-2 font-medium">Predicted</th>
                        <th className="text-right py-2 font-medium">Actual</th>
                        <th className="text-right py-2 font-medium">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accuracy.map((a) => (
                        <tr key={a.subject} className="border-b last:border-0">
                          <td className="py-2 font-medium text-slate-900">{a.subject}</td>
                          <td className="py-2 text-right text-slate-600">{pct(a.predicted_avg)}</td>
                          <td className="py-2 text-right text-slate-900 font-medium">{pct(a.actual_avg)}</td>
                          <td className="py-2 text-right">
                            <span className={cn(
                              'font-semibold',
                              a.accuracy_pct >= 90 ? 'text-success' : a.accuracy_pct >= 75 ? 'text-warning' : 'text-danger',
                            )}>
                              {pct(a.accuracy_pct)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results by subject */}
          {Object.entries(bySubject).map(([subject, rows]) => (
            <Card key={subject}>
              <CardHeader>
                <CardTitle className="text-sm">{subject}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-1">
                  {rows!.map((r) => (
                    <div
                      key={r.neura_id}
                      title={`${r.neura_id}: ${r.marks}/${r.max_marks} ${r.grade ?? ''}`}
                      className={cn(
                        'text-center p-1 rounded text-xs font-semibold',
                        r.grade ? GRADE_COLORS[r.grade] ?? 'bg-slate-50 text-slate-600' : 'bg-slate-50 text-slate-600',
                      )}
                    >
                      {r.grade ?? pct((r.marks / r.max_marks) * 100)}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {rows!.length} students · Avg: {pct(rows!.reduce((s, r) => s + (r.marks / r.max_marks) * 100, 0) / rows!.length)}
                </p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  )
}
