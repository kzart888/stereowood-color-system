(function (window) {
  function buildUploadHelper(baseURL, helpers) {
    if (helpers && typeof helpers.buildUploadURL === 'function') {
      return helpers.buildUploadURL;
    }
    return function fallback(base, path) {
      if (!path) {
        return '';
      }
      const normalizedBase = (base || baseURL || window.location.origin || '').replace(/\/$/, '');
      const normalizedPath = String(path).replace(/^\/+/, '');
      const withPrefix = normalizedPath.startsWith('uploads/') ? normalizedPath : `uploads/${normalizedPath}`;
      return `${normalizedBase}/${withPrefix}`;
    };
  }

  function createArtworksStore(options = {}) {
    const state = {
      baseURL: options.baseURL || window.location.origin,
      helpers: options.helpers || window.helpers || null,
      customColors: [],
      colorMap: {}
    };

    function setBaseURL(url) {
      if (url) {
        state.baseURL = url;
      }
    }

    function setHelpers(helpers) {
      if (helpers) {
        state.helpers = helpers;
      }
    }

    function rebuildColorMap(list) {
      const map = {};
      (Array.isArray(list) ? list : []).forEach((color) => {
        if (!color) {
          return;
        }
        const code = color.code || color.colorCode || color.color_code;
        if (code) {
          map[code] = color;
        }
      });
      state.colorMap = map;
    }

    function setCustomColors(list) {
      state.customColors = Array.isArray(list) ? list : [];
      rebuildColorMap(state.customColors);
    }

    function getCustomColors() {
      return state.customColors;
    }

    function getColorByCode(code) {
      if (!code) {
        return null;
      }
      return state.colorMap[code] || null;
    }

    function resolveSwatchForColor(color, options = {}) {
      if (!color || !window.CustomColorSwatch || typeof window.CustomColorSwatch.resolveSwatch !== 'function') {
        return null;
      }
      const baseURL = options.baseURL || state.baseURL || window.location.origin;
      const helpers = options.helpers || state.helpers;
      const buildURL = buildUploadHelper(baseURL, helpers);
      try {
        return window.CustomColorSwatch.resolveSwatch(color, {
          baseURL,
          buildURL,
          includeColorConcentrate: !!options.includeColorConcentrate,
          forceOriginal: !!options.forceOriginal
        });
      } catch (error) {
        console.warn('[ArtworksStore] resolveSwatch error', error);
        return null;
      }
    }

    function resolveSwatchByCode(code, options = {}) {
      const color = getColorByCode(code);
      return color ? resolveSwatchForColor(color, options) : null;
    }

    function computeSwatchStyle(swatch) {
      if (!swatch) {
        return {};
      }
      if (swatch.type === 'image' && swatch.imageUrl) {
        return {
          backgroundImage: `url(${swatch.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      }
      if (swatch.type === 'pure' || swatch.type === 'color') {
        return swatch.style || {};
      }
      return {};
    }

    function getSwatchStyleByCode(code, options = {}) {
      return computeSwatchStyle(resolveSwatchByCode(code, options));
    }

    function getSwatchClassByCode(code, options = {}) {
      const swatch = resolveSwatchByCode(code, options);
      return {
        'no-image': !swatch || swatch.type === 'empty',
        'image-swatch': !!(swatch && swatch.type === 'image' && swatch.imageUrl)
      };
    }

    function getSwatchStyleForColor(color, options = {}) {
      return computeSwatchStyle(resolveSwatchForColor(color, options));
    }

    function getSwatchClassForColor(color, options = {}) {
      const swatch = resolveSwatchForColor(color, options);
      return {
        'no-image': !swatch || swatch.type === 'empty',
        'image-swatch': !!(swatch && swatch.type === 'image' && swatch.imageUrl)
      };
    }

    function toJSON() {
      return {
        baseURL: state.baseURL,
        colorCount: state.customColors.length
      };
    }

    return {
      setBaseURL,
      setHelpers,
      setCustomColors,
      getCustomColors,
      getColorByCode,
      resolveSwatchForColor,
      resolveSwatchByCode,
      computeSwatchStyle,
      getSwatchStyleByCode,
      getSwatchClassByCode,
      getSwatchStyleForColor,
      getSwatchClassForColor,
      toJSON
    };
  }

  window.ArtworksStore = {
    create: createArtworksStore
  };
})(window);
