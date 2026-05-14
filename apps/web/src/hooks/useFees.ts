import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  FeeCollectionSummary,
  StudentFeeBalance,
  PaymentReceipt,
  RecordPaymentInput,
  FeeAnalyticsData,
  UnpaidStudentItem,
  ConcessionRule,
  CustomFeeHead,
  FeeStructureRow,
} from '@/types/common'

export function useFeeCollection() {
  return useQuery({
    queryKey: ['fees', 'collection'],
    queryFn: () => api.get<FeeCollectionSummary>('/fees/collection'),
    staleTime: 2 * 60 * 1000,
  })
}

export function useFeeStructure() {
  return useQuery({
    queryKey: ['fees', 'structure'],
    queryFn: () => api.get<FeeStructureRow[]>('/fees/structure'),
    staleTime: 10 * 60 * 1000,
  })
}

export function useStudentLedger(neuraId: string | null) {
  return useQuery({
    queryKey: ['fees', 'ledger', neuraId],
    queryFn: () => api.get<StudentFeeBalance>(`/fees/ledger/${neuraId}`),
    enabled: !!neuraId,
    staleTime: 30 * 1000,
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())

  const mutation = useMutation({
    mutationFn: (data: RecordPaymentInput) =>
      api.post<PaymentReceipt>('/fees/payment', data, {
        idempotencyKey: idempotencyKeyRef.current,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', 'collection'] })
      queryClient.invalidateQueries({ queryKey: ['fees', 'ledger'] })
      idempotencyKeyRef.current = crypto.randomUUID()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to record payment')
    },
  })

  return mutation
}

export function useVoidPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      api.delete<{ message: string }>(`/fees/payment/${paymentId}`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      toast.success('Payment voided successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to void payment')
    },
  })
}

export function useFeeAnalytics() {
  return useQuery({
    queryKey: ['fees', 'analytics'],
    queryFn: () => api.get<FeeAnalyticsData>('/fees/analytics'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUnpaidStudents(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['fees', 'unpaid', page, limit],
    queryFn: () =>
      api.get<UnpaidStudentItem[]>('/fees/analytics/unpaid', {
        page,
        limit,
      }),
    staleTime: 2 * 60 * 1000,
  })
}

export function useConcessionRules() {
  return useQuery({
    queryKey: ['fees', 'concession-rules'],
    queryFn: () => api.get<ConcessionRule[]>('/fees/concession-rules'),
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateConcessionRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<ConcessionRule, 'id' | 'is_active'>) =>
      api.post<ConcessionRule>('/fees/concession-rules', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fees', 'concession-rules'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeactivateConcessionRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/fees/concession-rules/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fees', 'concession-rules'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCustomFeeHeads() {
  return useQuery({
    queryKey: ['fees', 'custom-heads'],
    queryFn: () => api.get<CustomFeeHead[]>('/fees/custom-heads'),
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateCustomFeeHead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<CustomFeeHead, 'id' | 'is_active'>) =>
      api.post<CustomFeeHead>('/fees/custom-heads', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fees', 'custom-heads'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateFeeStructure() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: FeeStructureRow[]) => api.put<{ message: string }>('/fees/structure', rows),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fees', 'structure'] })
      toast.success('Fee structure saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
