import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ColorDictionaryViewMode = 'list' | 'hsl' | 'wheel' | 'matcher';
export type ColorDictionarySortMode = 'code' | 'hue';

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value == null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage errors (e.g., quota, privacy mode)
  }
}

const VIEW_KEY = 'color-dict-view';
const SORT_KEY = 'color-dict-sort';
const SELECTED_KEY = 'color-dict-selected';

function parseViewMode(value: string | null): ColorDictionaryViewMode {
  if (value === 'hsl' || value === 'wheel' || value === 'matcher') {
    return value;
  }
  return 'list';
}

function parseSortMode(value: string | null): ColorDictionarySortMode {
  if (value === 'hue') {
    return value;
  }
  return 'code';
}

function parseSelectedId(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export const useColorDictionaryStore = defineStore('colorDictionary', () => {
  const viewMode = ref<ColorDictionaryViewMode>(parseViewMode(readStorage(VIEW_KEY)));
  const sortMode = ref<ColorDictionarySortMode>(parseSortMode(readStorage(SORT_KEY)));
  const selectedId = ref<number | null>(parseSelectedId(readStorage(SELECTED_KEY)));

  function setViewMode(mode: ColorDictionaryViewMode) {
    if (viewMode.value === mode) {
      return;
    }
    viewMode.value = mode;
    writeStorage(VIEW_KEY, mode);
  }

  function setSortMode(mode: ColorDictionarySortMode) {
    if (sortMode.value === mode) {
      return;
    }
    sortMode.value = mode;
    writeStorage(SORT_KEY, mode);
  }

  function setSelectedId(id: number | null) {
    if (selectedId.value === id) {
      return;
    }
    selectedId.value = id;
    writeStorage(SELECTED_KEY, id == null ? null : String(id));
  }

  function syncSelection(ids: readonly number[]) {
    if (!ids.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId.value != null && ids.includes(selectedId.value)) {
      return;
    }
    setSelectedId(ids[0]);
  }

  return {
    viewMode,
    sortMode,
    selectedId,
    setViewMode,
    setSortMode,
    setSelectedId,
    syncSelection,
  };
});
