import { computed, ref } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type {
  Artwork,
  ArtworkScheme,
  ArtworkSchemeLayer,
  ArtworkSchemeLayerInput,
} from '@/models/artwork';
import { useArtworkStore } from '@/stores/artworks';
import { message } from '@/utils/message';
import { useCustomColorStore } from '@/stores/customColors';
import { useMaterialsStore } from '@/stores/materials';
import {
  buildIngredientIndex,
  suggestIngredients,
  type IngredientSuggestion,
} from '@/features/formula/ingredientSuggester';
import { tokenizeFormula } from '@/features/formula/matcher';
import {
  formulaUnitBuckets,
  hashFormulaIngredients,
  splitFormulaSegments,
} from '@/utils/formula';
import type { FormulaDraftChange } from '@/components/formula/types';
import type { FormulaIngredient } from '@/models/formula';

function normalizeManualFormula(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed;
}

function cloneLayer(layer: EditableSchemeLayer): EditableSchemeLayer {
  return {
    layer: layer.layer,
    colorCode: layer.colorCode,
    customColorId: layer.customColorId,
    manualFormula: layer.manualFormula,
    manualTokens: [...layer.manualTokens],
    manualHash: layer.manualHash,
    manualSegments: [...layer.manualSegments],
    manualUnits: [...layer.manualUnits],
    referencedFormula: layer.referencedFormula,
  };
}

function buildSnapshot(name: string, layerList: EditableSchemeLayer[]) {
  return JSON.stringify({
    name: name.trim(),
    layers: layerList
      .map((layer) => ({
        layer: layer.layer,
        colorCode: layer.colorCode ?? null,
        customColorId: layer.customColorId ?? null,
        manualFormula: normalizeManualFormula(layer.manualFormula),
      }))
      .sort((a, b) => a.layer - b.layer),
  });
}

const MANUAL_INGREDIENT_SEEDS = [
  { name: '钛白粉', unit: 'g', weight: 2 },
  { name: '群青', unit: 'g' },
  { name: '朱红', unit: 'g' },
  { name: '镉黄', unit: 'g' },
  '水粉白',
  '熟褐',
] as const;

function buildManualDetails(value: string): {
  manualFormula: string;
  manualTokens: FormulaIngredient[];
  manualHash: string | null;
  manualSegments: string[];
  manualUnits: string[];
} {
  const manualFormula = normalizeManualFormula(value);
  const tokens = tokenizeFormula(manualFormula);
  const hash = tokens.length ? hashFormulaIngredients(tokens) : null;
  const segments = splitFormulaSegments(manualFormula);
  const units = formulaUnitBuckets(tokens);

  return {
    manualFormula,
    manualTokens: tokens,
    manualHash: hash,
    manualSegments: segments,
    manualUnits: units,
  };
}

export interface EditableSchemeLayer {
  layer: number;
  colorCode: string | null;
  customColorId: number | null;
  manualFormula: string;
  manualTokens: FormulaIngredient[];
  manualHash: string | null;
  manualSegments: string[];
  manualUnits: string[];
  referencedFormula: string | null;
}

export interface SchemeDialogBindings {
  isOpen: Ref<boolean>;
  isSaving: Ref<boolean>;
  form: {
    name: Ref<string>;
  };
  layers: Ref<EditableSchemeLayer[]>;
  activeArtwork: ComputedRef<Artwork | null>;
  activeScheme: ComputedRef<ArtworkScheme | null>;
  dialogTitle: ComputedRef<string>;
  hasChanges: ComputedRef<boolean>;
  canSave: ComputedRef<boolean>;
  open: (artwork: Artwork, scheme: ArtworkScheme) => void;
  close: () => void;
  resetForm: () => void;
  updateManualFormula: (index: number, draft: FormulaDraftChange) => void;
  save: () => Promise<void>;
  ingredientSuggestionsLoading: Ref<boolean>;
  ingredientSuggestionsReady: Ref<boolean>;
  fetchIngredientSuggestions: (query: string) => Promise<IngredientSuggestion[]>;
}

export function useSchemeDialog(): SchemeDialogBindings {
  const store = useArtworkStore();
  const customColorStore = useCustomColorStore();
  const materialsStore = useMaterialsStore();

  const isOpen = ref(false);
  const isSaving = ref(false);

  const activeArtworkRef = ref<Artwork | null>(null);
  const activeSchemeRef = ref<ArtworkScheme | null>(null);

  const form = {
    name: ref<string>(''),
  };

  const layers = ref<EditableSchemeLayer[]>([]);
  const originalData = ref<{ name: string; layers: EditableSchemeLayer[] } | null>(null);

  const activeArtwork = computed(() => activeArtworkRef.value);
  const activeScheme = computed(() => activeSchemeRef.value);

  const dialogTitle = computed(() => {
    if (!activeArtworkRef.value || !activeSchemeRef.value) {
      return '编辑配色方案';
    }
    return `${activeArtworkRef.value.name} · ${activeSchemeRef.value.name}`;
  });

  const originalSnapshot = ref<string>('');

  const hasChanges = computed(() => {
    if (!originalData.value) {
      return false;
    }
    return buildSnapshot(form.name.value, layers.value) !== originalSnapshot.value;
  });

  const canSave = computed(() => hasChanges.value && !isSaving.value);

  function open(artwork: Artwork, scheme: ArtworkScheme) {
    activeArtworkRef.value = artwork;
    activeSchemeRef.value = scheme;
    form.name.value = scheme.name;
    const mappedLayers = [...scheme.layers]
      .sort((a, b) => a.layer - b.layer)
      .map<EditableSchemeLayer>((layer: ArtworkSchemeLayer) => ({
        layer: layer.layer,
        colorCode: layer.colorCode ?? null,
        customColorId: layer.custom_color_id ?? null,
        ...buildManualDetails(layer.manualFormula ?? layer.formula),
        referencedFormula: layer.formula ?? null,
      }));
    layers.value = mappedLayers.map((layer) => cloneLayer(layer));
    originalData.value = {
      name: scheme.name,
      layers: mappedLayers.map((layer) => cloneLayer(layer)),
    };
    originalSnapshot.value = buildSnapshot(scheme.name, mappedLayers);
    isOpen.value = true;
    void ensureIngredientSources();
  }

  function resetForm() {
    if (!originalData.value) {
      return;
    }
    form.name.value = originalData.value.name;
    layers.value = originalData.value.layers.map((layer) => cloneLayer(layer));
  }

  function close() {
    isOpen.value = false;
    isSaving.value = false;
    activeArtworkRef.value = null;
    activeSchemeRef.value = null;
    form.name.value = '';
    layers.value = [];
    originalData.value = null;
    originalSnapshot.value = '';
  }

  function updateManualFormula(index: number, draft: FormulaDraftChange) {
    if (!layers.value[index]) {
      return;
    }
    const normalized = normalizeManualFormula(draft.value);
    const tokens = draft.tokens && draft.tokens.length ? draft.tokens : tokenizeFormula(normalized);
    const hash =
      draft.hash !== undefined ? draft.hash : tokens.length ? hashFormulaIngredients(tokens) : null;
    const segments =
      draft.segments && draft.segments.length ? draft.segments : splitFormulaSegments(normalized);
    const units =
      draft.units && draft.units.length ? draft.units : formulaUnitBuckets(tokens);
    layers.value[index] = {
      ...layers.value[index],
      manualFormula: normalized,
      manualTokens: tokens,
      manualHash: hash,
      manualSegments: segments,
      manualUnits: units,
    };
  }

  async function save() {
    if (!activeArtworkRef.value || !activeSchemeRef.value) {
      return;
    }
    if (!hasChanges.value) {
      message.info('配色方案未发生变化。');
      return;
    }
    const name = form.name.value.trim();
    if (!name) {
      message.warning('方案名称不能为空');
      return;
    }
    isSaving.value = true;
    try {
      const payloadLayers: ArtworkSchemeLayerInput[] = layers.value.map((layer) => ({
        layer: layer.layer,
        colorCode: layer.colorCode,
        custom_color_id: layer.customColorId ?? undefined,
        manualFormula: normalizeManualFormula(layer.manualFormula) || null,
      }));

      await store.editScheme(activeArtworkRef.value.id, activeSchemeRef.value.id, {
        name,
        layers: payloadLayers,
        existingThumbnailPath: activeSchemeRef.value.thumbnail_path ?? null,
        existingInitialThumbnailPath: activeSchemeRef.value.initial_thumbnail_path ?? null,
      });

      message.success('配色方案已更新');
      close();
    } catch (error) {
      const description = error instanceof Error ? error.message : '更新配色方案失败';
      message.error(description);
    } finally {
      isSaving.value = false;
    }
  }

  const ingredientSuggestionsLoading = ref(false);
  const ingredientSuggestionsReady = ref(false);

  async function ensureIngredientSources() {
    if (ingredientSuggestionsReady.value || ingredientSuggestionsLoading.value) {
      return;
    }
    ingredientSuggestionsLoading.value = true;
    try {
      const tasks: Promise<unknown>[] = [];
      if (!customColorStore.items.length) {
        tasks.push(customColorStore.loadAll());
      }
      if (!materialsStore.items.length) {
        tasks.push(materialsStore.loadMaterials());
      }
      if (tasks.length) {
        await Promise.all(tasks);
      }
      ingredientSuggestionsReady.value =
        customColorStore.items.length > 0 || materialsStore.items.length > 0;
    } catch (error) {
      ingredientSuggestionsReady.value = false;
      const description = error instanceof Error ? error.message : '加载配方建议失败';
      message.warning(description);
    } finally {
      ingredientSuggestionsLoading.value = false;
    }
  }

  const ingredientIndex = computed(() =>
    buildIngredientIndex(
      {
        customColors: customColorStore.items,
        rawMaterials: materialsStore.items,
        manualSeeds: MANUAL_INGREDIENT_SEEDS,
      },
      {
        defaultLimit: 10,
      },
    ),
  );

  async function fetchIngredientSuggestions(query: string) {
    if (!ingredientSuggestionsReady.value) {
      await ensureIngredientSources();
    }
    if (!ingredientSuggestionsReady.value) {
      return [];
    }
    return suggestIngredients(ingredientIndex.value, query || '', 10);
  }

  return {
    isOpen,
    isSaving,
    form,
    layers,
    activeArtwork,
    activeScheme,
    dialogTitle,
    hasChanges,
    canSave,
    open,
    close,
    resetForm,
    updateManualFormula,
    save,
    ingredientSuggestionsLoading,
    ingredientSuggestionsReady,
    fetchIngredientSuggestions,
  };
}
