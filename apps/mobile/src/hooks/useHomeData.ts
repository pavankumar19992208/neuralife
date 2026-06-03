import {useQuery} from '@tanstack/react-query';
import {api} from '@lib/api';
import {useAuthStore} from '@store/authStore';
import {useSchoolStore} from '@store/schoolStore';
import type {HomeData} from '@apptypes/home';

export function useHomeData() {
  const teacherId = useAuthStore(s => s.teacherId);
  const schoolId  = useAuthStore(s => s.schoolId);
  const setSchoolData = useSchoolStore(s => s.setSchoolData);

  // Dev-only: read mock date to pass as query param
  let mockDate: string | null = null;
  if (__DEV__) {
    // Dynamic require so the store is tree-shaken in production builds
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mockDate = require('@store/devStore').useDevStore.getState().mockDate;
  }

  return useQuery<HomeData, Error>({
    queryKey: ['teacher', 'home', teacherId, mockDate],
    queryFn: async () => {
      const path = mockDate ? `/teacher/home?debug_date=${mockDate}` : '/teacher/home';
      const data = await api.get<HomeData>(path);
      // Sync school branding into Zustand so all components see it
      if (data.schoolAccentColor) {
        setSchoolData({
          schoolName: data.schoolName,
          logoUrl: data.schoolLogoUrl,
          accentColor: data.schoolAccentColor,
        });
      }
      return data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!teacherId && !!schoolId,
    retry: 2,
  });
}
