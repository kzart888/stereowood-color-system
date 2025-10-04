(function (window) {
  const consoleTag = '[FormulaMatcher]';

  let index = new Map();
  let lastSignature = '';
  let stats = {
    version: 0,
    builtAt: null,
    size: 0,
    colorCount: 0
  };

  function hasParser() {
    return !!(window.FormulaParser && typeof window.FormulaParser.parse === 'function' && typeof window.FormulaParser.hash === 'function');
  }

  function normalizeTokenList(tokens) {
    if (!Array.isArray(tokens)) {
      return [];
    }
    return tokens
      .map((token) => {
        const name = token && token.name ? String(token.name).trim() : '';
        const baseRaw = Number(token && token.base);
        const base = Number.isFinite(baseRaw) ? baseRaw : 0;
        const unit = token && token.unit ? String(token.unit).trim() : '';
        return name ? { name, base, unit } : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        const nameCmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        if (nameCmp !== 0) return nameCmp;
        const unitCmp = a.unit.localeCompare(b.unit, undefined, { sensitivity: 'base' });
        if (unitCmp !== 0) return unitCmp;
        return a.base - b.base;
      });
  }

  function parseWithParser(formula) {
    if (!hasParser()) {
      return [];
    }
    try {
      const parsed = window.FormulaParser.parse(formula || '') || [];
      const valid = parsed.filter((token) => token && token.name && !token.invalid);
      if (valid.length) {
        return normalizeTokenList(valid);
      }
    } catch (error) {
      console.warn(`${consoleTag} parse error`, error);
    }
    return [];
  }

  function parseWithFallback(formula) {
    const fallbackTokens = [];
    if (!formula) {
      return fallbackTokens;
    }
    if (window.formulaUtils && typeof window.formulaUtils.segments === 'function') {
      const segments = window.formulaUtils.segments(formula) || [];
      segments.forEach((segment) => {
        const trimmed = String(segment || '').trim();
        if (!trimmed) {
          return;
        }
        let namePart = trimmed;
        let restPart = '';
        const whitespaceParts = trimmed.split(/\s+/);
        if (whitespaceParts.length > 1) {
          namePart = whitespaceParts[0];
          restPart = whitespaceParts.slice(1).join('');
        }
        if (!restPart) {
          const contiguousMatch = trimmed.match(/^(.+?)([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
          if (contiguousMatch) {
            namePart = contiguousMatch[1].trim();
            restPart = `${contiguousMatch[2]}${contiguousMatch[3] || ''}`;
          }
        }
        const amountMatch = restPart.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)?$/);
        const amount = amountMatch ? Number(amountMatch[1]) : 0;
        const unit = amountMatch ? (amountMatch[2] || '') : '';
        const base = Number.isFinite(amount) ? amount : 0;
        const name = namePart.trim();
        if (name) {
          fallbackTokens.push({ name, base, unit });
        }
      });
    }
    return normalizeTokenList(fallbackTokens);
  }

  function tokenizeFormula(formula) {
    if (!formula || !String(formula).trim()) {
      return [];
    }
    const tokensFromParser = parseWithParser(formula);
    if (tokensFromParser.length) {
      return tokensFromParser;
    }
    return parseWithFallback(formula);
  }

  function hashTokens(tokens) {
    if (!tokens || !tokens.length) {
      return null;
    }
    if (hasParser()) {
      try {
        return window.FormulaParser.hash(tokens.map((token) => ({
          name: token.name,
          base: token.base,
          unit: token.unit
        })));
      } catch (error) {
        console.warn(`${consoleTag} hash error`, error);
      }
    }
    return tokens.map((token) => `${token.name}|${token.base}|${token.unit}`).join('::');
  }

  function computeSignature(colors) {
    return colors
      .map((color) => `${color.id || color.color_code || color.code || ''}:${color.formula || ''}`)
      .join('|');
  }

  function buildIndex(customColors = []) {
    const colors = Array.isArray(customColors) ? customColors : [];
    const signature = computeSignature(colors);
    if (signature === lastSignature) {
      return stats;
    }

    const nextIndex = new Map();
    colors.forEach((color) => {
      const formula = color && color.formula ? String(color.formula) : '';
      if (!formula) {
        return;
      }
      const tokens = tokenizeFormula(formula);
      if (!tokens.length) {
        return;
      }
      const hash = hashTokens(tokens);
      if (!hash) {
        return;
      }
      const bucket = nextIndex.get(hash) || [];
      bucket.push({
        id: color.id,
        colorCode: color.color_code || color.code || '',
        color,
        tokens,
        formula
      });
      nextIndex.set(hash, bucket);
    });

    index = nextIndex;
    lastSignature = signature;
    stats = {
      version: stats.version + 1,
      builtAt: Date.now(),
      size: index.size,
      colorCount: colors.length
    };
    return stats;
  }

  function cloneBucket(bucket) {
    if (!Array.isArray(bucket)) {
      return [];
    }
    return bucket.map((entry) => ({
      id: entry.id,
      colorCode: entry.colorCode,
      formula: entry.formula,
      tokens: entry.tokens,
      color: entry.color
    }));
  }

  function getCandidatesByHash(hash) {
    if (!hash) {
      return [];
    }
    const bucket = index.get(hash);
    return cloneBucket(bucket);
  }

  function getCandidatesByFormula(formula) {
    const tokens = tokenizeFormula(formula);
    const hash = hashTokens(tokens);
    return {
      hash,
      tokens,
      matches: getCandidatesByHash(hash)
    };
  }

  function hashFormula(formula) {
    const tokens = tokenizeFormula(formula);
    const hash = hashTokens(tokens);
    return { hash, tokens };
  }

  function hashTokensPublic(tokens = []) {
    const normalized = normalizeTokenList(tokens);
    const hash = hashTokens(normalized);
    return { hash, tokens: normalized };
  }

  function getStats() {
    return { ...stats };
  }

  window.FormulaMatcher = {
    buildIndex,
    hashFormula,
    hashTokens: hashTokensPublic,
    getCandidatesByFormula,
    getCandidatesByHash,
    tokenize: tokenizeFormula,
    getStats
  };
})(window);
