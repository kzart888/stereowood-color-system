import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  CustomColor,
  CustomColorCreatePayload,
  CustomColorHistoryEntry,
  CustomColorUpdatePayload,
} from '@/models/customColor';
import {
  createCustomColor,
  deleteCustomColor,
  fetchCustomColorHistory,
  fetchCustomColors,
  updateCustomColor,
} from '@/services/customColors';

export const useCustomColorStore = defineStore('customColors', () => {
  const items = ref<CustomColor[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const historyById = ref<Record<number, CustomColorHistoryEntry[]>>({});
  const historyLoading = ref<Record<number, boolean>>({});

  async function loadAll() {
    loading.value = true;
    error.value = null;
    try {
      items.value = await fetchCustomColors();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载自配色时发生错误';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function addColor(payload: CustomColorCreatePayload) {
    const created = await createCustomColor(payload);
    items.value = [created, ...items.value];
    return created;
  }

  async function editColor(id: number, payload: CustomColorUpdatePayload) {
    const updated = await updateCustomColor(id, payload);
    items.value = items.value.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async function removeColor(id: number) {
    await deleteCustomColor(id);
    items.value = items.value.filter((item) => item.id !== id);
    const histories = { ...historyById.value };
    delete histories[id];
    historyById.value = histories;
  }

  async function loadHistory(id: number, force = false) {
    if (!force && historyById.value[id]) {
      return historyById.value[id];
    }
    historyLoading.value = { ...historyLoading.value, [id]: true };
    try {
      const history = await fetchCustomColorHistory(id);
      historyById.value = { ...historyById.value, [id]: history };
      historyLoading.value = { ...historyLoading.value, [id]: false };
      return history;
    } finally {
      historyLoading.value = { ...historyLoading.value, [id]: false };
    }
  }

  return {
    items,
    loading,
    error,
    historyById,
    historyLoading,
    loadAll,
    addColor,
    editColor,
    removeColor,
    loadHistory,
  };
});
