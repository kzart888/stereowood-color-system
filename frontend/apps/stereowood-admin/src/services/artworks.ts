import { apiClient } from '@/services/http';
import type {
  Artwork,
  ArtworkCreatePayload,
  ArtworkDeletionResponse,
  ArtworkSchemeCreatePayload,
  ArtworkSchemeDeletionResponse,
  ArtworkSchemeUpdatePayload,
  ArtworkUpdatePayload,
} from '@/models/artwork';

function buildSchemeFormData(payload: ArtworkSchemeCreatePayload | ArtworkSchemeUpdatePayload) {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('layers', JSON.stringify(payload.layers ?? []));

  if (payload.thumbnail) {
    formData.append('thumbnail', payload.thumbnail);
  }
  if (payload.initialThumbnail) {
    formData.append('initialThumbnail', payload.initialThumbnail);
  }

  if ('existingThumbnailPath' in payload && payload.existingThumbnailPath !== undefined) {
    formData.append('existingThumbnailPath', payload.existingThumbnailPath ?? '');
  }
  if (
    'existingInitialThumbnailPath' in payload &&
    payload.existingInitialThumbnailPath !== undefined
  ) {
    formData.append('existingInitialThumbnailPath', payload.existingInitialThumbnailPath ?? '');
  }

  return formData;
}

export async function fetchArtworks(): Promise<Artwork[]> {
  const response = await apiClient.get<Artwork[]>('/artworks');
  return response.data;
}

export async function createArtwork(payload: ArtworkCreatePayload): Promise<Artwork> {
  const response = await apiClient.post<Artwork>('/artworks', payload);
  return response.data;
}

export async function updateArtwork(id: number, payload: ArtworkUpdatePayload): Promise<Artwork> {
  const response = await apiClient.put<Artwork>(`/artworks/${id}`, payload);
  return response.data;
}

export async function deleteArtwork(id: number): Promise<ArtworkDeletionResponse> {
  const response = await apiClient.delete<ArtworkDeletionResponse>(`/artworks/${id}`);
  return response.data;
}

export async function createArtworkScheme(
  artworkId: number,
  payload: ArtworkSchemeCreatePayload,
): Promise<Artwork> {
  const formData = buildSchemeFormData(payload);
  const response = await apiClient.post<Artwork>(`/artworks/${artworkId}/schemes`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateArtworkScheme(
  artworkId: number,
  schemeId: number,
  payload: ArtworkSchemeUpdatePayload,
): Promise<{ success: boolean }> {
  const formData = buildSchemeFormData(payload);
  const response = await apiClient.put<{ success: boolean }>(
    `/artworks/${artworkId}/schemes/${schemeId}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
}

export async function deleteArtworkScheme(
  artworkId: number,
  schemeId: number,
): Promise<ArtworkSchemeDeletionResponse> {
  const response = await apiClient.delete<ArtworkSchemeDeletionResponse>(
    `/artworks/${artworkId}/schemes/${schemeId}`,
  );
  return response.data;
}
