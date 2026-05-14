import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IndianRupee, Search, AlertCircle, BarChart2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import PageLayout from '@/components/layout/PageLayout'
import PageHeader from '@/components/layout/PageHeader'
import { slideUp } from '@/lib/animations'
import { useFeeCollection, useStudentLedger } from '@/hooks/useFees'
import { FeeCollectionSummary, FeeCollectionSummarySkeleton } from './components/FeeCollectionSummary'
import { RecordPaymentModal } from './components/RecordPaymentModal'
import { FeeSettingsModal } from './components/FeeSettingsModal'
import type { FeeStatus } from '@/types/common'

// ─── Student ledger panel ─────────────────────────────────────────────────

function LedgerPanel({ onPayNow }: { onPayNow: (neuraId: string) => void }) {
  const [input, setInput] = useState('')
  const [searchedId, setSearchedId] = useState<string | null>(null)
  const { data, isLoading, isError } = useStudentLedger(searchedId)

  function handleSearch() {
    const id = input.trim().toUpperCase()
    if (id.length >= 10) setSearchedId(id)
  }

  const statusColor: Record<FeeStatus, string> = {
    PAID: 'bg-green-100 text-green-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    OVERDUE: 'bg-red-100 text-red-700',
    PENDING: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-700">Student Fee Ledger</p>
      <div className="flex gap-2">
        <Input
          placeholder="Enter Neura ID..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="font-mono text-sm uppercase"
        />
        <Button variant="outline" onClick={handleSearch} size="icon" aria-label="Search student ledger">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && searchedId && (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {isError && searchedId && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Student not found. Please check the Neura ID.
        </div>
      )}

      {data && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-900">{data.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {data.neura_id} · Class {data.class_year} - {data.section}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-xl font-bold text-slate-900">
                ₹{data.total_balance.toLocaleString('en-IN')}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[data.status]}`}
              >
                {data.status}
              </span>
            </div>
          </div>

          {data.total_balance > 0 && (
            <Button
              size="sm"
              className="w-full"
              onClick={() => onPayNow(data.neura_id)}
            >
              <IndianRupee className="mr-1.5 h-3.5 w-3.5" />
              Pay ₹{data.total_balance.toLocaleString('en-IN')}
            </Button>
          )}

          {data.ledger.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Fee Head</th>
                    <th className="px-3 py-2 font-medium">Period</th>
                    <th className="px-3 py-2 text-right font-medium">Due</th>
                    <th className="px-3 py-2 text-right font-medium">Paid</th>
                    <th className="px-3 py-2 text-right font-medium">Balance</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.ledger.map((item) => (
                    <tr
                      key={item.id}
                      className={item.status === 'OVERDUE' ? 'bg-red-50' : ''}
                    >
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {item.fee_head.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.period_label ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right">₹{item.amount_due.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-right text-green-700">
                        ₹{item.amount_paid.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        ₹{item.balance.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${statusColor[item.status]}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function FeesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [paymentNeuraId, setPaymentNeuraId] = useState<string | undefined>(undefined)
  const { data, isLoading, isError, refetch } = useFeeCollection()

  // Support ?pay=NEURA_ID from analytics page "Pay Now"
  useEffect(() => {
    const payParam = searchParams.get('pay')
    if (payParam) {
      setPaymentNeuraId(payParam)
      setShowPaymentModal(true)
    }
  }, [searchParams])

  function handleOpenPayment(neuraId?: string) {
    setPaymentNeuraId(neuraId)
    setShowPaymentModal(true)
  }

  function handleClosePayment() {
    setPaymentNeuraId(undefined)
    setShowPaymentModal(false)
  }

  return (
    <PageLayout>
      <PageHeader
        title="Fees"
        description="Track fee collection and manage student payments"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/fees/analytics')}>
              <BarChart2 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowSettingsModal(true)} aria-label="Fee settings">
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button onClick={() => handleOpenPayment()}>
              <IndianRupee className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>
        }
      />

      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* Left: collection summary */}
        <div className="lg:col-span-2">
          {isLoading && <FeeCollectionSummarySkeleton />}

          {isError && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-8 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-red-600">Failed to load fee data</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          )}

          {data && <FeeCollectionSummary data={data} />}
        </div>

        {/* Right: ledger lookup */}
        <div>
          <LedgerPanel onPayNow={(neuraId) => handleOpenPayment(neuraId)} />
        </div>
      </motion.div>

      <RecordPaymentModal
        open={showPaymentModal}
        onClose={handleClosePayment}
        initialNeuraId={paymentNeuraId}
      />

      <FeeSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </PageLayout>
  )
}
