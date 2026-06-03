import {useEffect, useRef} from 'react';
import type {PeriodCard} from '@apptypes/home';
import type {PeriodStatusInfo} from '@apptypes/home';
import {
  triggerAttendanceNotification,
  triggerCoverageNotification,
} from '@lib/notifications';

/**
 * Watches period statuses every minute and fires push notifications:
 *
 *   ATTENDANCE  → fires once when a REGULAR period becomes NOW
 *                 and attendanceMarked is false
 *
 *   COVERAGE    → fires once when elapsedPct crosses 85%
 *                 (≈ 5 min before end of a 45-min period)
 *                 and coverageMarked is false
 *
 * Uses a Set of period IDs to ensure each notification fires exactly once
 * per period per day (cleared when the component unmounts or periods change).
 */
export function useNotifications(
  periods: PeriodCard[],
  periodStatuses: Record<string, PeriodStatusInfo>,
): void {
  const sentAttendance = useRef<Set<string>>(new Set());
  const sentCoverage   = useRef<Set<string>>(new Set());

  // Clear sent sets when the day's periods change (new day / new timetable)
  const periodKey = periods.map(p => p.id).join(',');
  useEffect(() => {
    sentAttendance.current.clear();
    sentCoverage.current.clear();
  }, [periodKey]);

  useEffect(() => {
    const regularPeriods = periods.filter(p => p.periodType === 'REGULAR');

    for (const period of regularPeriods) {
      const info = periodStatuses[period.id];
      if (!info || info.status !== 'NOW') continue;

      const payload = {
        subject:      period.subject,
        classYear:    period.classYear,
        section:      period.section,
        startTime:    period.startTime,
        endTime:      period.endTime,
        studentCount: period.studentCount,
        periodNumber: period.periodNumber,
      };

      // ── Attendance: fire at period start (elapsedPct < 15%) ────────────────
      if (
        !period.attendanceMarked &&
        info.elapsedPct < 15 &&
        !sentAttendance.current.has(period.id)
      ) {
        sentAttendance.current.add(period.id);
        triggerAttendanceNotification(payload);
      }

      // ── Coverage: fire at ~85% elapsed (≈ 5 min before 45-min period ends) ─
      if (
        !period.coverageMarked &&
        info.elapsedPct >= 85 &&
        !sentCoverage.current.has(period.id)
      ) {
        sentCoverage.current.add(period.id);
        triggerCoverageNotification(payload);
      }
    }
  // Re-run every time periodStatuses updates (the hook ticks every 60s)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStatuses]);
}
