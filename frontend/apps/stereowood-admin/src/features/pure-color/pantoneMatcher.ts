import { PANTONE_BASIC_SET } from '@/data/pantone-basic';
import type { PantoneEntry } from '@/data/pantone-basic';
import type { PantoneFullEntry } from '@/data/pantone-full';
import type { RGB } from '@/models/color';
import { findClosestPantones } from './colorConverter';

export type PantoneDataset = PantoneEntry[] | PantoneFullEntry[];

export interface PantoneMatchOptions {
  dataset?: PantoneDataset;
  limit?: number;
}

export function findPantoneByCode(code: string, dataset: PantoneDataset = PANTONE_BASIC_SET) {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return dataset.find((entry) => entry.code.toUpperCase() === normalized) ?? null;
}

export function findPantoneMatches(rgb: RGB, options: PantoneMatchOptions = {}) {
  const dataset = options.dataset ?? PANTONE_BASIC_SET;
  const limit = options.limit ?? 5;
  return findClosestPantones(rgb, dataset as PantoneEntry[], limit);
}
