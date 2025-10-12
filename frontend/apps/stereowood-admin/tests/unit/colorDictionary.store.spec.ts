import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  useColorDictionaryStore,
  type ColorDictionaryViewMode,
  type ColorDictionarySortMode,
} from '@/stores/colorDictionary';

function mockStorage() {
  const storage: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => (key in storage ? storage[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    },
    snapshot: () => ({ ...storage }),
  };
}

describe('useColorDictionaryStore', () => {
  const storage = mockStorage();

  beforeEach(() => {
    setActivePinia(createPinia());
    storage.clear();
    vi.stubGlobal('localStorage', storage);
  });

  it('initialises with defaults', () => {
    const store = useColorDictionaryStore();
    expect(store.viewMode).toBe<'list'>('list');
    expect(store.sortMode).toBe<'code'>('code');
    expect(store.selectedId).toBeNull();
  });

  it('persists view and sort modes', () => {
    const store = useColorDictionaryStore();
    store.setViewMode('wheel');
    store.setSortMode('hue');

    expect(store.viewMode).toBe<'wheel'>('wheel');
    expect(store.sortMode).toBe<'hue'>('hue');
    expect(storage.setItem).toHaveBeenCalledWith('color-dict-view', 'wheel');
    expect(storage.setItem).toHaveBeenCalledWith('color-dict-sort', 'hue');
  });

  it('syncs selected id with available colours', () => {
    const store = useColorDictionaryStore();

    store.syncSelection([]);
    expect(store.selectedId).toBeNull();

    store.syncSelection([10, 20]);
    expect(store.selectedId).toBe(10);

    store.setSelectedId(20);
    store.syncSelection([30, 40]);
    expect(store.selectedId).toBe(30);
  });

  it('restores selection from storage', () => {
    storage.setItem.mockImplementation((key: string, value: string) => {
      (storage as any).snapshot()[key] = value;
    });
    storage.getItem.mockImplementation((key: string) =>
      key === 'color-dict-selected' ? '12' : null,
    );

    const store = useColorDictionaryStore();
    expect(store.selectedId).toBe(12);
  });
});
