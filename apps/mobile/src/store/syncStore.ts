import {create} from 'zustand';

type SyncStatus = 'LIVE' | 'PENDING' | 'OFFLINE' | 'SYNCING';

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
  setStatus: (status: SyncStatus) => void;
  setPending: (count: number) => void;
  setSynced: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'LIVE',
  pendingCount: 0,
  lastSyncAt: null,

  setStatus: (status) => set({status}),
  setPending: (pendingCount) => set({pendingCount, status: 'PENDING'}),
  setSynced: () => set({status: 'LIVE', pendingCount: 0, lastSyncAt: new Date()}),
}));
