import {useQuery} from '@tanstack/react-query';
import {api} from '@lib/api';
import {useAuthStore} from '@store/authStore';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TeacherClass {
  classYear: number;
  section: string;
  subject: string;
  studentCount: number;
  attendanceMarkedToday: boolean;
  homeworkDueToday: number;
  pendingGrading: number;
}

interface MyClassesData {
  classes: TeacherClass[];
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useMyClasses() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const query = useQuery({
    queryKey: ['teacher', 'classes'],
    queryFn: async (): Promise<MyClassesData> => {
      const response = await api.get<MyClassesData>('/teacher/classes');
      return response;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  return {
    ...query,
    classes: query.data?.classes || [],
  };
}

// ── Export Types ──────────────────────────────────────────────────────────────

export type {MyClassesData, TeacherClass};