import { describe, expect, it } from 'vitest';
import {
  buildFormulaMatcherIndex,
  getCandidatesByFormula,
  getCandidatesByHash,
  getFormulaMatcherStats,
  hashIngredients,
  tokenizeFormula,
} from '@/features/formula/matcher';

describe('tokenizeFormula', () => {
  it('parses ingredients using primary parser', () => {
    const tokens = tokenizeFormula('朱红 10g 钛白 5g');
    const normalized = [...tokens].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    const expected = [
      { name: '朱红', base: 10, unit: 'g', invalid: false },
      { name: '钛白', base: 5, unit: 'g', invalid: false },
    ].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    expect(normalized).toEqual(expected);
  });

  it('falls back to contiguous parsing when no parser output', () => {
    const tokens = tokenizeFormula('BurntSienna10g TitaniumWhite5g');
    expect(tokens).toEqual([
      { name: 'BurntSienna', base: 10, unit: 'g', invalid: false },
      { name: 'TitaniumWhite', base: 5, unit: 'g', invalid: false },
    ]);
  });
});

describe('buildFormulaMatcherIndex', () => {
  const colors = [
    { id: 1, color_code: 'CL001', formula: '朱红 10g 钛白 5g' },
    { id: 2, color_code: 'CL002', formula: 'Ultramarine 3 ml LemonYellow 2 g' },
    { id: 3, color_code: 'CL003', formula: '' },
  ];

  it('indexes formulas by hashed tokens', () => {
    const index = buildFormulaMatcherIndex(colors);
    const result = getCandidatesByFormula(index, '钛白 5g 朱红 10g');

    expect(result.hash).toBeTruthy();
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].colorCode).toBe('CL001');
  });

  it('returns identical index when signature unchanged', () => {
    const index1 = buildFormulaMatcherIndex(colors);
    const index2 = buildFormulaMatcherIndex(colors, index1);

    expect(index2).toBe(index1);
    expect(getFormulaMatcherStats(index2).colorCount).toBe(3);
  });

  it('supports lookup by hash', () => {
    const index = buildFormulaMatcherIndex(colors);
    const { hash } = getCandidatesByFormula(index, 'Ultramarine 3ml LemonYellow 2g');
    const matches = getCandidatesByHash(index, hash);

    expect(matches).toHaveLength(1);
    expect(matches[0].colorCode).toBe('CL002');
  });
});

describe('hashIngredients', () => {
  it('normalises ingredient order before hashing', () => {
    const first = hashIngredients([
      { name: '钛白', base: 5, unit: 'g', invalid: false },
      { name: '朱红', base: 10, unit: 'g', invalid: false },
    ]);
    const second = hashIngredients([
      { name: '朱红', base: 10, unit: 'g', invalid: false },
      { name: '钛白', base: 5, unit: 'g', invalid: false },
    ]);

    expect(first.hash).toBe(second.hash);
    expect(first.tokens).toEqual(second.tokens);
  });
});
