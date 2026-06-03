import {useQuery} from '@tanstack/react-query';
import {api} from '@lib/api';
import {useAuthStore} from '@store/authStore';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WeekSlot {
  id: string;
  periodNumber: number | null;
  slotType: 'REGULAR' | 'BREAK' | 'LUNCH' | 'FREE' | 'ASSEMBLY';
  startTime: string;
  endTime: string;
  subject: string | null;
  classYear: number | null;
  section: string | null;
  roomNumber: string | null;
  studentCount: number | null;
  attendanceMarked: boolean;
  coverageMarked: boolean;
  status: 'PAST' | 'NOW' | 'UPCOMING' | 'NOT_TODAY';
}

interface WeekDay {
  dayOfWeek: string;
  dayLabel: string;
  shortLabel: string;
  date: string;
  isToday: boolean;
  slots: WeekSlot[];
}

interface WeekTimetableData {
  days: WeekDay[];
}

// ── Hook ───────────────────────────────────────────────────────────────────────

interface UseWeekTimetableOptions {
  enabled?: boolean;
}

export function useWeekTimetable(options: UseWeekTimetableOptions = {}) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const query = useQuery({
    queryKey: ['teacher', 'timetable', 'week'],
    queryFn: async (): Promise<WeekTimetableData> => {
      const response = await api.get<WeekTimetableData>('/teacher/timetable/week');
      return response;
    },
    enabled: isAuthenticated && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes - timetable doesn't change often
    retry: 2,
  });

  return {
    ...query,
    weekData: query.data,
  };
}

// ── Export Types ──────────────────────────────────────────────────────────────

export type {WeekTimetableData, WeekDay, WeekSlot};