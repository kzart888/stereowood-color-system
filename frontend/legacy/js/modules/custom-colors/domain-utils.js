(function (window) {
  function defaultBuildUploadURL(baseURL, path) {
    if (!path) return '';
    const base = String(baseURL || window.location.origin || '').replace(/\/$/, '');
    const normalizedPath = String(path).replace(/^\/+/, '');
    const withPrefix = normalizedPath.startsWith('uploads/') ? normalizedPath : `uploads/${normalizedPath}`;
    return `${base}/${withPrefix}`;
  }

  function normalizePantoneCode(value, options = {}) {
    const helperFn =
      options.normalizePantoneCode ||
      (window.helpers && typeof window.helpers.normalizePantoneCode === 'function'
        ? window.helpers.normalizePantoneCode
        : null);
    if (typeof helperFn === 'function') {
      return helperFn(value);
    }
    if (value === null || value === undefined) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    let code = raw.replace(/^PANTON(E)?\s+/i, '');
    code = code.replace(/\s+/g, ' ').trim();
    const suffixMatch = code.match(/^(.*?)(\s+)?([cCuU])$/);
    if (!suffixMatch) return code;

    const base = suffixMatch[1].trim();
    const suffix = suffixMatch[3].toUpperCase();
    const baseCompact = base.replace(/\s+/g, '');
    if (/^\d+[A-Z]?$/i.test(baseCompact)) {
      return `${baseCompact.toUpperCase()}${suffix}`;
    }
    return `${base} ${suffix}`.replace(/\s+/g, ' ').trim();
  }

  function resolveColorSwatch(color, options = {}) {
    if (!color || !window.CustomColorSwatch || typeof window.CustomColorSwatch.resolveSwatch !== 'function') {
      return null;
    }
    const baseURL = options.baseURL || window.location.origin;
    const buildUploadURL = options.buildUploadURL || defaultBuildUploadURL;
    return window.CustomColorSwatch.resolveSwatch(color, {
      baseURL,
      buildURL: buildUploadURL,
      includeColorConcentrate: !!options.includeColorConcentrate,
      forceOriginal: !!options.forceOriginal,
    });
  }

  function getSwatchStyle(color, options = {}) {
    const swatch = resolveColorSwatch(color, options);
    if (!swatch || swatch.type === 'image') return {};
    return swatch.style || {};
  }

  function swatchIsImage(color, options = {}) {
    const swatch = resolveColorSwatch(color, options);
    return !!(swatch && swatch.type === 'image' && swatch.imageUrl);
  }

  function swatchIsEmpty(color, options = {}) {
    const swatch = resolveColorSwatch(color, options);
    return !swatch || swatch.type === 'empty';
  }

  function swatchThumbnailClass(color, options = {}) {
    return { 'no-image': swatchIsEmpty(color, options) };
  }

  function getSwatchImage(color, options = {}) {
    const swatch = resolveColorSwatch(color, options);
    return swatch && swatch.type === 'image' ? swatch.imageUrl : null;
  }

  function previewColorSwatch(event, color, options = {}) {
    const swatch = resolveColorSwatch(color, options);
    const thumbPreview = options.thumbPreview;
    if (!swatch || !thumbPreview || typeof thumbPreview.show !== 'function') {
      return false;
    }
    if (swatch.type === 'image' && swatch.imageUrl) {
      thumbPreview.show(event, swatch.imageUrl);
      return true;
    }

    const pureColorUtils = options.pureColorUtils || window.PureColorUtils;
    const hex =
      (swatch && swatch.hex) ||
      (swatch && swatch.style && (swatch.style.background || swatch.style.backgroundColor));
    if (hex && pureColorUtils && typeof pureColorUtils.createSolidSwatchDataUrl === 'function') {
      const dataUrl = pureColorUtils.createSolidSwatchDataUrl(hex);
      thumbPreview.show(event, dataUrl);
      return true;
    }
    return false;
  }

  function normalizeHexValue(hex, options = {}) {
    if (!hex) return null;
    const customColorSwatch = options.customColorSwatch || window.CustomColorSwatch;
    if (customColorSwatch && typeof customColorSwatch.normalizeHex === 'function') {
      return customColorSwatch.normalizeHex(hex);
    }

    const colorConverter = options.colorConverter || window.ColorConverter;
    if (colorConverter && typeof colorConverter.formatHex === 'function') {
      return colorConverter.formatHex(hex);
    }

    const trimmed = String(hex).trim();
    if (!trimmed) return null;
    return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
  }

  function buildPureColorStateFromExisting(color, options = {}) {
    if (!color) return null;
    const colorConverter = options.colorConverter || window.ColorConverter;
    const pureColorUtils = options.pureColorUtils || window.PureColorUtils;
    const hex = normalizeHexValue(color.pure_hex_color, options);
    if (!hex) return null;

    let rgb = null;
    if ([color.pure_rgb_r, color.pure_rgb_g, color.pure_rgb_b].every((v) => v !== null && v !== undefined)) {
      rgb = {
        r: Number(color.pure_rgb_r),
        g: Number(color.pure_rgb_g),
        b: Number(color.pure_rgb_b),
      };
    } else if (colorConverter && typeof colorConverter.hexToRgb === 'function') {
      const converted = colorConverter.hexToRgb(hex);
      if (converted) {
        rgb = { r: Number(converted.r), g: Number(converted.g), b: Number(converted.b) };
      }
    }

    let cmyk = null;
    if (colorConverter && rgb && typeof colorConverter.rgbToCmyk === 'function') {
      cmyk = colorConverter.rgbToCmyk(rgb.r, rgb.g, rgb.b);
    }

    const previewDataUrl =
      pureColorUtils && typeof pureColorUtils.createSolidSwatchDataUrl === 'function'
        ? pureColorUtils.createSolidSwatchDataUrl(hex)
        : null;

    return {
      hex,
      rgb,
      cmyk,
      generatedAt: color.pure_generated_at || null,
      previewDataUrl,
    };
  }

  function getCMYKColor(c, m, y, k, options = {}) {
    const colorConverter = options.colorConverter || window.ColorConverter;
    if (colorConverter && typeof colorConverter.cmykToRgb === 'function') {
      const rgb = colorConverter.cmykToRgb(c, m, y, k);
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }
    return '#f5f5f5';
  }

  function getPantoneSwatchStyle(pantoneCode, options = {}) {
    const pantoneHelper = options.pantoneHelper || window.PantoneHelper;
    if (!pantoneCode || !pantoneHelper || typeof pantoneHelper.getColorByName !== 'function') {
      return { background: '#f5f5f5', border: '1px dashed #ccc' };
    }
    const normalized = normalizePantoneCode(pantoneCode, options) || pantoneCode;
    let color = pantoneHelper.getColorByName(normalized);
    if (!color && normalized !== pantoneCode) {
      color = pantoneHelper.getColorByName(pantoneCode);
    }
    if (color && color.rgb) {
      return {
        background: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
        border: '1px solid rgba(0, 0, 0, 0.15)',
      };
    }
    return { background: '#f5f5f5', border: '1px dashed #ccc' };
  }

  window.CustomColorsDomainUtils = {
    normalizePantoneCode,
    resolveColorSwatch,
    getSwatchStyle,
    swatchIsImage,
    swatchIsEmpty,
    swatchThumbnailClass,
    getSwatchImage,
    previewColorSwatch,
    normalizeHexValue,
    buildPureColorStateFromExisting,
    getCMYKColor,
    getPantoneSwatchStyle,
  };
})(window);
