import type { CMYK, ColorSwatchMetadata, RGB } from '@/models/color';

export const DEFAULT_SWATCH_SIZE = 96;

export interface ColorConverterResult {
  r: number;
  g: number;
  b: number;
  hex: string;
  cmyk?: CMYK;
}

export interface ColorConverter {
  extractColorFromImage(file: File): Promise<ColorConverterResult>;
}

export interface PureColorComputeOptions {
  previewSize?: number;
}

export interface PureColorComputationResult {
  rgb: RGB;
  hex: string;
  cmyk?: CMYK;
  previewDataUrl: string | null;
}

export function createSolidSwatchDataUrl(
  hex: string | undefined,
  size = DEFAULT_SWATCH_SIZE,
): string | null {
  if (!hex) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);
  return canvas.toDataURL('image/png');
}

export async function computeAverageColorFromFile(
  file: File,
  converter: ColorConverter,
  options: PureColorComputeOptions = {},
): Promise<PureColorComputationResult> {
  if (!file) {
    throw new Error('No image file provided for average color computation');
  }

  if (!converter || typeof converter.extractColorFromImage !== 'function') {
    throw new Error('ColorConverter.extractColorFromImage is not available');
  }

  const result = await converter.extractColorFromImage(file);
  const previewSize = options.previewSize ?? DEFAULT_SWATCH_SIZE;

  return {
    rgb: {
      r: result.r,
      g: result.g,
      b: result.b,
    },
    hex: result.hex,
    cmyk: result.cmyk,
    previewDataUrl: createSolidSwatchDataUrl(result.hex, previewSize),
  };
}

export interface PureColorSource {
  imageUrl: string;
  averageHex?: string;
  averageSwatch?: ColorSwatchMetadata;
  updatedAt?: string;
}

export function isPureColorAvailable(source: PureColorSource | undefined): boolean {
  return Boolean(source?.averageHex && source?.averageSwatch);
}
