export interface ArtworkSchemeLayer {
  layer: number;
  colorCode: string | null;
  custom_color_id: number | null;
  formula: string | null;
  manualFormula?: string | null;
}

export interface ArtworkScheme {
  id: number;
  name: string;
  thumbnail_path: string | null;
  initial_thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
  layers: ArtworkSchemeLayer[];
  version?: number | null;
}

export interface Artwork {
  id: number;
  code: string;
  name: string;
  created_at: string;
  updated_at: string;
  version?: number | null;
  schemes: ArtworkScheme[];
}

export interface ArtworkCreatePayload {
  code: string;
  name: string;
}

export interface ArtworkUpdatePayload {
  code: string;
  name: string;
}

export interface ArtworkDeletionResponse {
  success: boolean;
  deletedId: number;
}

export interface ArtworkSchemeLayerInput {
  layer: number;
  colorCode?: string | null;
  custom_color_id?: number | null;
  manualFormula?: string | null;
}

export interface ArtworkSchemeCreatePayload {
  name: string;
  layers: ArtworkSchemeLayerInput[];
  thumbnail?: File | null;
  initialThumbnail?: File | null;
}

export interface ArtworkSchemeUpdatePayload extends ArtworkSchemeCreatePayload {
  existingThumbnailPath?: string | null;
  existingInitialThumbnailPath?: string | null;
}

export interface ArtworkSchemeDeletionResponse {
  success: boolean;
  deletedId: number;
}
