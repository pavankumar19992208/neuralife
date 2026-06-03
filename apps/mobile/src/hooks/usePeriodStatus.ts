import {useState, useEffect, useRef, useCallback} from 'react';
import {todayIST} from '@lib/dates';
import type {PeriodCard, PeriodStatus, PeriodStatusInfo, ContextState} from '@apptypes/home';

interface UsePeriodStatusReturn {
  currentTime: Date;
  contextState: ContextState;
  contextPeriod: PeriodCard | null;
  nextPeriod: PeriodCard | null;
  periodStatuses: Record<string, PeriodStatusInfo>;
}

/** Parse "HH:MM" into minutes-since-midnight. */
function toMinutes(timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map(Number);
  return (hh ?? 0) * 60 + (mm ?? 0);
}

function getPeriodStatus(period: PeriodCard, nowMinutes: number): PeriodStatusInfo {
  const start = toMinutes(period.startTime);
  const end   = toMinutes(period.endTime);
  if (nowMinutes < start) return {status: 'UPCOMING', elapsedPct: 0};
  if (nowMinutes >= end)  return {status: 'PAST',     elapsedPct: 100};
  const elapsed = ((nowMinutes - start) / (end - start)) * 100;
  return {status: 'NOW', elapsedPct: Math.min(100, Math.max(0, elapsed))};
}

/**
 * Recomputes period status and context every 60 seconds.
 * Aligns to the top of each minute for clean ticks.
 * Always uses IST clock.
 */
function getEffectiveTime(): Date {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {useDevStore} = require('@store/devStore');
    const {mockHour, mockMinute} = useDevStore.getState();
    if (mockHour !== null && mockMinute !== null) {
      const t = todayIST();
      t.setHours(mockHour, mockMinute, 0, 0);
      return t;
    }
  }
  return todayIST();
}

export function usePeriodStatus(periods: PeriodCard[]): UsePeriodStatusReturn {
  const [currentTime, setCurrentTime] = useState<Date>(() => getEffectiveTime());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tick = useCallback(() => {
    setCurrentTime(getEffectiveTime());
  }, []);

  useEffect(() => {
    // Align to next :00 second for clean minute ticks
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    timeoutRef.current = setTimeout(() => {
      tick();
      intervalRef.current = setInterval(tick, 60_000);
    }, msToNextMinute);

    return () => {
      if (timeoutRef.current)  clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tick]);

  // Only consider REGULAR periods for context logic
  const regularPeriods = periods.filter(p => p.periodType === 'REGULAR');

  const nowHrs = currentTime.getHours() + currentTime.getMinutes() / 60;
  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Build per-period status map (keyed by period.id)
  const periodStatuses: Record<string, PeriodStatusInfo> = {};
  for (const p of periods) {
    periodStatuses[p.id] = getPeriodStatus(p, nowMinutes);
  }

  // Find NOW and adjacent periods from REGULAR periods only
  const nowPeriod    = regularPeriods.find(p => periodStatuses[p.id]?.status === 'NOW') ?? null;
  const nextPeriod   = regularPeriods.find(p => periodStatuses[p.id]?.status === 'UPCOMING') ?? null;
  const firstPeriod  = regularPeriods[0] ?? null;
  const lastPeriod   = regularPeriods[regularPeriods.length - 1] ?? null;

  // Determine context state
  let contextState: ContextState = 'BEFORE_SCHOOL';
  let contextPeriod: PeriodCard | null = null;

  if (!firstPeriod) {
    // No regular periods today — nothing to show
    contextState = 'BEFORE_SCHOOL';
  } else if (nowMinutes < toMinutes(firstPeriod.startTime)) {
    contextState = 'BEFORE_SCHOOL';
    contextPeriod = firstPeriod;
  } else if (lastPeriod && nowMinutes >= toMinutes(lastPeriod.endTime)) {
    contextState = 'AFTER_SCHOOL';
    contextPeriod = null;
  } else if (nowPeriod) {
    // We are inside a REGULAR period
    if (!nowPeriod.attendanceMarked) {
      contextState = 'MARK_ATTENDANCE';
      contextPeriod = nowPeriod;
    } else if (!nowPeriod.coverageMarked) {
      contextState = 'ALL_DONE';      // Coverage not tracked yet in v1
      contextPeriod = nowPeriod;
    } else {
      contextState = 'ALL_DONE';
      contextPeriod = nowPeriod;
    }
  } else {
    // Between periods — check if within 20 min of a period that just ended
    const justEndedPeriod = regularPeriods
      .slice()
      .reverse()
      .find(p => {
        const endMin = toMinutes(p.endTime);
        return nowMinutes >= endMin && nowMinutes < endMin + 20;
      }) ?? null;

    if (justEndedPeriod && !justEndedPeriod.coverageMarked) {
      contextState = 'MARK_COVERAGE';
      contextPeriod = justEndedPeriod;
    } else {
      contextState = 'FREE_PERIOD';
      contextPeriod = nextPeriod;
    }
  }

  // If we're in a FREE/BREAK/LUNCH slot, show FREE_PERIOD
  const nowNonTeaching = periods.find(
    p => p.periodType !== 'REGULAR' && periodStatuses[p.id]?.status === 'NOW',
  );
  if (nowNonTeaching && contextState !== 'MARK_ATTENDANCE' && contextState !== 'MARK_COVERAGE') {
    contextState = 'FREE_PERIOD';
    contextPeriod = nextPeriod;
  }

  return {currentTime, contextState, contextPeriod, nextPeriod, periodStatuses};
}
