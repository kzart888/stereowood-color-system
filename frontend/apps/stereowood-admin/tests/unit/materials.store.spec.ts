import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/services/materials', () => ({
  fetchMaterials: vi.fn(),
  fetchMontMarteCategories: vi.fn(),
  fetchSuppliers: vi.fn(),
  fetchPurchaseLinks: vi.fn(),
  createMaterial: vi.fn(),
  updateMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
  upsertSupplier: vi.fn(),
  deleteSupplier: vi.fn(),
  upsertPurchaseLink: vi.fn(),
}));

import {
  fetchMaterials,
  fetchMontMarteCategories,
  fetchSuppliers,
  fetchPurchaseLinks,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  upsertSupplier,
  deleteSupplier,
  upsertPurchaseLink,
} from '@/services/materials';
import { useMaterialsStore } from '@/stores/materials';
import type { MontMarteMaterial, MontMarteCategory, Supplier, PurchaseLink } from '@/models/material';

const materials: MontMarteMaterial[] = [
  {
    id: 1,
    name: 'Titanium White',
    image_path: null,
    category: 'white',
    category_id: 2,
    category_name: '基础白',
    category_code: 'WB',
    supplier_id: 3,
    supplier_name: 'Art Supplier',
    purchase_link_id: 4,
    purchase_link_url: 'https://example.com',
    created_at: '2025-10-01T00:00:00.000Z',
    updated_at: '2025-10-02T00:00:00.000Z',
  },
];

const categories: MontMarteCategory[] = [
  { id: 1, code: 'WB', name: '水性漆', display_order: 1, created_at: '', updated_at: '' },
];

const suppliers: Supplier[] = [
  { id: 1, name: 'Art Supplier' },
];

const links: PurchaseLink[] = [
  { id: 1, url: 'https://example.com' },
];

describe('useMaterialsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    vi.mocked(fetchMaterials).mockResolvedValue([...materials]);
    vi.mocked(fetchMontMarteCategories).mockResolvedValue([...categories]);
    vi.mocked(fetchSuppliers).mockResolvedValue([...suppliers]);
    vi.mocked(fetchPurchaseLinks).mockResolvedValue([...links]);
    vi.mocked(createMaterial).mockResolvedValue({
      ...materials[0],
      id: 2,
      name: 'Cadmium Yellow',
    });
    vi.mocked(updateMaterial).mockResolvedValue({
      ...materials[0],
      name: 'Titanium White Updated',
    });
    vi.mocked(deleteMaterial).mockResolvedValue({ success: true });
    vi.mocked(upsertSupplier).mockResolvedValue({ id: 2, name: 'New Supplier' });
    vi.mocked(deleteSupplier).mockResolvedValue({ deleted: true });
    vi.mocked(upsertPurchaseLink).mockResolvedValue({ id: 2, url: 'https://new.example.com' });
  });

  it('loads materials', async () => {
    const store = useMaterialsStore();
    await store.loadMaterials();
    expect(fetchMaterials).toHaveBeenCalled();
    expect(store.items).toHaveLength(1);
  });

  it('loads dictionaries', async () => {
    const store = useMaterialsStore();
    await store.loadDictionaries();
    expect(fetchMontMarteCategories).toHaveBeenCalled();
    expect(fetchSuppliers).toHaveBeenCalled();
    expect(fetchPurchaseLinks).toHaveBeenCalled();
    expect(store.categories).toHaveLength(1);
    expect(store.suppliers).toHaveLength(1);
    expect(store.purchaseLinks).toHaveLength(1);
  });

  it('creates a material', async () => {
    const store = useMaterialsStore();
    await store.loadMaterials();
    const created = await store.addMaterial({ name: 'Cadmium Yellow' });
    expect(createMaterial).toHaveBeenCalledWith({ name: 'Cadmium Yellow' });
    expect(store.items[0].id).toBe(created.id);
  });

  it('updates a material', async () => {
    const store = useMaterialsStore();
    await store.loadMaterials();
    const updated = await store.editMaterial(1, { name: 'Titanium White Updated' });
    expect(updateMaterial).toHaveBeenCalled();
    expect(store.items[0].name).toBe(updated.name);
  });

  it('deletes a material', async () => {
    const store = useMaterialsStore();
    await store.loadMaterials();
    await store.removeMaterial(1);
    expect(deleteMaterial).toHaveBeenCalledWith(1);
    expect(store.items).toHaveLength(0);
  });

  it('upserts supplier into cache', async () => {
    const store = useMaterialsStore();
    await store.loadDictionaries();
    const supplier = await store.ensureSupplier('New Supplier');
    expect(upsertSupplier).toHaveBeenCalledWith('New Supplier');
    expect(store.suppliers.some((s) => s.id === supplier.id)).toBe(true);
  });

  it('removes supplier from cache', async () => {
    const store = useMaterialsStore();
    await store.loadDictionaries();
    await store.removeSupplier(1);
    expect(deleteSupplier).toHaveBeenCalledWith(1);
    expect(store.suppliers).toHaveLength(0);
  });

  it('upserts purchase link into cache', async () => {
    const store = useMaterialsStore();
    await store.loadDictionaries();
    const link = await store.ensurePurchaseLink('https://new.example.com');
    expect(upsertPurchaseLink).toHaveBeenCalledWith('https://new.example.com');
    expect(store.purchaseLinks.some((item) => item.id === link.id)).toBe(true);
  });
});
