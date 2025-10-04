(function (window) {
  const consoleTag = '[IngredientSuggester]';
  const DEFAULT_LIMIT = 12;

  let entryMap = new Map();
  let entries = [];
  let lastSignature = '';
  let transliterator = null;

  function setTransliterator(fn) {
    transliterator = typeof fn === 'function' ? fn : null;
  }

  function transliterate(text) {
    if (!text) {
      return '';
    }
    if (transliterator) {
      try {
        const result = transliterator(text);
        if (result) {
          return String(result).toLowerCase();
        }
      } catch (error) {
        console.warn(`${consoleTag} transliterator error`, error);
      }
    }
    if (window.pinyinPro && typeof window.pinyinPro.pinyin === 'function') {
      try {
        const output = window.pinyinPro.pinyin(text, { toneType: 'none', pattern: 'pinyin', type: 'array' });
        if (Array.isArray(output)) {
          return output.join('').toLowerCase();
        }
      } catch (error) {
        console.warn(`${consoleTag} pinyinPro error`, error);
      }
    }
    if (window.PinyinHelper && typeof window.PinyinHelper.GetPinyinString === 'function') {
      try {
        return window.PinyinHelper.GetPinyinString(text, '', false).toLowerCase();
      } catch (error) {
        console.warn(`${consoleTag} PinyinHelper error`, error);
      }
    }
    if (window.Pinyin && typeof window.Pinyin.getFullChars === 'function') {
      try {
        return window.Pinyin.getFullChars(text).toLowerCase();
      } catch (error) {
        console.warn(`${consoleTag} Pinyin error`, error);
      }
    }
    return String(text).toLowerCase();
  }

  function normalizeName(name) {
    return name ? String(name).trim() : '';
  }

  function ensureEntry(name) {
    const key = name.toLowerCase();
    let entry = entryMap.get(key);
    if (!entry) {
      entry = {
        name,
        frequency: 0,
        sources: {
          customColors: 0,
          rawMaterials: 0,
          manual: 0
        },
        units: new Set(),
        matchStrings: new Set(),
        displayExtras: new Set()
      };
      entryMap.set(key, entry);
    }
    return entry;
  }

  function registerMatchStrings(entry) {
    const baseName = entry.name.toLowerCase();
    entry.matchStrings.add(baseName);
    entry.matchStrings.add(baseName.replace(/\s+/g, ''));
    const transliterated = transliterate(entry.name);
    if (transliterated && transliterated !== baseName) {
      entry.matchStrings.add(transliterated);
      entry.matchStrings.add(transliterated.replace(/\s+/g, ''));
    }
  }

  function addIngredient(name, options = {}) {
    const normalized = normalizeName(name);
    if (!normalized) {
      return;
    }
    const entry = ensureEntry(normalized);
    entry.frequency += options.weight || 1;
    const sourceKey = options.source || 'customColors';
    if (entry.sources[sourceKey] !== undefined) {
      entry.sources[sourceKey] += options.weight || 1;
    }
    if (Array.isArray(options.units)) {
      options.units.forEach((unit) => {
        if (unit) {
          entry.units.add(String(unit));
        }
      });
    } else if (options.unit) {
      entry.units.add(String(options.unit));
    }
    if (options.displayExtra) {
      entry.displayExtras.add(String(options.displayExtra));
    }
    registerMatchStrings(entry);
  }

  function parseFormulaIngredients(customColors) {
    if (!Array.isArray(customColors)) {
      return;
    }
    customColors.forEach((color) => {
      const formula = color && color.formula ? String(color.formula) : '';
      if (!formula) {
        return;
      }
      let tokens = [];
      if (window.FormulaMatcher && typeof window.FormulaMatcher.tokenize === 'function') {
        tokens = window.FormulaMatcher.tokenize(formula);
      } else if (window.FormulaParser && typeof window.FormulaParser.parse === 'function') {
        try {
          tokens = window.FormulaParser.parse(formula) || [];
        } catch (error) {
          console.warn(`${consoleTag} parse fallback error`, error);
        }
      }
      if (!Array.isArray(tokens)) {
        return;
      }
      tokens.forEach((token) => {
        const name = normalizeName(token && token.name);
        if (!name) {
          return;
        }
        const unit = token && token.unit ? token.unit : '';
        addIngredient(name, {
          source: 'customColors',
          unit,
          weight: 1
        });
      });
    });
  }

  function parseRawMaterials(rawMaterials) {
    if (!Array.isArray(rawMaterials)) {
      return;
    }
    rawMaterials.forEach((material) => {
      const name = normalizeName(material && (material.name || material.label));
      if (!name) {
        return;
      }
      addIngredient(name, {
        source: 'rawMaterials',
        weight: 2,
        displayExtra: material.code || material.id || ''
      });
    });
  }

  function parseManualSeeds(seeds) {
    if (!Array.isArray(seeds)) {
      return;
    }
    seeds.forEach((seed) => {
      if (typeof seed === 'string') {
        addIngredient(seed, { source: 'manual', weight: 1 });
        return;
      }
      if (seed && seed.name) {
        addIngredient(seed.name, {
          source: 'manual',
          weight: seed.weight || 1,
          unit: seed.unit
        });
      }
    });
  }

  function computeSignature(data) {
    const parts = [];
    if (Array.isArray(data.customColors)) {
      parts.push(`c:${data.customColors.length}`);
      data.customColors.forEach((color) => {
        parts.push(color.id || color.color_code || color.code || '');
        parts.push(color.formula || '');
      });
    }
    if (Array.isArray(data.rawMaterials)) {
      parts.push(`r:${data.rawMaterials.length}`);
      data.rawMaterials.forEach((material) => {
        parts.push(material.id || material.code || '');
        parts.push(material.name || material.label || '');
      });
    }
    if (Array.isArray(data.manualSeeds)) {
      parts.push(`m:${data.manualSeeds.length}`);
      data.manualSeeds.forEach((seed) => {
        parts.push(seed && seed.name ? seed.name : String(seed));
      });
    }
    return parts.join('|');
  }

  function finalizeEntries() {
    entries = Array.from(entryMap.values()).map((entry) => {
      const units = Array.from(entry.units).filter(Boolean);
      const extras = Array.from(entry.displayExtras).filter(Boolean);
      const matchStrings = Array.from(entry.matchStrings);
      return {
        name: entry.name,
        frequency: entry.frequency,
        sources: { ...entry.sources },
        units,
        extras,
        matchStrings,
        scoreBase: entry.frequency * 10 + units.length * 2
      };
    });
    entries.sort((a, b) => {
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  function buildIndex(data = {}) {
    const signature = computeSignature(data);
    if (signature === lastSignature) {
      return entries.length;
    }
    entryMap = new Map();
    parseFormulaIngredients(data.customColors || []);
    parseRawMaterials(data.rawMaterials || []);
    parseManualSeeds(data.manualSeeds || []);
    finalizeEntries();
    lastSignature = signature;
    return entries.length;
  }

  function scoreMatch(entry, query, compact) {
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
    if (!bestScore && compact) {
      entry.matchStrings.forEach((candidate) => {
        if (!candidate) {
          return;
        }
        if (candidate.includes(compact)) {
          bestScore = Math.max(bestScore, entry.scoreBase + 30);
        }
      });
    }
    return bestScore;
  }

  function suggest(query, limit = DEFAULT_LIMIT) {
    const normalizedQuery = query ? String(query).trim().toLowerCase() : '';
    const compactQuery = normalizedQuery.replace(/\s+/g, '');
    if (!normalizedQuery) {
      return entries.slice(0, limit).map((entry) => ({
        name: entry.name,
        frequency: entry.frequency,
        sources: entry.sources,
        units: entry.units,
        extras: entry.extras
      }));
    }
    const scored = [];
    entries.forEach((entry) => {
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
    return scored.slice(0, limit).map(({ entry }) => ({
      name: entry.name,
      frequency: entry.frequency,
      sources: entry.sources,
      units: entry.units,
      extras: entry.extras
    }));
  }

  function info() {
    return {
      size: entries.length,
      lastSignature
    };
  }

  window.IngredientSuggester = {
    buildIndex,
    suggest,
    setTransliterator,
    info
  };
})(window);
