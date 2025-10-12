export interface Supplier {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseLink {
  id: number;
  url: string;
  created_at?: string;
  updated_at?: string;
}

export interface MontMarteCategory {
  id: number;
  code: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  material_count?: number;
}

export interface MontMarteMaterial {
  id: number;
  name: string;
  image_path: string | null;
  category: string | null;
  category_id: number | null;
  category_name: string | null;
  category_code: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  purchase_link_id: number | null;
  purchase_link_url: string | null;
  updated_at: string | null;
  created_at?: string | null;
}

export interface MontMarteMaterialCreatePayload {
  name: string;
  category_id?: number | null;
  category?: string | null;
  supplier_id?: number | null;
  purchase_link_id?: number | null;
  image?: File | null;
}

export interface MontMarteMaterialUpdatePayload extends MontMarteMaterialCreatePayload {
  existingImagePath?: string | null;
}

export interface MontMarteMaterialUpdateResponse extends MontMarteMaterial {
  updatedReferences?: number;
  warn?: string;
}
