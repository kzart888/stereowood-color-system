import { defineStore } from 'pinia';

type Phase = 'phase-0' | 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'phase-5' | 'phase-6';

interface MigrationCheckpoint {
  id: Phase;
  label: string;
  completed: boolean;
  notes: string;
}

interface AppState {
  checkpoints: MigrationCheckpoint[];
  lastSyncedAt: string | null;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    checkpoints: [
      {
        id: 'phase-0',
        label: 'Phase 0 — Project Preparation',
        completed: true,
        notes: 'Legacy UI archived and backend configured.',
      },
      {
        id: 'phase-1',
        label: 'Phase 1 — Tooling Skeleton',
        completed: false,
        notes: 'Initialize core services, linting, and Vitest harness.',
      },
      {
        id: 'phase-2',
        label: 'Phase 2 — Core Infrastructure',
        completed: false,
        notes: 'Pinia stores, router, and data services.',
      },
      {
        id: 'phase-3',
        label: 'Phase 3 — Feature Ports',
        completed: false,
        notes: 'Migrate feature modules incrementally.',
      },
      {
        id: 'phase-4',
        label: 'Phase 4 — Backend Modernization',
        completed: false,
        notes: 'Controllers, validators, and test coverage.',
      },
      {
        id: 'phase-5',
        label: 'Phase 5 — Parallel Operation',
        completed: false,
        notes: 'Serve Vue 3 build alongside legacy app.',
      },
      {
        id: 'phase-6',
        label: 'Phase 6 — Cleanup & Documentation',
        completed: false,
        notes: 'Finalize docs, remove obsolete code paths.',
      },
    ],
    lastSyncedAt: null,
  }),
  actions: {
    markPhaseComplete(phase: Phase, notes?: string) {
      const checkpoint = this.checkpoints.find((item) => item.id === phase);
      if (!checkpoint) return;

      checkpoint.completed = true;
      if (notes) {
        checkpoint.notes = notes;
      }
      this.lastSyncedAt = new Date().toISOString();
    },
  },
});
