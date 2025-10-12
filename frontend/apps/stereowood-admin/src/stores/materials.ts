import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  MontMarteMaterial,
  MontMarteMaterialCreatePayload,
  MontMarteMaterialUpdatePayload,
  MontMarteCategory,
  Supplier,
  PurchaseLink,
} from '@/models/material';
import {
  fetchMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  fetchMontMarteCategories,
  fetchSuppliers,
  fetchPurchaseLinks,
  upsertSupplier,
  upsertPurchaseLink,
  deleteSupplier,
} from '@/services/materials';

export const useMaterialsStore = defineStore('materials', () => {
  const items = ref<MontMarteMaterial[]>([]);
  const categories = ref<MontMarteCategory[]>([]);
  const suppliers = ref<Supplier[]>([]);
  const purchaseLinks = ref<PurchaseLink[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadMaterials() {
    loading.value = true;
    error.value = null;
    try {
      items.value = await fetchMaterials();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载原料时发生错误';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadDictionaries() {
    const [cat, supp, links] = await Promise.all([
      fetchMontMarteCategories(),
      fetchSuppliers(),
      fetchPurchaseLinks(),
    ]);
    categories.value = cat;
    suppliers.value = supp;
    purchaseLinks.value = links;
  }

  async function addMaterial(payload: MontMarteMaterialCreatePayload) {
    const created = await createMaterial(payload);
    items.value = [created, ...items.value];
    return created;
  }

  async function editMaterial(id: number, payload: MontMarteMaterialUpdatePayload) {
    const updated = await updateMaterial(id, payload);
    items.value = items.value.map((item) => (item.id === id ? { ...item, ...updated } : item));
    return updated;
  }

  async function removeMaterial(id: number) {
    await deleteMaterial(id);
    items.value = items.value.filter((item) => item.id !== id);
  }

  async function ensureSupplier(name: string) {
    const result = await upsertSupplier(name);
    suppliers.value = [...suppliers.value.filter((s) => s.id !== result.id), result].sort((a, b) =>
      a.name.localeCompare(b.name, 'zh-CN'),
    );
    return result;
  }

  async function removeSupplier(id: number) {
    await deleteSupplier(id);
    suppliers.value = suppliers.value.filter((item) => item.id !== id);
  }

  async function ensurePurchaseLink(url: string) {
    const result = await upsertPurchaseLink(url);
    purchaseLinks.value = [
      ...purchaseLinks.value.filter((link) => link.id !== result.id),
      result,
    ].sort((a, b) => a.url.localeCompare(b.url));
    return result;
  }

  return {
    items,
    categories,
    suppliers,
    purchaseLinks,
    loading,
    error,
    loadMaterials,
    loadDictionaries,
    addMaterial,
    editMaterial,
    removeMaterial,
    ensureSupplier,
    removeSupplier,
    ensurePurchaseLink,
  };
});
