import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/services/customColors', () => ({
  fetchCustomColors: vi.fn(),
  createCustomColor: vi.fn(),
  updateCustomColor: vi.fn(),
  deleteCustomColor: vi.fn(),
  fetchCustomColorHistory: vi.fn(),
}));

import {
  fetchCustomColors,
  createCustomColor,
  updateCustomColor,
  deleteCustomColor,
  fetchCustomColorHistory,
} from '@/services/customColors';
import { useCustomColorStore } from '@/stores/customColors';
import type { CustomColor } from '@/models/customColor';

const mockColors: CustomColor[] = [
  {
    id: 1,
    category_id: 10,
    category_name: 'Blue',
    category_code: 'BL',
    color_code: 'BL001',
    image_path: null,
    formula: 'Ultramarine 2g TitaniumWhite 1g',
    applicable_layers: null,
    rgb_r: 10,
    rgb_g: 20,
    rgb_b: 30,
    cmyk_c: null,
    cmyk_m: null,
    cmyk_y: null,
    cmyk_k: null,
    hex_color: '#112233',
    pantone_coated: null,
    pantone_uncoated: null,
    pure_rgb_r: null,
    pure_rgb_g: null,
    pure_rgb_b: null,
    pure_hex_color: null,
    pure_generated_at: null,
    created_at: '2025-10-01T00:00:00.000Z',
    updated_at: '2025-10-02T00:00:00.000Z',
    version: 1,
  },
];

describe('useCustomColorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(fetchCustomColors).mockResolvedValue([...mockColors]);
    vi.mocked(createCustomColor).mockResolvedValue({
      ...mockColors[0],
      id: 2,
      color_code: 'BL002',
    });
    vi.mocked(updateCustomColor).mockImplementation(async (_id, _payload) => ({
      ...mockColors[0],
      color_code: 'BL001-UPDATED',
      updated_at: new Date().toISOString(),
      version: mockColors[0].version + 1,
    }));
    vi.mocked(deleteCustomColor).mockResolvedValue();
    vi.mocked(fetchCustomColorHistory).mockResolvedValue([
      {
        id: 1,
        custom_color_id: 1,
        color_code: 'BL001',
        image_path: null,
        formula: 'Ultramarine 2g TitaniumWhite 1g',
        applicable_layers: null,
        pure_rgb_r: null,
        pure_rgb_g: null,
        pure_rgb_b: null,
        pure_hex_color: null,
        archived_at: '2025-09-30T00:00:00.000Z',
      },
    ]);
  });

  it('loads custom colors into state', async () => {
    const store = useCustomColorStore();

    await store.loadAll();

    expect(store.items).toHaveLength(1);
    expect(fetchCustomColors).toHaveBeenCalledTimes(1);
  });

  it('creates a new custom color', async () => {
    const store = useCustomColorStore();
    await store.loadAll();

    const created = await store.addColor({ color_code: 'BL002' });

    expect(createCustomColor).toHaveBeenCalled();
    expect(store.items[0].id).toBe(created.id);
  });

  it('updates an existing custom color', async () => {
    const store = useCustomColorStore();
    await store.loadAll();

    const updated = await store.editColor(1, { color_code: 'BL001-UPDATED' });

    expect(updateCustomColor).toHaveBeenCalledWith(1, { color_code: 'BL001-UPDATED' });
    expect(store.items[0].color_code).toBe(updated.color_code);
  });

  it('removes a custom color from the list', async () => {
    const store = useCustomColorStore();
    await store.loadAll();

    await store.removeColor(1);

    expect(deleteCustomColor).toHaveBeenCalledWith(1);
    expect(store.items).toHaveLength(0);
  });

  it('caches history responses by id', async () => {
    const store = useCustomColorStore();
    await store.loadAll();

    const first = await store.loadHistory(1);
    const second = await store.loadHistory(1);

    expect(fetchCustomColorHistory).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });
});
