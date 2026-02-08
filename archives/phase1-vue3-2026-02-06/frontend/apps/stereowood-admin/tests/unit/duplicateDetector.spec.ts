import { describe, expect, it } from 'vitest';
import {
  buildRatioSignature,
  detectDuplicateOnSave,
  groupByRatioSignature,
  parseRatioSignature,
} from '@/features/formula/duplicateDetector';

describe('buildRatioSignature', () => {
  it('produces consistent signature regardless of ingredient order', () => {
    const sigA = buildRatioSignature('朱红 10g 钛白 5g');
    const sigB = buildRatioSignature('钛白 5 g 朱红 10 g');

    expect(sigA).toBe(sigB);
  });

  it('normalises proportional formulas', () => {
    const sigA = buildRatioSignature('Red 2g Blue 4g');
    const sigB = buildRatioSignature('Blue 8 g Red 4 g');
    expect(sigA).toBe(sigB);
  });

  it('falls back to floating ratios when values collapse to zero', () => {
    const tinySig = buildRatioSignature('PigmentA 0.000001g PigmentB 0.000002g');
    expect(tinySig).toContain('pigmenta');
    expect(tinySig).toContain('pigmentb');
  });
});

describe('groupByRatioSignature', () => {
  const records = [
    { id: 1, formula: '朱红 10g 钛白 5g' },
    { id: 2, formula: '钛白 5 g 朱红 10 g' },
    { id: 3, formula: 'Ultramarine 3ml LemonYellow 2ml' },
  ];

  it('groups records sharing the same ratio signature', () => {
    const groups = groupByRatioSignature(records);
    const signatures = Object.keys(groups);
    expect(signatures).toHaveLength(1);
    expect(groups[signatures[0]].map((item) => item.id)).toEqual([1, 2]);
  });
});

describe('detectDuplicateOnSave', () => {
  const all = [
    { id: 1, formula: '朱红 10g 钛白 5g' },
    { id: 2, formula: '钛白 5 g 朱红 10 g' },
    { id: 3, formula: 'Ultramarine 3ml LemonYellow 2ml' },
  ];

  it('returns null when no duplicates found', () => {
    const result = detectDuplicateOnSave(all[2], all);
    expect(result).toBeNull();
  });

  it('returns duplicate group when multiple matches exist', () => {
    const result = detectDuplicateOnSave(all[0], all);
    expect(result).not.toBeNull();
    expect(result?.records.map((item) => item.id)).toEqual([1, 2]);
  });
});

describe('parseRatioSignature', () => {
  it('extracts items and ratios from signature string', () => {
    const signature = buildRatioSignature('朱红 10g 钛白 5g');
    const parsed = parseRatioSignature(signature);

    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]).toHaveProperty('name');
    expect(parsed.ratios).toHaveLength(2);
  });
});
