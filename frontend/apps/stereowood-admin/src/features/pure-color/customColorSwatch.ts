const EXCLUDED_PURE_COLOR_CATEGORY_CODES = ['ES'];

export interface CustomColorLike {
  id?: number | string | null;
  category_code?: string | null;
  categoryCode?: string | null;
  pure_hex_color?: string | null;
  hex_color?: string | null;
  hex?: string | null;
  image_path?: string | null;
}

export interface SwatchResolveOptions {
  baseUrl?: string | null;
  buildUrl?: (baseUrl: string, imagePath: string) => string;
  includeColorConcentrate?: boolean;
  forceOriginal?: boolean;
}

export type SwatchType = 'pure' | 'image' | 'color' | 'empty';

export interface SwatchResult {
  type: SwatchType;
  hex?: string | null;
  imageUrl?: string | null;
  style: Record<string, string>;
}

export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }
  const trimmed = String(input).trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
  return normalized;
}

export function hasPureColor(color: CustomColorLike | null | undefined): boolean {
  const hex = normalizeHex(color?.pure_hex_color ?? null);
  return Boolean(hex);
}

export function shouldUsePureColor(
  color: CustomColorLike | null | undefined,
  options: SwatchResolveOptions = {},
): boolean {
  if (!hasPureColor(color)) {
    return false;
  }
  if (options.forceOriginal) {
    return false;
  }
  if (options.includeColorConcentrate) {
    return true;
  }
  const categoryCode = (color?.category_code ?? color?.categoryCode ?? '').toUpperCase();
  if (!categoryCode) {
    return true;
  }
  return !EXCLUDED_PURE_COLOR_CATEGORY_CODES.includes(categoryCode);
}

function buildImageUrl(
  color: CustomColorLike | null | undefined,
  options: SwatchResolveOptions,
): string | null {
  const path = color?.image_path;
  if (!path) {
    return null;
  }
  const normalizedPath = String(path).replace(/^\/+/, '');
  const base = options.baseUrl ? String(options.baseUrl).replace(/\/+$/, '') : '';
  if (options.buildUrl && base) {
    try {
      return options.buildUrl(base, normalizedPath);
    } catch {
      // Fall back to manual assembly.
    }
  }
  if (base) {
    return `${base}/uploads/${normalizedPath}`;
  }
  return normalizedPath;
}

function deriveHexFallback(color: CustomColorLike | null | undefined): string | null {
  return normalizeHex(color?.pure_hex_color ?? color?.hex_color ?? color?.hex ?? null);
}

export function resolveCustomColorSwatch(
  color: CustomColorLike | null | undefined,
  options: SwatchResolveOptions = {},
): SwatchResult {
  if (!color) {
    return { type: 'empty', style: {} };
  }

  if (shouldUsePureColor(color, options)) {
    const hex = normalizeHex(color.pure_hex_color ?? null);
    return {
      type: 'pure',
      hex,
      style: hex ? { backgroundColor: hex } : {},
    };
  }

  const imageUrl = buildImageUrl(color, options);
  if (imageUrl) {
    return {
      type: 'image',
      imageUrl,
      style: { backgroundImage: `url(${imageUrl})` },
    };
  }

  const fallbackHex = deriveHexFallback(color);
  if (fallbackHex) {
    return {
      type: 'color',
      hex: fallbackHex,
      style: { backgroundColor: fallbackHex },
    };
  }

  return {
    type: 'empty',
    style: {},
  };
}
