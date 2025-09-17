(function (global) {
  const baseLogger = (global.createLogger ? global.createLogger('ArtworksFocus') : null);
  const fallbackLogger = baseLogger || (global.console || { warn() {}, error() {} });

  const focusMixin = {
    data() {
      return {
        _schemeRefs: new Map()
      };
    },
    methods: {
      setSchemeRef(scheme) {
        const id = scheme && scheme.id;
        return (el) => {
          if (!id) {
            return;
          }
          if (el) {
            this._schemeRefs.set(id, el);
          } else {
            this._schemeRefs.delete(id);
          }
        };
      },
      focusArtwork(id) {
        if (!id) {
          return;
        }
        this.$nextTick(() => {
          const selector = `.artwork-bar[data-art-id="${id}"]`;
          const el = typeof document !== 'undefined' ? document.querySelector(selector) : null;
          if (!el) {
            return;
          }
          try {
            const rect = el.getBoundingClientRect();
            const current = window.pageYOffset || document.documentElement.scrollTop || 0;
            const offset = current + rect.top - 20;
            window.scrollTo(0, Math.max(0, offset));
          } catch (error) {
            if (el.scrollIntoView) {
              el.scrollIntoView();
            }
          }
          if (el.classList && el.classList.add) {
            el.classList.add('highlight-pulse');
            setTimeout(() => {
              el.classList.remove('highlight-pulse');
            }, 2100);
          }
        });
      },
      focusSchemeUsage(options) {
        const payload = options || {};
        const schemeId = payload.schemeId;
        if (!schemeId) {
          return;
        }
        const artworks = Array.isArray(this.artworks) ? this.artworks : [];
        const targetIndex = artworks.findIndex((art) => art && art.id === payload.artworkId);
        if (targetIndex === -1) {
          fallbackLogger.warn && fallbackLogger.warn('focusSchemeUsage: artwork not found', payload);
          return;
        }
        const perPage = this.itemsPerPage === 0 ? artworks.length || 1 : this.itemsPerPage;
        const targetPage = perPage === 0 ? 1 : Math.floor(targetIndex / perPage) + 1;
        if (typeof this.goToPage === 'function' && targetPage !== this.currentPage) {
          this.goToPage(targetPage);
        } else if (targetPage !== this.currentPage) {
          this.currentPage = targetPage;
        }
        if (typeof this.setHighlight === 'function') {
          this.setHighlight({
            schemeId,
            layers: payload.layers,
            colorCode: payload.colorCode
          });
        }
        if (typeof this.scheduleHighlightClear === 'function') {
          this.scheduleHighlightClear(2000);
        }
        this.$nextTick(() => {
          const el = this._schemeRefs.get(schemeId);
          if (!el || !el.scrollIntoView) {
            if (!el && fallbackLogger.warn) {
              fallbackLogger.warn('focusSchemeUsage: scheme element not found', schemeId);
            }
            return;
          }
          try {
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight || document.documentElement.clientHeight || 0;
            const current = window.pageYOffset || document.documentElement.scrollTop || 0;
            const targetScroll = current + rect.top - (vh / 2 - rect.height / 2);
            window.scrollTo(0, Math.max(0, targetScroll));
          } catch (error) {
            try {
              el.scrollIntoView({ block: 'center' });
            } catch (fallbackError) {
              if (fallbackLogger.warn) {
                fallbackLogger.warn('focusSchemeUsage: scroll failed', fallbackError);
              }
            }
          }
        });
      }
    },
    beforeUnmount() {
      this._schemeRefs.clear();
    }
  };

  global.ArtworksFocusMixin = focusMixin;
})(typeof window !== 'undefined' ? window : globalThis);
