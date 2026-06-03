import {create} from 'zustand';

/**
 * Dev-only store for time/date overrides.
 * Never imported in production — only used inside __DEV__ guards.
 */
interface DevState {
  mockDate: string | null;   // 'YYYY-MM-DD' — overrides the API date query
  mockHour: number | null;   // 0-23 — overrides the IST hour for usePeriodStatus
  mockMinute: number | null; // 0-59

  setMockDateTime: (date: string, hour: number, minute: number) => void;
  clearMock: () => void;
}

export const useDevStore = create<DevState>(set => ({
  mockDate:   null,
  mockHour:   null,
  mockMinute: null,

  setMockDateTime: (date, hour, minute) => set({mockDate: date, mockHour: hour, mockMinute: minute}),
  clearMock: () => set({mockDate: null, mockHour: null, mockMinute: null}),
}));
