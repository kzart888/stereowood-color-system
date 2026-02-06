export interface CustomColor {
  id: number;
  category_id: number | null;
  category_name: string | null;
  category_code: string | null;
  color_code: string;
  image_path: string | null;
  formula: string | null;
  applicable_layers: string | null;
  rgb_r: number | null;
  rgb_g: number | null;
  rgb_b: number | null;
  cmyk_c: number | null;
  cmyk_m: number | null;
  cmyk_y: number | null;
  cmyk_k: number | null;
  hex_color: string | null;
  pantone_coated: string | null;
  pantone_uncoated: string | null;
  pure_rgb_r: number | null;
  pure_rgb_g: number | null;
  pure_rgb_b: number | null;
  pure_hex_color: string | null;
  pure_generated_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface CustomColorHistoryEntry {
  id: number;
  custom_color_id: number;
  color_code: string | null;
  image_path: string | null;
  formula: string | null;
  applicable_layers: string | null;
  pure_rgb_r: number | null;
  pure_rgb_g: number | null;
  pure_rgb_b: number | null;
  pure_hex_color: string | null;
  archived_at: string;
}

export interface CustomColorCreatePayload {
  category_id?: number | null;
  color_code: string;
  formula?: string | null;
  applicable_layers?: string | null;
  rgb_r?: number | null;
  rgb_g?: number | null;
  rgb_b?: number | null;
  cmyk_c?: number | null;
  cmyk_m?: number | null;
  cmyk_y?: number | null;
  cmyk_k?: number | null;
  hex_color?: string | null;
  pantone_coated?: string | null;
  pantone_uncoated?: string | null;
  pure_rgb_r?: number | null;
  pure_rgb_g?: number | null;
  pure_rgb_b?: number | null;
  pure_hex_color?: string | null;
  pure_generated_at?: string | null;
  image?: File | null;
}

export interface CustomColorUpdatePayload extends Partial<CustomColorCreatePayload> {
  existingImagePath?: string | null;
  version?: number | null;
  clear_pure_color?: boolean;
}

export interface CustomColorForceMergePayload {
  keepId: number;
  removeIds: number[];
  signature: string;
}
