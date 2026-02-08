import { describe, expect, it } from 'vitest';
import {
  buildIngredientIndex,
  getIngredientIndexInfo,
  suggestIngredients,
} from '@/features/formula/ingredientSuggester';

describe('buildIngredientIndex & suggestIngredients', () => {
  const transliterator = (text: string) => {
    if (text === '朱红') {
      return 'zhu hong';
    }
    if (text === '钛白') {
      return 'tai bai';
    }
    return text.toLowerCase();
  };

  const index = buildIngredientIndex(
    {
      customColors: [
        { formula: '朱红 10g 钛白 5g' },
        { formula: 'Ultramarine 3ml TitaniumWhite 2ml' },
      ],
      rawMaterials: [
        { id: 1, name: 'Titanium White', code: 'RM-01' },
        { id: 2, name: 'Ultramarine Blue', code: 'RM-02' },
      ],
      manualSeeds: [
        '群青',
        { name: 'Burnt Sienna', weight: 3, unit: 'g' },
      ],
    },
    {
      transliterator,
      defaultLimit: 5,
    },
  );

  it('builds index with combined sources', () => {
    const info = getIngredientIndexInfo(index);
    expect(info.size).toBeGreaterThan(0);
    expect(info.signature).toContain('c:2');
  });

  it('returns top suggestions when query empty', () => {
    const suggestions = suggestIngredients(index, null, 3);
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].name).toBeDefined();
    expect(suggestions[0].sources.customColors).toBeGreaterThanOrEqual(0);
  });

  it('matches using transliterated names', () => {
    const suggestions = suggestIngredients(index, 'zhu', 5);
    expect(suggestions.find((item) => item.name === '朱红')).toBeDefined();
  });

  it('carries units and extras metadata', () => {
    const suggestions = suggestIngredients(index, 'titanium', 5);
    const titaniumColor = suggestions.find((item) => item.name === 'TitaniumWhite');
    const titaniumRaw = suggestions.find((item) => item.name === 'Titanium White');

    expect(titaniumColor?.units).toContain('ml');
    expect(titaniumRaw?.extras).toEqual(expect.arrayContaining(['RM-01']));
  });
});
