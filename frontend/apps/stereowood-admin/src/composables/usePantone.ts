import { computed, ref, shallowRef } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { PANTONE_BASIC_SET } from '@/data/pantone-basic';
import type { PantoneEntry } from '@/data/pantone-basic';
import type { PantoneFullEntry } from '@/data/pantone-full';

export type PantoneDatasetMode = 'basic' | 'full';

type PantoneLikeEntry = PantoneEntry | PantoneFullEntry;

interface PantoneState {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  entries: Ref<PantoneLikeEntry[]>;
  load: (mode: PantoneDatasetMode) => Promise<void>;
  isFullLoaded: ComputedRef<boolean>;
}

let fullCache: PantoneFullEntry[] | null = null;

export function usePantoneData(): PantoneState {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const entries = shallowRef<PantoneLikeEntry[]>([...PANTONE_BASIC_SET]);

  async function load(mode: PantoneDatasetMode) {
    if (mode === 'basic') {
      entries.value = [...PANTONE_BASIC_SET];
      return;
    }

    if (fullCache) {
      entries.value = fullCache;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const module = await import('@/data/pantone-full');
      fullCache = module.PANTONE_FULL_SET as PantoneFullEntry[];
      entries.value = fullCache;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载 Pantone 数据失败';
      entries.value = [...PANTONE_BASIC_SET];
    } finally {
      loading.value = false;
    }
  }

  const isFullLoaded = computed(() => Boolean(fullCache));

  return {
    loading,
    error,
    entries,
    load,
    isFullLoaded,
  };
}
