import type { CustomColor } from '@/models/customColor';
import { getColorRgb } from '@/features/color-dictionary/utils';

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

const REF_X = 95.047;
const REF_Y = 100.0;
const REF_Z = 108.883;

export function srgbToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

export function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
  const rLinear = srgbToLinear(r);
  const gLinear = srgbToLinear(g);
  const bLinear = srgbToLinear(b);

  const x = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805;
  const y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722;
  const z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505;

  return {
    x: x * 100,
    y: y * 100,
    z: z * 100,
  };
}

function pivotXyz(value: number): number {
  const epsilon = 0.008856;
  const kappa = 903.3;
  return value > epsilon ? Math.cbrt(value) : (kappa * value + 16) / 116;
}

export function xyzToLab(x: number, y: number, z: number): LabColor {
  const xNorm = pivotXyz(x / REF_X);
  const yNorm = pivotXyz(y / REF_Y);
  const zNorm = pivotXyz(z / REF_Z);

  return {
    L: 116 * yNorm - 16,
    a: 500 * (xNorm - yNorm),
    b: 200 * (yNorm - zNorm),
  };
}

export function rgbToLab(r: number, g: number, b: number): LabColor {
  const { x, y, z } = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

export function deltaE(lab1: LabColor, lab2: LabColor): number {
  const dL = lab1.L - lab2.L;
  const dA = lab1.a - lab2.a;
  const dB = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}

export function colorDeltaE(colorA: CustomColor, colorB: CustomColor): number | null {
  const rgbA = getColorRgb(colorA);
  const rgbB = getColorRgb(colorB);
  if (!rgbA || !rgbB) {
    return null;
  }
  const labA = rgbToLab(rgbA.r, rgbA.g, rgbA.b);
  const labB = rgbToLab(rgbB.r, rgbB.g, rgbB.b);
  return deltaE(labA, labB);
}
