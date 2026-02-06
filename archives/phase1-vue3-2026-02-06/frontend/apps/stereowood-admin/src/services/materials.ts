import { apiClient } from '@/services/http';
import type {
  MontMarteMaterial,
  MontMarteMaterialCreatePayload,
  MontMarteMaterialUpdatePayload,
  MontMarteMaterialUpdateResponse,
  MontMarteCategory,
  Supplier,
  PurchaseLink,
} from '@/models/material';

interface CategoryCreatePayload {
  code?: string;
  name: string;
  display_order?: number;
}

interface CategoryUpdatePayload {
  name: string;
  code?: string;
}

interface CategoryReorderItem {
  id: number;
  display_order: number;
}

function buildMaterialFormData(
  payload: MontMarteMaterialCreatePayload | MontMarteMaterialUpdatePayload,
): FormData {
  const formData = new FormData();
  formData.append('name', payload.name);
  if (payload.category_id !== undefined) {
    formData.append('category_id', payload.category_id == null ? '' : String(payload.category_id));
  }
  if (payload.category !== undefined) {
    formData.append('category', payload.category ?? '');
  }
  if (payload.supplier_id !== undefined) {
    formData.append('supplier_id', payload.supplier_id == null ? '' : String(payload.supplier_id));
  }
  if (payload.purchase_link_id !== undefined) {
    formData.append(
      'purchase_link_id',
      payload.purchase_link_id == null ? '' : String(payload.purchase_link_id),
    );
  }
  if ('existingImagePath' in payload && payload.existingImagePath !== undefined) {
    formData.append('existingImagePath', payload.existingImagePath ?? '');
  }
  if (payload.image) {
    formData.append('image', payload.image);
  }
  return formData;
}

export async function fetchMaterials(): Promise<MontMarteMaterial[]> {
  const response = await apiClient.get<MontMarteMaterial[]>('/mont-marte-colors');
  return response.data;
}

export async function createMaterial(
  payload: MontMarteMaterialCreatePayload,
): Promise<MontMarteMaterial> {
  const formData = buildMaterialFormData(payload);
  const response = await apiClient.post<MontMarteMaterial>('/mont-marte-colors', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateMaterial(
  id: number,
  payload: MontMarteMaterialUpdatePayload,
): Promise<MontMarteMaterialUpdateResponse> {
  const formData = buildMaterialFormData(payload);
  const response = await apiClient.put<MontMarteMaterialUpdateResponse>(
    `/mont-marte-colors/${id}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
}

export async function deleteMaterial(id: number): Promise<{ success: boolean }> {
  const response = await apiClient.delete<{ success: boolean }>(`/mont-marte-colors/${id}`);
  return response.data;
}

export async function fetchMontMarteCategories(): Promise<MontMarteCategory[]> {
  const response = await apiClient.get<MontMarteCategory[]>('/mont-marte-categories');
  return response.data;
}

export async function createMontMarteCategory(payload: CategoryCreatePayload) {
  const response = await apiClient.post<MontMarteCategory>('/mont-marte-categories', payload);
  return response.data;
}

export async function updateMontMarteCategory(id: number, payload: CategoryUpdatePayload) {
  const response = await apiClient.put<{ success: boolean; message: string }>(
    `/mont-marte-categories/${id}`,
    payload,
  );
  return response.data;
}

export async function reorderMontMarteCategories(updates: CategoryReorderItem[]) {
  const response = await apiClient.put<{ success: boolean; message: string }>(
    '/mont-marte-categories/reorder',
    updates,
  );
  return response.data;
}

export async function deleteMontMarteCategory(id: number) {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    `/mont-marte-categories/${id}`,
  );
  return response.data;
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const response = await apiClient.get<Supplier[]>('/suppliers');
  return response.data;
}

export async function upsertSupplier(name: string): Promise<Supplier> {
  const response = await apiClient.post<Supplier>('/suppliers/upsert', { name });
  return response.data;
}

export async function deleteSupplier(id: number) {
  const response = await apiClient.delete<{ deleted: boolean }>(`/suppliers/${id}`);
  return response.data;
}

export async function fetchPurchaseLinks(): Promise<PurchaseLink[]> {
  const response = await apiClient.get<PurchaseLink[]>('/purchase-links');
  return response.data;
}

export async function upsertPurchaseLink(url: string) {
  const response = await apiClient.post<PurchaseLink>('/purchase-links/upsert', { url });
  return response.data;
}
