import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PayrollSummary, PayslipRow, NEFTExportRow, AdjustmentType } from '@/types/common'

export function usePayroll(month: number, year: number) {
  return useQuery({
    queryKey: ['salary', 'payroll', month, year],
    queryFn: () => api.get<PayrollSummary | null>('/salary/payroll', { month, year }),
    staleTime: 60 * 1000,
    retry: false,
  })
}

export function usePayrollHistory() {
  return useQuery({
    queryKey: ['salary', 'history'],
    queryFn: () => api.get<Array<Omit<PayrollSummary, 'payslips'>>>('/salary/history'),
    staleTime: 2 * 60 * 1000,
  })
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { month: number; year: number }) =>
      api.post<PayrollSummary>('/salary/payroll/generate', body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['salary', 'payroll', vars.month, vars.year] })
      queryClient.invalidateQueries({ queryKey: ['salary', 'history'] })
    },
  })
}

export function useApprovePayroll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { month: number; year: number }) =>
      api.post<PayrollSummary>('/salary/payroll/approve', body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['salary', 'payroll', vars.month, vars.year] })
    },
  })
}

export function useMarkPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { month: number; year: number }) =>
      api.post<PayrollSummary>('/salary/payroll/mark-paid', body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['salary', 'payroll', vars.month, vars.year] })
      queryClient.invalidateQueries({ queryKey: ['salary', 'history'] })
    },
  })
}

export function useAddAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      payslipId: string
      adjustment_type: AdjustmentType
      label: string
      amount: number
      is_deduction: boolean
    }) =>
      api.post<PayslipRow>(`/salary/payslip/${body.payslipId}/adjustment`, {
        adjustment_type: body.adjustment_type,
        label: body.label,
        amount: body.amount,
        is_deduction: body.is_deduction,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] })
    },
  })
}

export function useDeleteAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ payslipId, adjustmentId }: { payslipId: string; adjustmentId: string }) =>
      api.delete<PayslipRow>(`/salary/payslip/${payslipId}/adjustment/${adjustmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] })
    },
  })
}

export function useNEFTExport(month: number, year: number, enabled = false) {
  return useQuery({
    queryKey: ['salary', 'neft', month, year],
    queryFn: () => api.get<NEFTExportRow[]>('/salary/payroll/neft-export', { month, year }),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useHoldPayslip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payslipId: string) =>
      api.patch<{ ok: boolean }>(`/salary/payslip/${payslipId}/hold`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] })
    },
  })
}

export function useReleaseHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payslipId: string) =>
      api.patch<{ ok: boolean }>(`/salary/payslip/${payslipId}/release`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] })
    },
  })
}
