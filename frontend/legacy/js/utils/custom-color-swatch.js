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

  function buildImageUrlFromPath(path, options = {}) {
    if (!path) return null;
    if (typeof options.buildURL === 'function' && options.baseURL) {
      return options.buildURL(options.baseURL, path);
    }
    if (options.baseURL) {
      const base = options.baseURL.replace(/\/$/, '');
      return `${base}/uploads/${path}`;
    }
    return path;
  }

  function buildImageUrl(color, options = {}) {
    const candidatePath = options.forceOriginal
      ? (color?.image_path || color?.image_thumb_path)
      : (color?.image_thumb_path || color?.image_path);
    return buildImageUrlFromPath(candidatePath, options);
  }

  function buildPreviewImageUrl(color, options = {}) {
    const candidatePath = color?.image_path || color?.image_thumb_path;
    return buildImageUrlFromPath(candidatePath, options);
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
      const previewUrl = buildPreviewImageUrl(color, options) || imageUrl;
      return {
        type: 'image',
        imageUrl,
        previewUrl,
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
