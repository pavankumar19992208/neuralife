import { useAuthStore } from '@/store/authStore'

export function useBranding() {
  const { school_name, school_logo_url, brand_color } = useAuthStore()

  return {
    school_name: school_name || 'NeuraLife',
    school_logo_url: school_logo_url || '',
    headerBg: brand_color || '#1E40AF',
    headerText: '#FFFFFF' as const,
    primary: '#1E40AF',
    secondary: '#0D9488',
    accent: '#F59E0B',
    success: '#10B981',
    danger: '#EF4444',
  }
}
