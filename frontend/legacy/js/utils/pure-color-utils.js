(function (window) {
  const DEFAULT_SWATCH_SIZE = 96;

  function ensureColorConverter() {
    if (!window.ColorConverter || typeof window.ColorConverter.extractColorFromImage !== 'function') {
      throw new Error('ColorConverter.extractColorFromImage is not available');
    }
    return window.ColorConverter;
  }

  function createSolidSwatchDataUrl(hex, size = DEFAULT_SWATCH_SIZE) {
    if (!hex) {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, size, size);
    return canvas.toDataURL('image/png');
  }

  async function computeAverageColorFromFile(imageFile, options = {}) {
    if (!imageFile) {
      throw new Error('No image file provided for average color computation');
    }
    const converter = ensureColorConverter();
    const colorInfo = await converter.extractColorFromImage(imageFile);
    const previewSize = options.previewSize || DEFAULT_SWATCH_SIZE;
    return {
      rgb: {
        r: colorInfo.r,
        g: colorInfo.g,
        b: colorInfo.b
      },
      hex: colorInfo.hex,
      cmyk: colorInfo.cmyk,
      previewDataUrl: createSolidSwatchDataUrl(colorInfo.hex, previewSize)
    };
  }

  window.PureColorUtils = {
    DEFAULT_SWATCH_SIZE,
    computeAverageColorFromFile,
    createSolidSwatchDataUrl
  };
})(window);
