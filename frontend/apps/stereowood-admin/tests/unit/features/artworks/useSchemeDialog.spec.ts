import { beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('@/stores/artworks', () => ({
  useArtworkStore: () => ({
    editScheme: editSchemeMock,
  }),
}));

vi.mock('@/stores/customColors', () => ({
  useCustomColorStore: () => ({
    items: [],
    loadAll: loadCustomColorsMock,
  }),
}));

vi.mock('@/stores/materials', () => ({
  useMaterialsStore: () => ({
    items: [],
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
      formula: '原始配方',
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
  });

  it('initialises state when opening a scheme', () => {
    const dialog = useSchemeDialog();
    dialog.open(artwork, scheme);

    expect(dialog.isOpen.value).toBe(true);
    expect(dialog.form.name.value).toBe('初始方案');
    expect(dialog.layers.value).toHaveLength(2);
    expect(dialog.layers.value[0].manualFormula).toBe('原始配方');
    expect(dialog.layers.value[1].manualFormula).toBe('已有手动记录');
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
});
