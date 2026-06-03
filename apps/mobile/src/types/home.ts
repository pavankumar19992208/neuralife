export type PeriodType = 'REGULAR' | 'LUNCH' | 'BREAK' | 'ASSEMBLY' | 'LIBRARY' | 'FREE';

export interface PeriodCard {
  id: string;
  periodNumber: number;
  subject: string;
  classYear: number;
  section: string;
  roomNumber: string | null;
  startTime: string;    // "08:50"
  endTime: string;      // "09:35"
  studentCount: number;
  periodType: PeriodType;
  attendanceMarked: boolean;
  coverageMarked: boolean;
  isSubstitute: boolean;
  substituteForName: string | null;
}

export interface KpiData {
  periodsToday: number;
  homeworkDueToday: number;
  homeworkCompletionPct: number | null;
  doubtsPending: number;
  atRiskCount: number | null;
  // Class teacher only:
  presentToday?: number;
  absentToday?: number;
  leaveRequestsPending?: number;
  classAlerts?: number;
}

export interface AlertItem {
  id: string;
  type: string;
  message: string;
  studentName?: string;
  studentId?: string;
  severity: 'HIGH' | 'MEDIUM';
  actionLabel: string;
  createdAt: string;
}

export interface HomeData {
  teacherName: string;
  firstName: string;
  schoolName: string;
  schoolLogoUrl: string | null;
  schoolAccentColor: string;
  roles: string[];
  classSection: string | null;
  todayDate: string;
  isWorkingDay: boolean;
  periods: PeriodCard[];
  kpis: KpiData;
  alerts: AlertItem[];
}

// Period status computed client-side every 60 seconds
export type PeriodStatus = 'PAST' | 'NOW' | 'UPCOMING';

export type ContextState =
  | 'BEFORE_SCHOOL'
  | 'MARK_ATTENDANCE'
  | 'MARK_COVERAGE'
  | 'ALL_DONE'
  | 'FREE_PERIOD'
  | 'AFTER_SCHOOL';

export interface PeriodStatusInfo {
  status: PeriodStatus;
  elapsedPct: number;  // 0–100, meaningful only for NOW
}
