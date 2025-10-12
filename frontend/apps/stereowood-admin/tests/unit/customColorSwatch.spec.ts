import { describe, expect, it, vi } from 'vitest';
import {
  hasPureColor,
  normalizeHex,
  resolveCustomColorSwatch,
  shouldUsePureColor,
  type CustomColorLike,
} from '@/features/pure-color/customColorSwatch';

describe('normalizeHex', () => {
  it('adds leading hash and uppercases letters', () => {
    expect(normalizeHex('abc123')).toBe('#ABC123');
    expect(normalizeHex('#abc123')).toBe('#ABC123');
    expect(normalizeHex('')).toBeNull();
  });
});

describe('pure color checks', () => {
  const baseColor: CustomColorLike = {
    category_code: 'CL',
    pure_hex_color: '#FF0000',
  };

  it('detects pure color availability', () => {
    expect(hasPureColor(baseColor)).toBe(true);
    expect(hasPureColor({})).toBe(false);
  });

  it('excludes color concentrate categories by default', () => {
    const concentrate = { ...baseColor, category_code: 'ES' };
    expect(shouldUsePureColor(concentrate)).toBe(false);
    expect(shouldUsePureColor(concentrate, { includeColorConcentrate: true })).toBe(true);
  });

  it('honours forceOriginal option', () => {
    expect(shouldUsePureColor(baseColor, { forceOriginal: true })).toBe(false);
  });
});

describe('resolveCustomColorSwatch', () => {
  const color: CustomColorLike = {
    category_code: 'CL',
    pure_hex_color: '#ff3300',
    image_path: 'swatches/red.png',
    hex_color: '#cc0000',
  };

  it('returns pure swatch when allowed', () => {
    const swatch = resolveCustomColorSwatch(color);
    expect(swatch.type).toBe('pure');
    expect(swatch.hex).toBe('#FF3300');
    expect(swatch.style.backgroundColor).toBe('#FF3300');
  });

  it('falls back to image when forced to original', () => {
    const swatch = resolveCustomColorSwatch(color, {
      forceOriginal: true,
      baseUrl: 'https://cdn.example.com',
    });
    expect(swatch.type).toBe('image');
    expect(swatch.imageUrl).toBe('https://cdn.example.com/uploads/swatches/red.png');
    expect(swatch.style.backgroundImage).toContain('red.png');
  });

  it('uses custom URL builder when provided', () => {
    const buildUrl = vi.fn((base: string, path: string) => `${base}/media/${path}`);
    const swatch = resolveCustomColorSwatch(color, {
      forceOriginal: true,
      baseUrl: 'https://cdn.example.com/',
      buildUrl,
    });
    expect(buildUrl).toHaveBeenCalledWith('https://cdn.example.com', 'swatches/red.png');
    expect(swatch.imageUrl).toBe('https://cdn.example.com/media/swatches/red.png');
  });

  it('returns solid fallback when no image present', () => {
    const swatch = resolveCustomColorSwatch(
      { pure_hex_color: null, hex_color: '#00aa00' },
      { forceOriginal: true },
    );
    expect(swatch.type).toBe('color');
    expect(swatch.hex).toBe('#00AA00');
  });

  it('returns empty swatch when nothing available', () => {
    const swatch = resolveCustomColorSwatch({}, { forceOriginal: true });
    expect(swatch.type).toBe('empty');
    expect(swatch.style).toEqual({});
  });
});
