import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';
import type { Artwork, ArtworkScheme } from '@/models/artwork';
import { useSchemeDialog } from '@/features/artworks/useSchemeDialog';

const {
  editSchemeMock,
  messageSuccessMock,
  messageInfoMock,
  messageWarningMock,
  loadCustomColorsMock,
  loadMaterialsMock,
} = vi.hoisted(() => ({
  editSchemeMock: vi.fn(),
  messageSuccessMock: vi.fn(),
  messageInfoMock: vi.fn(),
  messageWarningMock: vi.fn(),
  loadCustomColorsMock: vi.fn().mockResolvedValue(undefined),
  loadMaterialsMock: vi.fn().mockResolvedValue(undefined),
}));

const customColorItems = ref([]);
const materialItems = ref([]);

vi.mock('@/stores/artworks', () => ({
  useArtworkStore: () => ({
    editScheme: editSchemeMock,
  }),
}));

vi.mock('@/stores/customColors', () => ({
  useCustomColorStore: () =>
    reactive({
      items: customColorItems,
      loadAll: loadCustomColorsMock,
    }),
}));

vi.mock('@/stores/materials', () => ({
  useMaterialsStore: () =>
    reactive({
      items: materialItems,
      loadMaterials: loadMaterialsMock,
    }),
}));

vi.mock('@/utils/message', () => ({
  message: {
    success: messageSuccessMock,
    error: vi.fn(),
    warning: messageWarningMock,
    info: messageInfoMock,
  },
}));

const artwork: Artwork = {
  id: 1,
  code: 'A-001',
  name: '测试作品',
  created_at: '2025-10-05',
  updated_at: '2025-10-05',
  schemes: [],
};

const scheme: ArtworkScheme = {
  id: 10,
  name: '初始方案',
  thumbnail_path: null,
  initial_thumbnail_path: null,
  created_at: '2025-10-05',
  updated_at: '2025-10-05',
  layers: [
    {
      layer: 1,
      colorCode: 'YE001',
      custom_color_id: 42,
      formula: '朱红 10g 钛白 5g',
      manualFormula: null,
    },
    {
      layer: 2,
      colorCode: null,
      custom_color_id: null,
      formula: null,
      manualFormula: '已有手动记录',
    },
  ],
};

describe('useSchemeDialog', () => {
  beforeEach(() => {
    editSchemeMock.mockReset();
    messageSuccessMock.mockReset();
    messageInfoMock.mockReset();
    messageWarningMock.mockReset();
    loadCustomColorsMock.mockReset();
    loadMaterialsMock.mockReset();
    customColorItems.value = [];
    materialItems.value = [];
  });

  it('initialises state when opening a scheme', () => {
    const dialog = useSchemeDialog();
    dialog.open(artwork, scheme);

    expect(dialog.isOpen.value).toBe(true);
    expect(dialog.form.name.value).toBe('初始方案');
    expect(dialog.layers.value).toHaveLength(2);
    expect(dialog.layers.value[0].manualFormula).toBe('朱红 10g 钛白 5g');
    expect(dialog.layers.value[1].manualFormula).toBe('已有手动记录');
    expect(dialog.layers.value[0].candidateMatches).toEqual([]);
    expect(dialog.hasChanges.value).toBe(false);
  });

  it('trims manual formulas and calls store on save', async () => {
    editSchemeMock.mockResolvedValueOnce(undefined);
    const dialog = useSchemeDialog();
    dialog.open(artwork, scheme);
    dialog.updateManualFormula(0, {
      value: '  新配方  ',
      tokens: [],
      hash: null,
      segments: [],
      units: [],
    });

    expect(dialog.hasChanges.value).toBe(true);

    await dialog.save();

    expect(editSchemeMock).toHaveBeenCalledTimes(1);
    const [, , payload] = editSchemeMock.mock.calls[0];
    expect(payload.name).toBe('初始方案');
    expect(payload.layers[0]).toMatchObject({
      layer: 1,
      manualFormula: '新配方',
    });
    expect(payload.layers[1]).toMatchObject({
      layer: 2,
      manualFormula: '已有手动记录',
    });
    expect(messageSuccessMock).toHaveBeenCalled();
    expect(dialog.isOpen.value).toBe(false);
  });

  it('avoids saving when no changes detected', async () => {
    const dialog = useSchemeDialog();
    dialog.open(artwork, scheme);
    await dialog.save();

    expect(editSchemeMock).not.toHaveBeenCalled();
    expect(messageInfoMock).toHaveBeenCalled();
    expect(dialog.isOpen.value).toBe(true);
  });

  it('applies candidate matches to a layer', async () => {
    customColorItems.value = [
      {
        id: 42,
        category_id: null,
        category_name: null,
        category_code: null,
        color_code: 'YE001',
        image_path: null,
        formula: '朱红 10g 钛白 5g',
        applicable_layers: null,
        rgb_r: null,
        rgb_g: null,
        rgb_b: null,
        cmyk_c: null,
        cmyk_m: null,
        cmyk_y: null,
        cmyk_k: null,
        hex_color: null,
        pantone_coated: null,
        pantone_uncoated: null,
        pure_rgb_r: null,
        pure_rgb_g: null,
        pure_rgb_b: null,
        pure_hex_color: null,
        pure_generated_at: null,
        created_at: '2025-10-05',
        updated_at: '2025-10-05',
        version: 1,
      },
    ];

    const dialog = useSchemeDialog();
    dialog.open(artwork, scheme);
    await nextTick();

    expect(dialog.layers.value[0].candidateMatches).toHaveLength(1);

    const candidate = dialog.layers.value[0].candidateMatches[0];

    dialog.clearCandidate(0);
    expect(messageInfoMock).toHaveBeenCalled();
    await nextTick();
    expect(dialog.layers.value[0].colorCode).toBeNull();

    dialog.applyCandidate(0, candidate);
    await nextTick();
    expect(dialog.layers.value[0].colorCode).toBe('YE001');
    expect(dialog.layers.value[0].customColorId).toBe(42);
    expect(messageSuccessMock).toHaveBeenCalled();
  });
});
