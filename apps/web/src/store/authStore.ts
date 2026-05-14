import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JWTPayload, SchoolBranding } from '@/types/common'
import { UserRole } from '@/types/common'

interface AuthState {
  isAuthenticated: boolean
  accessToken: string | null
  refreshToken: string | null
  role: UserRole | null
  school_id: string | null
  teacher_id: string | undefined
  neura_id: string | undefined
  school_name: string
  school_logo_url: string
  brand_color: string
}

interface AuthActions {
  setAuth: (
    payload: JWTPayload,
    tokens: { accessToken: string; refreshToken: string },
    branding?: Partial<SchoolBranding>,
  ) => void
  clearAuth: () => void
}

const initialState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  role: null,
  school_id: null,
  teacher_id: undefined,
  neura_id: undefined,
  school_name: '',
  school_logo_url: '',
  brand_color: '',
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      setAuth: (payload, tokens, branding) => {
        set({
          isAuthenticated: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          role: payload.role,
          school_id: payload.school_id,
          teacher_id: payload.teacher_id,
          neura_id: payload.neura_id,
          school_name: branding?.school_name ?? '',
          school_logo_url: branding?.school_logo_url ?? '',
          brand_color: branding?.brand_color ?? '',
        })
      },

      clearAuth: () => set(initialState),
    }),
    {
      name: 'neuralife-auth',
    },
  ),
)
