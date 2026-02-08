import type { FormulaIngredient, FormulaLine, StructuredFormula } from '@/models/formula';

const TOKEN_SPLIT_RE = /\s+/;
const AMOUNT_WITH_UNIT_RE = /^(\d+(?:\.\d+)?)([a-zA-Z\u4e00-\u9fa5%]+)$/;
const NUMBER_ONLY_RE = /^\d+(?:\.\d+)?$/;
const UNIT_ONLY_RE = /^[a-zA-Z\u4e00-\u9fa5%]+$/;

function normalizeFormulaInput(input: unknown): string | null {
  if (input == null) {
    return null;
  }

  const normalized = String(input).trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseFormula(input: string | null | undefined): FormulaIngredient[] {
  const normalized = normalizeFormulaInput(input);
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(TOKEN_SPLIT_RE);
  const ingredients: FormulaIngredient[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const nameToken = tokens[i];
    if (!nameToken) {
      continue;
    }

    const next = tokens[i + 1];
    const next2 = tokens[i + 2];

    let consumed = 0;
    let base = 0;
    let unit = '';
    let valid = false;

    if (next && AMOUNT_WITH_UNIT_RE.test(next)) {
      const match = AMOUNT_WITH_UNIT_RE.exec(next);
      if (match) {
        base = Number.parseFloat(match[1]);
        unit = match[2];
        valid = Number.isFinite(base);
        consumed = 1;
      }
    } else if (next && NUMBER_ONLY_RE.test(next) && next2 && UNIT_ONLY_RE.test(next2)) {
      base = Number.parseFloat(next);
      unit = next2;
      valid = Number.isFinite(base);
      consumed = 2;
    }

    if (consumed > 0) {
      ingredients.push({
        name: nameToken,
        base: valid ? base : 0,
        unit,
        invalid: !valid,
      });
      i += consumed;
    } else {
      ingredients.push({
        name: nameToken,
        base: 0,
        unit: '',
        invalid: true,
      });
    }
  }

  return ingredients;
}

export function hashFormulaIngredients(
  ingredients: readonly FormulaIngredient[] | null | undefined,
): string {
  if (!ingredients || ingredients.length === 0) {
    return 'h0';
  }

  let accumulator = 0;
  ingredients.forEach((ingredient) => {
    const line = `${ingredient.name}|${ingredient.base}|${ingredient.unit}`;
    for (let index = 0; index < line.length; index += 1) {
      accumulator = (accumulator * 131 + line.charCodeAt(index)) >>> 0;
    }
  });
  return `h${accumulator.toString(16)}`;
}

export function formulaUnitBuckets(
  ingredients: readonly FormulaIngredient[] | null | undefined,
): string[] {
  if (!ingredients || ingredients.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const order: string[] = [];

  ingredients.forEach((ingredient) => {
    if (ingredient.invalid) {
      return;
    }
    const unit = ingredient.unit || '';
    if (!seen.has(unit)) {
      seen.add(unit);
      order.push(unit);
    }
  });

  return order;
}

export function splitFormulaSegments(input: string | null | undefined): string[] {
  const normalized = normalizeFormulaInput(input);
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(TOKEN_SPLIT_RE);
  const segments: string[] = [];
  let pending: string | null = null;

  tokens.forEach((token) => {
    const match = AMOUNT_WITH_UNIT_RE.exec(token);
    if (match && pending) {
      segments.push(`${pending} ${match[1]}${match[2]}`);
      pending = null;
    } else {
      if (pending) {
        segments.push(pending);
      }
      pending = token;
    }
  });

  if (pending) {
    segments.push(pending);
  }

  return segments;
}

export function structureFormula(input: string | null | undefined): StructuredFormula {
  const normalized = normalizeFormulaInput(input);
  if (!normalized) {
    return { lines: [], maxNameChars: 0 };
  }

  const tokens = normalized.split(TOKEN_SPLIT_RE);
  const lines: FormulaLine[] = [];
  let currentName: string | null = null;

  tokens.forEach((token) => {
    const match = AMOUNT_WITH_UNIT_RE.exec(token);
    if (match && currentName) {
      lines.push({
        name: currentName,
        amount: match[1],
        unit: match[2],
      });
      currentName = null;
    } else {
      if (currentName) {
        lines.push({
          name: currentName,
          amount: '',
          unit: '',
        });
      }
      currentName = token;
    }
  });

  if (currentName) {
    lines.push({
      name: currentName,
      amount: '',
      unit: '',
    });
  }

  const maxNameChars = lines.reduce(
    (max, line) => (line.name.length > max ? line.name.length : max),
    0,
  );

  return { lines, maxNameChars };
}
