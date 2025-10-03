(function (window) {
  const EXCLUDED_PURE_COLOR_CATEGORY_CODES = ['ES']; // 色精

  function normalizeHex(hex) {
    if (!hex) return null;
    const trimmed = String(hex).trim();
    if (!trimmed) return null;
    return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
  }

  function hasPureColor(color) {
    return !!(color && color.pure_hex_color && normalizeHex(color.pure_hex_color));
  }

  function shouldUsePureColor(color, options = {}) {
    if (!hasPureColor(color)) {
      return false;
    }
    if (options.forceOriginal) {
      return false;
    }
    const categoryCode = (color.category_code || color.categoryCode || '').toUpperCase();
    if (!options.includeColorConcentrate && EXCLUDED_PURE_COLOR_CATEGORY_CODES.includes(categoryCode)) {
      return false;
    }
    return true;
  }

  function buildImageUrl(color, options = {}) {
    if (!color || !color.image_path) return null;
    if (typeof options.buildURL === 'function' && options.baseURL) {
      return options.buildURL(options.baseURL, color.image_path);
    }
    if (options.baseURL) {
      const base = options.baseURL.replace(/\/$/, '');
      return `${base}/uploads/${color.image_path}`;
    }
    return color.image_path;
  }

  function deriveHexFromColor(color) {
    if (!color) return null;
    return normalizeHex(color.pure_hex_color || color.hex_color || color.hex);
  }

  function resolveSwatch(color, options = {}) {
    const pure = shouldUsePureColor(color, options);
    if (pure) {
      const hex = normalizeHex(color.pure_hex_color);
      return {
        type: 'pure',
        hex,
        style: hex ? { backgroundColor: hex } : {}
      };
    }

    const imageUrl = buildImageUrl(color, options);
    if (imageUrl) {
      return {
        type: 'image',
        imageUrl,
        style: { backgroundImage: `url(${imageUrl})` }
      };
    }

    const fallbackHex = deriveHexFromColor(color);
    if (fallbackHex) {
      return {
        type: 'color',
        hex: fallbackHex,
        style: { backgroundColor: fallbackHex }
      };
    }

    return {
      type: 'empty',
      style: {}
    };
  }

  window.CustomColorSwatch = {
    hasPureColor,
    shouldUsePureColor,
    resolveSwatch,
    normalizeHex
  };
})(window);
