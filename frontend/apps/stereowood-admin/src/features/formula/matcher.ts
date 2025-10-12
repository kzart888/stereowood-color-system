import { hashFormulaIngredients, parseFormula, splitFormulaSegments } from '@/utils/formula';
import type { FormulaIngredient } from '@/models/formula';

export interface CustomColorLike {
  id?: number | string | null;
  color_code?: string | null;
  code?: string | null;
  formula?: string | null;
}

export interface FormulaMatchEntry<TColor extends CustomColorLike = CustomColorLike> {
  id?: number | string | null;
  colorCode: string;
  formula: string;
  tokens: FormulaIngredient[];
  color: TColor;
}

export interface FormulaMatcherStats {
  version: number;
  builtAt: number | null;
  size: number;
  colorCount: number;
  signature: string;
}

export interface FormulaMatcherIndex<TColor extends CustomColorLike = CustomColorLike> {
  stats: FormulaMatcherStats;
  buckets: Map<string, FormulaMatchEntry<TColor>[]>;
}

const DEFAULT_STATS: FormulaMatcherStats = {
  version: 0,
  builtAt: null,
  size: 0,
  colorCount: 0,
  signature: '',
};

function cloneEntry<TColor extends CustomColorLike>(
  entry: FormulaMatchEntry<TColor>,
): FormulaMatchEntry<TColor> {
  return {
    id: entry.id,
    colorCode: entry.colorCode,
    formula: entry.formula,
    tokens: entry.tokens,
    color: entry.color,
  };
}

function normalizeTokens(tokens: FormulaIngredient[]): FormulaIngredient[] {
  return tokens
    .map((token) => ({
      name: String(token.name).trim(),
      base: Number.isFinite(token.base) ? token.base : 0,
      unit: String(token.unit || '').trim(),
      invalid: Boolean(token.invalid),
    }))
    .filter((token) => token.name && !token.invalid)
    .sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      if (nameCompare !== 0) {
        return nameCompare;
      }
      const unitCompare = a.unit.localeCompare(b.unit, undefined, { sensitivity: 'base' });
      if (unitCompare !== 0) {
        return unitCompare;
      }
      return a.base - b.base;
    });
}

function fallbackTokens(formula: string): FormulaIngredient[] {
  const segments = splitFormulaSegments(formula);
  const tokens: FormulaIngredient[] = [];

  segments.forEach((segment) => {
    const trimmed = segment.trim();
    if (!trimmed) {
      return;
    }
    let namePart = trimmed;
    let amountPart = '';
    const whitespacePieces = trimmed.split(/\s+/);
    if (whitespacePieces.length > 1) {
      namePart = whitespacePieces[0];
      amountPart = whitespacePieces.slice(1).join('');
    }
    if (!amountPart) {
      const contiguous = trimmed.match(/^(.+?)([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
      if (contiguous) {
        namePart = contiguous[1].trim();
        amountPart = `${contiguous[2]}${contiguous[3] ?? ''}`;
      }
    }
    const amountMatch = amountPart.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)?$/);
    const amount = amountMatch ? Number.parseFloat(amountMatch[1]) : 0;
    const unit = amountMatch ? (amountMatch[2] ?? '') : '';
    const base = Number.isFinite(amount) ? amount : 0;
    const name = namePart.trim();
    if (name) {
      tokens.push({
        name,
        base,
        unit,
        invalid: false,
      });
    }
  });

  return tokens;
}

export function tokenizeFormula(formula: string | null | undefined): FormulaIngredient[] {
  if (!formula) {
    return [];
  }
  const parsed = parseFormula(formula);
  const normalizedParsed = normalizeTokens(parsed);
  if (normalizedParsed.length > 0) {
    return normalizedParsed;
  }
  return normalizeTokens(fallbackTokens(formula));
}

export function hashIngredients(tokens: FormulaIngredient[]): {
  hash: string | null;
  tokens: FormulaIngredient[];
} {
  const normalized = normalizeTokens(tokens);
  if (!normalized.length) {
    return { hash: null, tokens: [] };
  }
  const hash = hashFormulaIngredients(normalized);
  return { hash, tokens: normalized };
}

function computeHash(formula: string | null | undefined): {
  hash: string | null;
  tokens: FormulaIngredient[];
} {
  const tokens = tokenizeFormula(formula);
  if (!tokens.length) {
    return { hash: null, tokens };
  }
  const hash = hashFormulaIngredients(tokens);
  return { hash, tokens };
}

function computeSignature(colors: readonly CustomColorLike[] | null | undefined): string {
  if (!colors || colors.length === 0) {
    return '';
  }
  return colors
    .map(
      (color) => `${color?.id ?? color?.color_code ?? color?.code ?? ''}:${color?.formula ?? ''}`,
    )
    .join('|');
}

export function buildFormulaMatcherIndex<TColor extends CustomColorLike>(
  customColors: readonly TColor[] | null | undefined,
  previousIndex?: FormulaMatcherIndex<TColor>,
): FormulaMatcherIndex<TColor> {
  const colors = Array.isArray(customColors) ? customColors : [];
  const signature = computeSignature(colors);
  const baseStats = previousIndex?.stats ?? DEFAULT_STATS;

  if (previousIndex && signature === baseStats.signature) {
    return previousIndex;
  }

  const buckets = new Map<string, FormulaMatchEntry<TColor>[]>();

  colors.forEach((color) => {
    const formula = color?.formula ? String(color.formula) : '';
    if (!formula.trim()) {
      return;
    }
    const { hash, tokens } = computeHash(formula);
    if (!hash || !tokens.length) {
      return;
    }
    const entry: FormulaMatchEntry<TColor> = {
      id: color.id,
      colorCode: color.color_code || color.code || '',
      formula,
      tokens,
      color,
    };
    const bucket = buckets.get(hash);
    if (bucket) {
      bucket.push(entry);
    } else {
      buckets.set(hash, [entry]);
    }
  });

  const stats: FormulaMatcherStats = {
    version: baseStats.version + 1,
    builtAt: Date.now(),
    size: buckets.size,
    colorCount: colors.length,
    signature,
  };

  return { stats, buckets };
}

export function getCandidatesByHash<TColor extends CustomColorLike>(
  index: FormulaMatcherIndex<TColor>,
  hash: string | null | undefined,
): FormulaMatchEntry<TColor>[] {
  if (!hash) {
    return [];
  }
  const bucket = index.buckets.get(hash);
  if (!bucket) {
    return [];
  }
  return bucket.map(cloneEntry);
}

export interface FormulaMatchResult<TColor extends CustomColorLike = CustomColorLike> {
  hash: string | null;
  tokens: FormulaIngredient[];
  matches: FormulaMatchEntry<TColor>[];
}

export function getCandidatesByFormula<TColor extends CustomColorLike>(
  index: FormulaMatcherIndex<TColor>,
  formula: string | null | undefined,
): FormulaMatchResult<TColor> {
  const { hash, tokens } = computeHash(formula);
  const matches = getCandidatesByHash(index, hash);
  return { hash, tokens, matches };
}

export function getFormulaMatcherStats(index: FormulaMatcherIndex): FormulaMatcherStats {
  return { ...index.stats };
}
