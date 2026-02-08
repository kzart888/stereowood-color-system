import { tokenizeFormula } from '@/features/formula/matcher';

export interface IngredientSuggestion {
  name: string;
  frequency: number;
  sources: {
    customColors: number;
    rawMaterials: number;
    manual: number;
  };
  units: string[];
  extras: string[];
}

export interface CustomColorForSuggestions {
  formula?: string | null;
}

export interface RawMaterialLike {
  id?: number | string | null;
  code?: string | null;
  name?: string | null;
  label?: string | null;
}

export type ManualSeed =
  | string
  | {
      name: string;
      weight?: number;
      unit?: string;
    };

export interface IngredientIndexData<
  TColor extends CustomColorForSuggestions = CustomColorForSuggestions,
  TRaw extends RawMaterialLike = RawMaterialLike,
  TSeed extends ManualSeed = ManualSeed,
> {
  customColors?: readonly TColor[] | null;
  rawMaterials?: readonly TRaw[] | null;
  manualSeeds?: readonly TSeed[] | null;
}

export interface IngredientIndexOptions {
  transliterator?: (input: string) => string | null | undefined;
  manualWeight?: number;
  rawMaterialWeight?: number;
  defaultLimit?: number;
}

interface InternalEntry {
  name: string;
  frequency: number;
  sources: {
    customColors: number;
    rawMaterials: number;
    manual: number;
  };
  units: Set<string>;
  extras: Set<string>;
  matchStrings: Set<string>;
  scoreBase: number;
}

interface IngredientIndexInternal {
  entries: InternalEntry[];
  signature: string;
  options: Required<IngredientIndexOptions>;
}

const DEFAULT_LIMIT = 12;

const DEFAULT_OPTIONS: Required<IngredientIndexOptions> = {
  transliterator: (input: string) => input.toLowerCase(),
  manualWeight: 1,
  rawMaterialWeight: 2,
  defaultLimit: DEFAULT_LIMIT,
};

function normalizeOptions(
  options: IngredientIndexOptions | null | undefined,
): Required<IngredientIndexOptions> {
  const merged = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  merged.transliterator =
    typeof merged.transliterator === 'function'
      ? merged.transliterator
      : DEFAULT_OPTIONS.transliterator;
  merged.manualWeight = Number.isFinite(merged.manualWeight)
    ? merged.manualWeight
    : DEFAULT_OPTIONS.manualWeight;
  merged.rawMaterialWeight = Number.isFinite(merged.rawMaterialWeight)
    ? merged.rawMaterialWeight
    : DEFAULT_OPTIONS.rawMaterialWeight;
  merged.defaultLimit = Number.isFinite(merged.defaultLimit)
    ? Math.max(1, Number(merged.defaultLimit))
    : DEFAULT_OPTIONS.defaultLimit;
  return merged;
}

function normalizeName(value: unknown): string {
  return value ? String(value).trim() : '';
}

function transliterateName(
  name: string,
  transliterator: (input: string) => string | null | undefined,
): string {
  try {
    const output = transliterator(name);
    if (output) {
      return String(output).toLowerCase();
    }
  } catch {
    // Ignore transliterator errors and fall through.
  }
  return name.toLowerCase();
}

function registerMatchStrings(
  entry: InternalEntry,
  transliterator: (input: string) => string | null | undefined,
) {
  const baseName = entry.name.toLowerCase();
  entry.matchStrings.add(baseName);
  entry.matchStrings.add(baseName.replace(/\s+/g, ''));

  const transliterated = transliterateName(entry.name, transliterator);
  if (transliterated && transliterated !== baseName) {
    entry.matchStrings.add(transliterated);
    entry.matchStrings.add(transliterated.replace(/\s+/g, ''));
  }
}

function ensureEntry(map: Map<string, InternalEntry>, name: string): InternalEntry {
  const key = name.toLowerCase();
  let entry = map.get(key);
  if (!entry) {
    entry = {
      name,
      frequency: 0,
      sources: {
        customColors: 0,
        rawMaterials: 0,
        manual: 0,
      },
      units: new Set<string>(),
      extras: new Set<string>(),
      matchStrings: new Set<string>(),
      scoreBase: 0,
    };
    map.set(key, entry);
  }
  return entry;
}

function addIngredient(
  map: Map<string, InternalEntry>,
  name: string,
  transliterator: (input: string) => string | null | undefined,
  options: {
    source: keyof InternalEntry['sources'];
    unit?: string | null;
    units?: readonly (string | null | undefined)[];
    displayExtra?: string | null;
    weight?: number;
  },
) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return;
  }
  const entry = ensureEntry(map, normalized);
  const weight = Number.isFinite(options.weight) && options.weight ? Number(options.weight) : 1;
  entry.frequency += weight;
  entry.sources[options.source] += weight;

  if (options.units) {
    options.units.forEach((unit) => {
      const normalizedUnit = normalizeName(unit);
      if (normalizedUnit) {
        entry.units.add(normalizedUnit);
      }
    });
  } else if (options.unit) {
    const normalizedUnit = normalizeName(options.unit);
    if (normalizedUnit) {
      entry.units.add(normalizedUnit);
    }
  }

  if (options.displayExtra) {
    const extra = normalizeName(options.displayExtra);
    if (extra) {
      entry.extras.add(extra);
    }
  }

  registerMatchStrings(entry, transliterator);
}

function parseCustomColorIngredients(
  map: Map<string, InternalEntry>,
  customColors: readonly CustomColorForSuggestions[] | null | undefined,
  transliterator: (input: string) => string | null | undefined,
) {
  if (!customColors) {
    return;
  }
  customColors.forEach((color) => {
    const formula = color?.formula ? String(color.formula) : '';
    if (!formula.trim()) {
      return;
    }
    const tokens = tokenizeFormula(formula);
    tokens.forEach((token) => {
      const name = normalizeName(token.name);
      if (!name) {
        return;
      }
      addIngredient(map, name, transliterator, {
        source: 'customColors',
        unit: token.unit,
        weight: 1,
      });
    });
  });
}

function parseRawMaterials(
  map: Map<string, InternalEntry>,
  rawMaterials: readonly RawMaterialLike[] | null | undefined,
  transliterator: (input: string) => string | null | undefined,
  weight: number,
) {
  if (!rawMaterials) {
    return;
  }
  rawMaterials.forEach((material) => {
    const name = normalizeName(material?.name ?? material?.label);
    if (!name) {
      return;
    }
    addIngredient(map, name, transliterator, {
      source: 'rawMaterials',
      displayExtra: String(material?.code ?? material?.id ?? ''),
      weight,
    });
  });
}

function parseManualSeeds(
  map: Map<string, InternalEntry>,
  seeds: readonly ManualSeed[] | null | undefined,
  transliterator: (input: string) => string | null | undefined,
  weight: number,
) {
  if (!seeds) {
    return;
  }
  seeds.forEach((seed) => {
    if (typeof seed === 'string') {
      addIngredient(map, seed, transliterator, {
        source: 'manual',
        weight,
      });
      return;
    }
    if (seed && seed.name) {
      addIngredient(map, seed.name, transliterator, {
        source: 'manual',
        weight: Number.isFinite(seed.weight) && seed.weight ? Number(seed.weight) : weight,
        unit: seed.unit,
      });
    }
  });
}

function computeSignature(data: IngredientIndexData): string {
  const parts: string[] = [];
  if (data.customColors?.length) {
    parts.push(`c:${data.customColors.length}`);
    data.customColors.forEach((color) => {
      parts.push(String((color as { id?: unknown }).id ?? ''));
      parts.push(String(color.formula ?? ''));
    });
  }
  if (data.rawMaterials?.length) {
    parts.push(`r:${data.rawMaterials.length}`);
    data.rawMaterials.forEach((material) => {
      parts.push(String(material.id ?? material.code ?? ''));
      parts.push(String(material.name ?? material.label ?? ''));
    });
  }
  if (data.manualSeeds?.length) {
    parts.push(`m:${data.manualSeeds.length}`);
    data.manualSeeds.forEach((seed) => {
      if (typeof seed === 'string') {
        parts.push(seed);
      } else if (seed && seed.name) {
        parts.push(seed.name);
      }
    });
  }
  return parts.join('|');
}

function finalizeEntries(map: Map<string, InternalEntry>): InternalEntry[] {
  const entries = Array.from(map.values()).map((entry) => {
    const units = Array.from(entry.units).filter(Boolean);
    const extras = Array.from(entry.extras).filter(Boolean);
    entry.scoreBase = entry.frequency * 10 + units.length * 2;
    return {
      ...entry,
      units: new Set(units),
      extras: new Set(extras),
    };
  });

  entries.sort((a, b) => {
    if (b.frequency !== a.frequency) {
      return b.frequency - a.frequency;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return entries;
}

export function buildIngredientIndex(
  data: IngredientIndexData,
  options?: IngredientIndexOptions,
): IngredientIndexInternal {
  const normalizedOptions = normalizeOptions(options);
  const signature = computeSignature(data);
  const map = new Map<string, InternalEntry>();

  parseCustomColorIngredients(map, data.customColors, normalizedOptions.transliterator);
  parseRawMaterials(
    map,
    data.rawMaterials,
    normalizedOptions.transliterator,
    normalizedOptions.rawMaterialWeight,
  );
  parseManualSeeds(
    map,
    data.manualSeeds,
    normalizedOptions.transliterator,
    normalizedOptions.manualWeight,
  );

  const entries = finalizeEntries(map);

  return {
    entries,
    signature,
    options: normalizedOptions,
  };
}

function scoreMatch(entry: InternalEntry, query: string, compactQuery: string): number {
  if (!query) {
    return entry.scoreBase;
  }
  let bestScore = 0;
  entry.matchStrings.forEach((candidate) => {
    if (!candidate) {
      return;
    }
    if (candidate.startsWith(query)) {
      bestScore = Math.max(bestScore, entry.scoreBase + 80);
    } else if (candidate.includes(query)) {
      bestScore = Math.max(bestScore, entry.scoreBase + 40);
    }
  });
  if (!bestScore && compactQuery) {
    entry.matchStrings.forEach((candidate) => {
      if (candidate.includes(compactQuery)) {
        bestScore = Math.max(bestScore, entry.scoreBase + 30);
      }
    });
  }
  return bestScore;
}

function toSuggestion(entry: InternalEntry): IngredientSuggestion {
  return {
    name: entry.name,
    frequency: entry.frequency,
    sources: { ...entry.sources },
    units: Array.from(entry.units),
    extras: Array.from(entry.extras),
  };
}

export function suggestIngredients(
  index: IngredientIndexInternal,
  query: string | null | undefined,
  limit?: number,
): IngredientSuggestion[] {
  const normalizedQuery = query ? String(query).trim().toLowerCase() : '';
  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  const maxResults =
    limit && Number.isFinite(limit) ? Math.max(1, Number(limit)) : index.options.defaultLimit;

  if (!normalizedQuery) {
    return index.entries.slice(0, maxResults).map(toSuggestion);
  }

  const scored: { entry: InternalEntry; score: number }[] = [];

  index.entries.forEach((entry) => {
    const score = scoreMatch(entry, normalizedQuery, compactQuery);
    if (score > 0) {
      scored.push({ entry, score });
    }
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.entry.frequency !== a.entry.frequency) {
      return b.entry.frequency - a.entry.frequency;
    }
    return a.entry.name.localeCompare(b.entry.name, undefined, { sensitivity: 'base' });
  });

  return scored.slice(0, maxResults).map(({ entry }) => toSuggestion(entry));
}

export function getIngredientIndexInfo(index: IngredientIndexInternal) {
  return {
    size: index.entries.length,
    signature: index.signature,
  };
}
