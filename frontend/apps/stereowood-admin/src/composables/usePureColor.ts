import { computed, ref } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { computeAverageColor, findPantoneMatches } from '@/features/pure-color';
import type {
  PantoneMatch,
  PureColorComputationResult,
  PureColorComputeOptions,
} from '@/features/pure-color';
import type { PantoneDatasetMode } from './usePantone';
import { usePantoneData } from './usePantone';

export interface PureColorAdapterPantoneOptions {
  enabled?: boolean;
  mode?: PantoneDatasetMode;
  limit?: number;
}

export interface PureColorAdapterOptions {
  pantone?: PureColorAdapterPantoneOptions;
}

export interface UsePureColorState {
  isComputing: Ref<boolean>;
  lastResult: Ref<PureColorComputationResult | null>;
  lastError: Ref<string | null>;
  pantoneMatches: Ref<PantoneMatch[]>;
  pantoneLoading: Ref<boolean>;
  pantoneError: Ref<string | null>;
  pantoneMode: ComputedRef<PantoneDatasetMode>;
  setPantoneMode: (mode: PantoneDatasetMode) => Promise<void>;
  setPantoneLimit: (limit: number) => void;
  compute: (
    file: File,
    options?: PureColorComputeOptions,
  ) => Promise<PureColorComputationResult | null>;
  reset: () => void;
}

export function usePureColorAdapter(options?: PureColorAdapterOptions): UsePureColorState {
  const isComputing = ref(false);
  const lastResult = ref<PureColorComputationResult | null>(null);
  const lastError = ref<string | null>(null);

  const pantoneOptions = options?.pantone ?? {};
  const pantoneEnabled = pantoneOptions.enabled !== false;
  const pantoneLimit = ref(pantoneOptions.limit ?? 5);
  const currentPantoneMode = ref<PantoneDatasetMode>(pantoneOptions.mode ?? 'basic');

  const pantoneMatches = ref<PantoneMatch[]>([]);
  const pantone = usePantoneData();

  async function ensurePantoneData(mode: PantoneDatasetMode) {
    await pantone.load(mode);
  }

  async function updatePantoneMatches() {
    if (!pantoneEnabled || !lastResult.value) {
      pantoneMatches.value = [];
      return;
    }

    const mode = currentPantoneMode.value;
    await ensurePantoneData(mode);

    const dataset = pantone.entries.value;
    pantoneMatches.value = findPantoneMatches(lastResult.value.rgb, {
      dataset,
      limit: pantoneLimit.value,
    });
  }

  async function compute(file: File, computeOptions?: PureColorComputeOptions) {
    lastError.value = null;
    isComputing.value = true;
    try {
      const result = await computeAverageColor(file, computeOptions);
      lastResult.value = result;
      if (pantoneEnabled) {
        await updatePantoneMatches();
      } else {
        pantoneMatches.value = [];
      }
      return result;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '未知错误';
      lastResult.value = null;
      pantoneMatches.value = [];
      return null;
    } finally {
      isComputing.value = false;
    }
  }

  async function setPantoneMode(mode: PantoneDatasetMode) {
    if (currentPantoneMode.value === mode) {
      return;
    }
    currentPantoneMode.value = mode;
    if (pantoneEnabled) {
      await updatePantoneMatches();
    }
  }

  function setPantoneLimit(limit: number) {
    pantoneLimit.value = Math.max(1, Math.floor(limit));
    if (pantoneEnabled && lastResult.value) {
      pantoneMatches.value = findPantoneMatches(lastResult.value.rgb, {
        dataset: pantone.entries.value,
        limit: pantoneLimit.value,
      });
    }
  }

  function reset() {
    lastError.value = null;
    lastResult.value = null;
    pantoneMatches.value = [];
  }

  const pantoneMode = computed(() => currentPantoneMode.value);

  return {
    isComputing,
    lastResult,
    lastError,
    pantoneMatches,
    pantoneLoading: pantone.loading,
    pantoneError: pantone.error,
    pantoneMode,
    setPantoneMode,
    setPantoneLimit,
    compute,
    reset,
  };
}
