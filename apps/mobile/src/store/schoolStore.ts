import {create} from 'zustand';

interface SchoolState {
  schoolId: string | null;
  schoolName: string;
  accentColor: string;
  logoUrl: string | null;
  attendanceMode: 'ONCE_PER_DAY' | 'PER_PERIOD';
  currentAcademicYear: string;
  workingDays: number[];  // 0=Sun, 1=Mon... (ISO)

  setSchoolData: (data: Partial<SchoolState>) => void;
}

export const useSchoolStore = create<SchoolState>((set) => ({
  schoolId: null,
  schoolName: 'NeuraLife School',
  accentColor: '#6366f1',
  logoUrl: null,
  attendanceMode: 'ONCE_PER_DAY',
  currentAcademicYear: '2025-26',
  workingDays: [1, 2, 3, 4, 5, 6],  // Mon-Sat

  setSchoolData: (data) => set((state) => ({...state, ...data})),
}));
