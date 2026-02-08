import { describe, expect, it } from 'vitest';
import {
  formulaUnitBuckets,
  hashFormulaIngredients,
  parseFormula,
  splitFormulaSegments,
  structureFormula,
} from '@/utils/formula';

describe('parseFormula', () => {
  it('parses name followed by amount+unit pairs', () => {
    const ingredients = parseFormula('朱红 10g 钛白 5g');

    expect(ingredients).toEqual([
      { name: '朱红', base: 10, unit: 'g', invalid: false },
      { name: '钛白', base: 5, unit: 'g', invalid: false },
    ]);
  });

  it('parses tokens where amount and unit are separate', () => {
    const ingredients = parseFormula('Ultramarine 3 ml LemonYellow 2 g');

    expect(ingredients).toEqual([
      { name: 'Ultramarine', base: 3, unit: 'ml', invalid: false },
      { name: 'LemonYellow', base: 2, unit: 'g', invalid: false },
    ]);
  });

  it('marks entries as invalid when amount is missing', () => {
    const ingredients = parseFormula('Water ???');

    expect(ingredients).toEqual([
      { name: 'Water', base: 0, unit: '', invalid: true },
      { name: '???', base: 0, unit: '', invalid: true },
    ]);
  });
});

describe('hashFormulaIngredients', () => {
  it('returns deterministic hash for the same ingredient list', () => {
    const seed = parseFormula('朱红 10g 钛白 5g');
    const hashA = hashFormulaIngredients(seed);
    const hashB = hashFormulaIngredients([...seed]);

    expect(hashA).toBe('h13b89b93');
    expect(hashB).toBe(hashA);
  });

  it('returns h0 when no ingredients provided', () => {
    expect(hashFormulaIngredients([])).toBe('h0');
  });
});

describe('formulaUnitBuckets', () => {
  it('returns units in first occurrence order and skips invalid ones', () => {
    const ingredients = parseFormula('朱红 10ml 钛白 5g 锌白 na 素描 1ml');
    ingredients[2].invalid = true;

    expect(formulaUnitBuckets(ingredients)).toEqual(['ml', 'g']);
  });
});

describe('splitFormulaSegments', () => {
  it('groups adjacent amount tokens with their names', () => {
    expect(splitFormulaSegments('朱红 10g 钛白 5g Ultramarine 3 ml')).toEqual([
      '朱红 10g',
      '钛白 5g',
      'Ultramarine',
      '3',
      'ml',
    ]);
  });

  it('returns empty array for blank input', () => {
    expect(splitFormulaSegments('   ')).toEqual([]);
  });
});

describe('structureFormula', () => {
  it('structures formula into name, amount, and unit lines', () => {
    expect(structureFormula('朱红 10g 钛白 5g 群青')).toEqual({
      lines: [
        { name: '朱红', amount: '10', unit: 'g' },
        { name: '钛白', amount: '5', unit: 'g' },
        { name: '群青', amount: '', unit: '' },
      ],
      maxNameChars: 2,
    });
  });

  it('returns empty structure for missing values', () => {
    expect(structureFormula(null)).toEqual({ lines: [], maxNameChars: 0 });
  });
});
