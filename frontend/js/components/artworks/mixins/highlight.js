(function (global) {
  const highlightMixin = {
    data() {
      return {
        highlightSchemeId: null,
        highlightLayers: [],
        highlightColorCode: '',
        _highlightTimer: null
      };
    },
    methods: {
      setHighlight(options) {
        const payload = options || {};
        this.highlightSchemeId = payload.schemeId || null;
        this.highlightColorCode = payload.colorCode || '';
        this.highlightLayers = Array.isArray(payload.layers)
          ? payload.layers.slice()
          : [];
      },
      scheduleHighlightClear(delay) {
        const timeout = typeof delay === 'number' ? delay : 2000;
        if (this._highlightTimer) {
          clearTimeout(this._highlightTimer);
          this._highlightTimer = null;
        }
        this._highlightTimer = setTimeout(() => {
          this.clearHighlight();
        }, timeout);
      },
      clearHighlight() {
        this.highlightSchemeId = null;
        this.highlightColorCode = '';
        this.highlightLayers = [];
        if (this._highlightTimer) {
          clearTimeout(this._highlightTimer);
          this._highlightTimer = null;
        }
      }
    },
    beforeUnmount() {
      if (this._highlightTimer) {
        clearTimeout(this._highlightTimer);
        this._highlightTimer = null;
      }
    }
  };

  global.ArtworksHighlightMixin = highlightMixin;
})(typeof window !== 'undefined' ? window : globalThis);
