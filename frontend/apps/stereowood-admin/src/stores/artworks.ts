import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  Artwork,
  ArtworkCreatePayload,
  ArtworkSchemeCreatePayload,
  ArtworkSchemeUpdatePayload,
  ArtworkUpdatePayload,
} from '@/models/artwork';
import {
  fetchArtworks,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  createArtworkScheme,
  updateArtworkScheme,
  deleteArtworkScheme,
} from '@/services/artworks';

export const useArtworkStore = defineStore('artworks', () => {
  const items = ref<Artwork[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadAll() {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetchArtworks();
      if (!Array.isArray(response)) {
        throw new Error('无效的作品数据响应');
      }
      items.value = response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载作品时发生错误';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function addArtwork(payload: ArtworkCreatePayload) {
    const created = await createArtwork(payload);
    items.value = [created, ...items.value];
    return created;
  }

  async function editArtwork(id: number, payload: ArtworkUpdatePayload) {
    const updated = await updateArtwork(id, payload);
    items.value = items.value.map((item) => (item.id === id ? { ...item, ...updated } : item));
    return updated;
  }

  async function removeArtwork(id: number) {
    await deleteArtwork(id);
    items.value = items.value.filter((item) => item.id !== id);
  }

  async function createScheme(artworkId: number, payload: ArtworkSchemeCreatePayload) {
    await createArtworkScheme(artworkId, payload);
    await loadAll();
  }

  async function editScheme(
    artworkId: number,
    schemeId: number,
    payload: ArtworkSchemeUpdatePayload,
  ) {
    await updateArtworkScheme(artworkId, schemeId, payload);
    await loadAll();
  }

  async function removeScheme(artworkId: number, schemeId: number) {
    await deleteArtworkScheme(artworkId, schemeId);
    await loadAll();
  }

  return {
    items,
    loading,
    error,
    loadAll,
    addArtwork,
    editArtwork,
    removeArtwork,
    createScheme,
    editScheme,
    removeScheme,
  };
});
