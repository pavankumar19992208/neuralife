import { useMutation } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import type { JWTPayload } from '@/types/common'

interface OtpRequestResponse {
  message: string
  expiresIn: number
  devOtp?: string
}

interface OtpVerifyResponse {
  accessToken: string
  refreshToken: string
  role: string
  expiresIn: number
}

function parseJWT(token: string): JWTPayload {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(json) as JWTPayload
  } catch {
    throw new Error('Malformed token')
  }
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (data: { mobile: string }) =>
      api.post<OtpRequestResponse>('/auth/otp/request', data),
    onError: (error) => {
      const msg = error instanceof Error && error.message
        ? error.message
        : 'Failed to send OTP. Please try again.'
      toast.error(msg)
    },
  })
}

export function useVerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()

  return useMutation({
    mutationFn: (data: { mobile: string; otp: string }) =>
      api.post<OtpVerifyResponse>('/auth/otp/verify', data),
    onSuccess: (data) => {
      const payload = parseJWT(data.accessToken)
      useAuthStore.getState().setAuth(payload, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      const from = new URLSearchParams(location.search).get('from') ?? '/dashboard'
      navigate(from, { replace: true })
    },
    // onError omitted — calling component handles inline error + shake
  })
}

export function useLogout() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async () => {
      const { accessToken } = useAuthStore.getState()
      await fetch('/api/v1/auth/session', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken ?? ''}`,
          'x-correlation-id': crypto.randomUUID(),
        },
      })
    },
    onSettled: () => {
      useAuthStore.getState().clearAuth()
      navigate('/login', { replace: true })
    },
  })
}
