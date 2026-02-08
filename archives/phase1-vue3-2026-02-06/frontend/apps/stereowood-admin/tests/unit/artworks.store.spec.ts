import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/services/artworks', () => ({
  fetchArtworks: vi.fn(),
  createArtwork: vi.fn(),
  updateArtwork: vi.fn(),
  deleteArtwork: vi.fn(),
  createArtworkScheme: vi.fn(),
  updateArtworkScheme: vi.fn(),
  deleteArtworkScheme: vi.fn(),
}));

import {
  fetchArtworks,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  createArtworkScheme,
  updateArtworkScheme,
  deleteArtworkScheme,
} from '@/services/artworks';
import { useArtworkStore } from '@/stores/artworks';
import type { Artwork } from '@/models/artwork';

const mockArtworks: Artwork[] = [
  {
    id: 1,
    code: 'AW001',
    name: 'Sunrise',
    created_at: '2025-10-01T00:00:00.000Z',
    updated_at: '2025-10-01T00:00:00.000Z',
    schemes: [
      {
        id: 11,
        name: 'Default',
        thumbnail_path: null,
        initial_thumbnail_path: null,
        created_at: '2025-10-01T00:00:00.000Z',
        updated_at: '2025-10-01T00:00:00.000Z',
        layers: [
          { layer: 1, colorCode: 'BL001', custom_color_id: 5, formula: null },
        ],
      },
    ],
  },
];

describe('useArtworkStore', () => {
beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
    vi.mocked(fetchArtworks).mockResolvedValue([...mockArtworks]);
    vi.mocked(createArtwork).mockResolvedValue({
      ...mockArtworks[0],
      id: 2,
      code: 'AW002',
      name: 'Sunset',
      schemes: [],
    });
    vi.mocked(updateArtwork).mockImplementation(async (id, payload) => ({
      ...mockArtworks[0],
      id,
      ...payload,
      schemes: mockArtworks[0].schemes,
    }));
    vi.mocked(deleteArtwork).mockResolvedValue({ success: true, deletedId: 1 });
    vi.mocked(createArtworkScheme).mockResolvedValue(mockArtworks[0]);
    vi.mocked(updateArtworkScheme).mockResolvedValue({ success: true });
    vi.mocked(deleteArtworkScheme).mockResolvedValue({ success: true, deletedId: 11 });
  });

  it('loads artworks', async () => {
    const store = useArtworkStore();
    await store.loadAll();
    expect(fetchArtworks).toHaveBeenCalledTimes(1);
    expect(store.items).toHaveLength(1);
  });

  it('adds an artwork', async () => {
    const store = useArtworkStore();
    await store.loadAll();
    const created = await store.addArtwork({ code: 'AW002', name: 'Sunset' });
    expect(createArtwork).toHaveBeenCalledWith({ code: 'AW002', name: 'Sunset' });
    expect(store.items[0].id).toBe(created.id);
  });

  it('updates an artwork', async () => {
    const store = useArtworkStore();
    await store.loadAll();
    const updated = await store.editArtwork(1, { code: 'AW001', name: 'Dawn' });
    expect(updateArtwork).toHaveBeenCalledWith(1, { code: 'AW001', name: 'Dawn' });
    expect(store.items[0].name).toBe(updated.name);
  });

  it('removes an artwork', async () => {
    const store = useArtworkStore();
    await store.loadAll();
    await store.removeArtwork(1);
    expect(deleteArtwork).toHaveBeenCalledWith(1);
    expect(store.items).toHaveLength(0);
  });

  it('creates a scheme and reloads artworks', async () => {
    const store = useArtworkStore();
    await store.loadAll();
    vi.mocked(fetchArtworks).mockResolvedValueOnce([
      { ...mockArtworks[0], schemes: [...mockArtworks[0].schemes, { ...mockArtworks[0].schemes[0], id: 12 }] },
    ]);
    await store.createScheme(1, { name: 'Alt', layers: [] });
    expect(createArtworkScheme).toHaveBeenCalled();
    expect(fetchArtworks).toHaveBeenCalledTimes(2);
  });

  it('updates a scheme and reloads artworks', async () => {
    const store = useArtworkStore();
    await store.loadAll();
    vi.mocked(fetchArtworks).mockResolvedValueOnce(mockArtworks);
    await store.editScheme(1, 11, { name: 'Updated', layers: [] });
    expect(updateArtworkScheme).toHaveBeenCalled();
    expect(fetchArtworks).toHaveBeenCalledTimes(2);
  });

  it('deletes a scheme and reloads artworks', async () => {
    const store = useArtworkStore();
    await store.loadAll();
    vi.mocked(fetchArtworks).mockResolvedValueOnce([
      { ...mockArtworks[0], schemes: [] },
    ]);
    await store.removeScheme(1, 11);
    expect(deleteArtworkScheme).toHaveBeenCalledWith(1, 11);
    expect(fetchArtworks).toHaveBeenCalledTimes(2);
  });
});
