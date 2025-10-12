import type { CustomColor } from '@/models/customColor';
import { hexToRgb, rgbToHex, rgbToHsl } from '@/features/pure-color/colorConverter';
import { resolveCustomColorSwatch } from '@/features/pure-color/customColorSwatch';

export interface ColorSwatchInfo {
  type: 'empty' | 'image' | 'color' | 'pure';
  style: Record<string, string>;
  className?: string;
}

export interface EnrichedColor {
  base: CustomColor;
  hex: string | null;
  rgb: { r: number; g: number; b: number } | null;
  hsl: { h: number; s: number; l: number } | null;
  swatch: ColorSwatchInfo;
}

const HEX_PATTERN = /^#[0-9A-F]{6}$/;

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const upper = prefixed.toUpperCase();
  return HEX_PATTERN.test(upper) ? upper : null;
}

function channelTriplet(
  r: number | null | undefined,
  g: number | null | undefined,
  b: number | null | undefined,
): { r: number; g: number; b: number } | null {
  if (
    r == null ||
    g == null ||
    b == null ||
    Number.isNaN(r) ||
    Number.isNaN(g) ||
    Number.isNaN(b)
  ) {
    return null;
  }
  return {
    r: clampChannel(r),
    g: clampChannel(g),
    b: clampChannel(b),
  };
}

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function getColorHex(color: CustomColor): string | null {
  const sources = [normalizeHex(color.pure_hex_color), normalizeHex(color.hex_color)] as const;
  for (const candidate of sources) {
    if (candidate) {
      return candidate;
    }
  }
  const rgb = getColorRgb(color);
  return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : null;
}

export function getColorRgb(color: CustomColor): { r: number; g: number; b: number } | null {
  const preferred = channelTriplet(color.pure_rgb_r, color.pure_rgb_g, color.pure_rgb_b);
  if (preferred) {
    return preferred;
  }
  const legacy = channelTriplet(color.rgb_r, color.rgb_g, color.rgb_b);
  if (legacy) {
    return legacy;
  }
  const hex = getColorHex(color);
  return hex ? hexToRgb(hex) : null;
}

export function getColorHsl(color: CustomColor): { h: number; s: number; l: number } | null {
  const rgb = getColorRgb(color);
  if (!rgb) {
    return null;
  }
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export function buildColorSwatch(color: CustomColor): ColorSwatchInfo {
  const swatch = resolveCustomColorSwatch(color, { includeColorConcentrate: false });
  if (swatch.type === 'image') {
    return {
      type: 'image',
      style: swatch.imageUrl
        ? {
            backgroundImage: `url(${swatch.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
        : {},
      className: 'swatch--image',
    };
  }
  if ((swatch.type === 'color' || swatch.type === 'pure') && swatch.hex) {
    return {
      type: swatch.type,
      style: { backgroundColor: swatch.hex },
      className: 'swatch--color',
    };
  }
  return {
    type: 'empty',
    style: { backgroundColor: '#F3F3F5' },
    className: 'swatch--empty',
  };
}

export function enrichColor(color: CustomColor): EnrichedColor {
  const hex = getColorHex(color);
  const rgb = hex ? (hexToRgb(hex) ?? getColorRgb(color)) : getColorRgb(color);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;

  return {
    base: color,
    hex,
    rgb,
    hsl,
    swatch: buildColorSwatch(color),
  };
}
