import { setActivePinia, createPinia } from 'pinia';
import { describe, expect, it, beforeEach } from 'vitest';

import { useAppStore } from '@/stores/app';

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('marks a phase as complete', () => {
    const store = useAppStore();
    store.markPhaseComplete('phase-1', 'Tooling ready');

    const phase = store.checkpoints.find((item) => item.id === 'phase-1');
    expect(phase?.completed).toBe(true);
    expect(phase?.notes).toBe('Tooling ready');
    expect(store.lastSyncedAt).not.toBeNull();
  });
});
