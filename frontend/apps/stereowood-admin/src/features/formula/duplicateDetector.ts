import { parseFormula } from '@/utils/formula';

const EPSILON = 1e-6;

export interface FormulaRecordLike {
  id?: number | string | null;
  color_code?: string | null;
  code?: string | null;
  formula?: string | null;
}

export interface DuplicateDetectionResult<TRecord extends FormulaRecordLike = FormulaRecordLike> {
  signature: string;
  records: TRecord[];
}

export interface RatioItem {
  name: string;
  unit: string;
  ratio: number;
}

export interface ParsedRatioSignature {
  items: RatioItem[];
  ratios: number[];
}

interface NormalizedIngredient {
  name: string;
  unit: string;
  amount: number;
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = x % y;
    x = y;
    y = temp;
  }
  return x || 1;
}

function gcdArray(values: number[]): number {
  if (values.length === 0) {
    return 1;
  }
  return values.reduce((acc, value) => greatestCommonDivisor(acc, value), values[0]);
}

function normalizeIngredients(formula: string | null | undefined): NormalizedIngredient[] {
  if (!formula) {
    return [];
  }
  const parsed = parseFormula(formula);
  return parsed
    .filter(
      (item) => item && !item.invalid && item.name && Number.isFinite(item.base) && item.base > 0,
    )
    .map((item) => ({
      name: String(item.name).trim().toLowerCase(),
      unit: String(item.unit || '')
        .trim()
        .toLowerCase(),
      amount: Number(item.base),
    }))
    .sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      if (a.unit < b.unit) return -1;
      if (a.unit > b.unit) return 1;
      return 0;
    });
}

function buildFloatSignature(ingredients: NormalizedIngredient[]): string {
  if (!ingredients.length) {
    return '';
  }
  const base = ingredients[0].amount;
  if (!base) {
    return '';
  }
  return ingredients
    .map((ingredient) => {
      const ratio = Math.round((ingredient.amount / base) * 1e6) / 1e6;
      return `${ingredient.name}#${ingredient.unit}#${ratio}`;
    })
    .join('|');
}

export function buildRatioSignature(formula: string | null | undefined): string {
  const ingredients = normalizeIngredients(formula);
  if (!ingredients.length) {
    return '';
  }

  const decimalPlaces = ingredients.map((ingredient) => {
    const fraction = `${ingredient.amount}`.split('.')[1];
    return fraction ? fraction.length : 0;
  });
  const scale = Math.pow(10, Math.max(0, ...decimalPlaces));
  let scaled = ingredients.map((ingredient) => Math.round(ingredient.amount * scale));

  if (scaled.every((value) => Math.abs(value) <= EPSILON)) {
    return buildFloatSignature(ingredients);
  }

  const gcd = gcdArray(scaled);
  if (gcd > 1) {
    scaled = scaled.map((value) => Math.round(value / gcd));
  }

  return ingredients
    .map((ingredient, index) => `${ingredient.name}#${ingredient.unit}#${scaled[index]}`)
    .join('|');
}

export function groupByRatioSignature<TRecord extends FormulaRecordLike>(
  records: readonly TRecord[] | null | undefined,
): Record<string, TRecord[]> {
  const map = new Map<string, TRecord[]>();
  (records ?? []).forEach((record) => {
    const signature = buildRatioSignature(record.formula ?? '');
    if (!signature) {
      return;
    }
    const bucket = map.get(signature);
    if (bucket) {
      bucket.push(record);
    } else {
      map.set(signature, [record]);
    }
  });
  const duplicates: Record<string, TRecord[]> = {};
  map.forEach((bucket, signature) => {
    if (bucket.length >= 2) {
      duplicates[signature] = bucket;
    }
  });
  return duplicates;
}

export function detectDuplicateOnSave<TRecord extends FormulaRecordLike>(
  record: TRecord | null | undefined,
  allRecords: readonly TRecord[] | null | undefined,
): DuplicateDetectionResult<TRecord> | null {
  if (!record) {
    return null;
  }
  const signature = buildRatioSignature(record.formula ?? '');
  if (!signature) {
    return null;
  }
  const matches = (allRecords ?? []).filter(
    (candidate) => buildRatioSignature(candidate.formula ?? '') === signature,
  );
  if (matches.length >= 2) {
    return {
      signature,
      records: matches,
    };
  }
  return null;
}

export function parseRatioSignature(signature: string | null | undefined): ParsedRatioSignature {
  if (!signature) {
    return { items: [], ratios: [] };
  }
  const parts = signature.split('|');
  const items: RatioItem[] = [];
  const ratios: number[] = [];
  parts.forEach((part) => {
    const segments = part.split('#');
    if (segments.length === 3) {
      const ratioValue = Number(segments[2]);
      items.push({
        name: segments[0],
        unit: segments[1],
        ratio: ratioValue,
      });
      ratios.push(ratioValue);
    }
  });
  return { items, ratios };
}
