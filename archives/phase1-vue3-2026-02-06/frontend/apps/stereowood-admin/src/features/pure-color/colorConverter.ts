import type { CMYK, HSL, RGB } from '@/models/color';

export const DEFAULT_SWATCH_SIZE = 96;

export interface PantoneColor {
  code: string;
  name?: string;
  rgb?: RGB;
}

export interface PantoneMatch extends PantoneColor {
  distance: number;
}

export interface DominantColor extends RGB {
  hex: string;
  cmyk?: CMYK;
  frequency: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function rgbToHex(r: number, g: number, b: number): string | null {
  if (!isValidRGB(r, g, b)) {
    return null;
  }

  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function hexToRgb(hex: string): RGB | null {
  const normalized = hex.replace('#', '');

  if (!/^([0-9a-fA-F]{6})$/.test(normalized)) {
    return null;
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToCmyk(r: number, g: number, b: number): CMYK | null {
  if (!isValidRGB(r, g, b)) {
    return null;
  }

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const k = 1 - Math.max(rNorm, gNorm, bNorm);

  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = ((1 - rNorm - k) / (1 - k)) * 100;
  const m = ((1 - gNorm - k) / (1 - k)) * 100;
  const y = ((1 - bNorm - k) / (1 - k)) * 100;

  return {
    c: Math.round(clamp(c, 0, 100)),
    m: Math.round(clamp(m, 0, 100)),
    y: Math.round(clamp(y, 0, 100)),
    k: Math.round(clamp(k * 100, 0, 100)),
  };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): RGB | null {
  if (!isValidCMYK(c, m, y, k)) {
    return null;
  }

  const cNorm = c / 100;
  const mNorm = m / 100;
  const yNorm = y / 100;
  const kNorm = k / 100;

  const r = 255 * (1 - cNorm) * (1 - kNorm);
  const g = 255 * (1 - mNorm) * (1 - kNorm);
  const b = 255 * (1 - yNorm) * (1 - kNorm);

  return {
    r: Math.round(clamp(r, 0, 255)),
    g: Math.round(clamp(g, 0, 255)),
    b: Math.round(clamp(b, 0, 255)),
  };
}

export function rgbToHsl(r: number, g: number, b: number): HSL | null {
  if (!isValidRGB(r, g, b)) {
    return null;
  }

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / delta + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / delta + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function isValidRGB(r?: number, g?: number, b?: number): boolean {
  return [r, g, b].every(
    (channel) => Number.isInteger(channel) && channel! >= 0 && channel! <= 255,
  );
}

export function isValidCMYK(c?: number, m?: number, y?: number, k?: number): boolean {
  return [c, m, y, k].every(
    (channel) => typeof channel === 'number' && channel >= 0 && channel <= 100,
  );
}

export function isValidHex(hex?: string): boolean {
  if (!hex) return false;
  return /^#?[0-9a-fA-F]{6}$/.test(hex);
}

export function formatHex(hex?: string): string {
  if (!hex) return '';
  return hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
}

export function formatRGB(r: number, g: number, b: number): string {
  return `${r}, ${g}, ${b}`;
}

export function formatCMYK(c: number, m: number, y: number, k: number): string {
  return `${c}, ${m}, ${y}, ${k}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load image'));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function ensureCanvasContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }
  return ctx;
}

export async function extractColorFromImage(file: File): Promise<{
  r: number;
  g: number;
  b: number;
  hex: string;
  cmyk?: CMYK;
}> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Invalid image file');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const ctx = ensureCanvasContext(1, 1);
  ctx.drawImage(img, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  const hex = rgbToHex(r, g, b);

  return {
    r,
    g,
    b,
    hex: hex ?? '#000000',
    cmyk: rgbToCmyk(r, g, b) ?? undefined,
  };
}

export async function extractDominantColors(file: File, numColors = 5): Promise<DominantColor[]> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Invalid image file');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const sampleSize = 150;
  const aspectRatio = img.width / img.height;
  const width = aspectRatio >= 1 ? sampleSize : Math.round(sampleSize * aspectRatio);
  const height = aspectRatio >= 1 ? Math.round(sampleSize / aspectRatio) : sampleSize;

  const ctx = ensureCanvasContext(width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const colorMap: Record<string, number> = {};
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 32) * 32;
    const g = Math.round(data[i + 1] / 32) * 32;
    const b = Math.round(data[i + 2] / 32) * 32;
    const key = `${r},${g},${b}`;
    colorMap[key] = (colorMap[key] ?? 0) + 1;
  }

  return Object.entries(colorMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, numColors)
    .map(([key, frequency]) => {
      const [r, g, b] = key.split(',').map(Number) as [number, number, number];
      return {
        r,
        g,
        b,
        hex: rgbToHex(r, g, b) ?? '#000000',
        cmyk: rgbToCmyk(r, g, b) ?? undefined,
        frequency,
      };
    });
}

function distanceRgb(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function findClosestPantone(rgb: RGB, database: PantoneColor[]): PantoneMatch | null {
  if (!database?.length) {
    return null;
  }

  let closest: PantoneMatch | null = null;
  let minDistance = Infinity;

  for (const color of database) {
    if (!color.rgb) continue;
    const distance = distanceRgb(rgb, color.rgb);
    if (distance < minDistance) {
      minDistance = distance;
      closest = {
        ...color,
        distance: Math.round(distance * 100) / 100,
      };
    }
  }

  return closest;
}

export function findClosestPantones(rgb: RGB, database: PantoneColor[], count = 5): PantoneMatch[] {
  if (!database?.length) {
    return [];
  }

  return database
    .filter((color): color is PantoneColor & { rgb: RGB } => Boolean(color.rgb))
    .map((color) => ({
      ...color,
      distance: Math.round(distanceRgb(rgb, color.rgb) * 100) / 100,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

export const ColorConverter = {
  rgbToHex,
  hexToRgb,
  rgbToCmyk,
  cmykToRgb,
  rgbToHsl,
  extractColorFromImage,
  extractDominantColors,
  findClosestPantone,
  findClosestPantones,
  isValidRGB,
  isValidCMYK,
  isValidHex,
  formatHex,
  formatRGB,
  formatCMYK,
};

export type ColorConverterType = typeof ColorConverter;
