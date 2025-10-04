import { ref } from 'vue';
import type { Ref } from 'vue';
import type { PureColorComputationResult, PureColorComputeOptions } from '@/features/pure-color';
import { computeAverageColor } from '@/features/pure-color';

export interface UsePureColorState {
  isComputing: Ref<boolean>;
  lastResult: Ref<PureColorComputationResult | null>;
  lastError: Ref<string | null>;
  compute: (
    file: File,
    options?: PureColorComputeOptions,
  ) => Promise<PureColorComputationResult | null>;
  reset: () => void;
}

export function usePureColorAdapter(): UsePureColorState {
  const isComputing = ref(false);
  const lastResult = ref<PureColorComputationResult | null>(null);
  const lastError = ref<string | null>(null);

  async function compute(file: File, options?: PureColorComputeOptions) {
    lastError.value = null;
    isComputing.value = true;
    try {
      const result = await computeAverageColor(file, options);
      lastResult.value = result;
      return result;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '未知错误';
      lastResult.value = null;
      return null;
    } finally {
      isComputing.value = false;
    }
  }

  function reset() {
    lastError.value = null;
    lastResult.value = null;
  }

  return {
    isComputing,
    lastResult,
    lastError,
    compute,
    reset,
  };
}
