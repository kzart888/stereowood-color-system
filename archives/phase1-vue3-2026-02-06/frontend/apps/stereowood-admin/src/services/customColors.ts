import { apiClient } from '@/services/http';
import type {
  CustomColor,
  CustomColorCreatePayload,
  CustomColorForceMergePayload,
  CustomColorHistoryEntry,
  CustomColorUpdatePayload,
} from '@/models/customColor';

function appendFormValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    formData.append(key, '');
    return;
  }
  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }
  formData.append(key, String(value));
}

function buildCustomColorFormData(
  payload: CustomColorCreatePayload | CustomColorUpdatePayload,
): FormData {
  const formData = new FormData();

  appendFormValue(formData, 'category_id', payload.category_id ?? null);
  appendFormValue(formData, 'color_code', payload.color_code);
  appendFormValue(formData, 'formula', payload.formula ?? null);
  appendFormValue(formData, 'applicable_layers', payload.applicable_layers ?? null);

  appendFormValue(formData, 'rgb_r', payload.rgb_r ?? null);
  appendFormValue(formData, 'rgb_g', payload.rgb_g ?? null);
  appendFormValue(formData, 'rgb_b', payload.rgb_b ?? null);

  appendFormValue(formData, 'cmyk_c', payload.cmyk_c ?? null);
  appendFormValue(formData, 'cmyk_m', payload.cmyk_m ?? null);
  appendFormValue(formData, 'cmyk_y', payload.cmyk_y ?? null);
  appendFormValue(formData, 'cmyk_k', payload.cmyk_k ?? null);

  appendFormValue(formData, 'hex_color', payload.hex_color ?? null);
  appendFormValue(formData, 'pantone_coated', payload.pantone_coated ?? null);
  appendFormValue(formData, 'pantone_uncoated', payload.pantone_uncoated ?? null);

  appendFormValue(formData, 'pure_rgb_r', payload.pure_rgb_r ?? null);
  appendFormValue(formData, 'pure_rgb_g', payload.pure_rgb_g ?? null);
  appendFormValue(formData, 'pure_rgb_b', payload.pure_rgb_b ?? null);
  appendFormValue(formData, 'pure_hex_color', payload.pure_hex_color ?? null);
  appendFormValue(formData, 'pure_generated_at', payload.pure_generated_at ?? null);

  if ('clear_pure_color' in payload && payload.clear_pure_color !== undefined) {
    appendFormValue(formData, 'clear_pure_color', payload.clear_pure_color ? 'true' : 'false');
  }

  if ('existingImagePath' in payload) {
    appendFormValue(formData, 'existingImagePath', payload.existingImagePath ?? null);
  }

  if ('version' in payload) {
    appendFormValue(formData, 'version', payload.version ?? null);
  }

  if (payload.image) {
    formData.append('image', payload.image);
  }

  return formData;
}

export async function fetchCustomColors(): Promise<CustomColor[]> {
  const response = await apiClient.get<CustomColor[]>('/custom-colors');
  return response.data;
}

export async function fetchCustomColorHistory(
  customColorId: number,
): Promise<CustomColorHistoryEntry[]> {
  const response = await apiClient.get<CustomColorHistoryEntry[]>(
    `/custom-colors/${customColorId}/history`,
  );
  return response.data;
}

export async function createCustomColor(payload: CustomColorCreatePayload): Promise<CustomColor> {
  const formData = buildCustomColorFormData(payload);
  const response = await apiClient.post<CustomColor>('/custom-colors', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateCustomColor(
  id: number,
  payload: CustomColorUpdatePayload,
): Promise<CustomColor> {
  const formData = buildCustomColorFormData(payload);
  const response = await apiClient.put<CustomColor>(`/custom-colors/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteCustomColor(id: number): Promise<void> {
  await apiClient.delete(`/custom-colors/${id}`);
}

export async function forceMergeCustomColors(payload: CustomColorForceMergePayload) {
  const response = await apiClient.post('/custom-colors/force-merge', payload);
  return response.data as { success: boolean; updatedLayers: number; deleted: number };
}
