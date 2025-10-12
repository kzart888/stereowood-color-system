import { describe, expect, it } from 'vitest';
import type { CustomColor } from '@/models/customColor';
import {
  getColorHex,
  getColorRgb,
  getColorHsl,
  enrichColor,
} from '@/features/color-dictionary/utils';
import { rgbToLab, deltaE } from '@/features/color-dictionary/colorMath';

const sampleColor: CustomColor = {
  id: 1,
  color_code: 'RD001',
  pure_hex_color: 'FF0000',
  hex_color: null,
  rgb_r: 240,
  rgb_g: 32,
  rgb_b: 32,
  pure_rgb_r: 255,
  pure_rgb_g: 0,
  pure_rgb_b: 0,
  formula: '朱红 3g 灰色 1g',
  category_code: 'RD',
  category_name: '红色系',
  created_at: '2025-10-01',
  updated_at: '2025-10-01',
};

describe('color dictionary utilities', () => {
  it('normalises hexadecimal strings', () => {
    expect(getColorHex(sampleColor)).toBe('#FF0000');
    const fallback: CustomColor = { ...sampleColor, pure_hex_color: null, hex_color: '00ff00' };
    expect(getColorHex(fallback)).toBe('#00FF00');
  });

  it('extracts RGB channels with preferred priority', () => {
    const rgb = getColorRgb(sampleColor);
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });

    const withoutPure: CustomColor = {
      ...sampleColor,
      pure_hex_color: null,
      pure_rgb_r: null,
      pure_rgb_g: null,
      pure_rgb_b: null,
    };
    expect(getColorRgb(withoutPure)).toEqual({ r: 240, g: 32, b: 32 });
  });

  it('derives HSL values from available data', () => {
    const hsl = getColorHsl(sampleColor);
    expect(hsl).not.toBeNull();
    expect(hsl?.h).toBe(0);
    expect(hsl?.s).toBeGreaterThan(90);
    expect(hsl?.l).toBeGreaterThanOrEqual(50);
  });

  it('enriches color with swatch metadata', () => {
    const enriched = enrichColor(sampleColor);
    expect(enriched.hex).toBe('#FF0000');
    expect(enriched.hsl?.h).toBe(0);
    expect(enriched.swatch.type).toBe('pure');
  });

  it('computes Lab values and delta E', () => {
    const labRed = rgbToLab(255, 0, 0);
    const labGreen = rgbToLab(0, 255, 0);
    expect(labRed.L).toBeGreaterThan(50);
    const distance = deltaE(labRed, labGreen);
    expect(distance).toBeGreaterThan(150);
  });
});
