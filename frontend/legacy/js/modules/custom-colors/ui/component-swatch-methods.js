(function (window) {
  window.CustomColorsSwatchMethods = {
        resolveColorSwatch(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.resolveColorSwatch === 'function') {
                return window.CustomColorsDomainUtils.resolveColorSwatch(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            if (!color || !window.CustomColorSwatch) {
                return null;
            }
            const baseURL = options.baseURL || this.baseURL || window.location.origin;
            const resolver = window.CustomColorSwatch.resolveSwatch;
            if (typeof resolver !== 'function') {
                return null;
            }
            const buildURL = this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                ? this.$helpers.buildUploadURL
                : ((base, path) => `${base.replace(/\/$/, '')}/uploads/${path}`);
            return resolver(color, {
                baseURL,
                buildURL,
                includeColorConcentrate: !!options.includeColorConcentrate,
                forceOriginal: !!options.forceOriginal
            });
        },

        getSwatchStyle(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.getSwatchStyle === 'function') {
                return window.CustomColorsDomainUtils.getSwatchStyle(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            const swatch = this.resolveColorSwatch(color, options);
            if (!swatch) return {};
            if (swatch.type === 'image') {
                return {};
            }
            return swatch.style || {};
        },

        swatchIsImage(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.swatchIsImage === 'function') {
                return window.CustomColorsDomainUtils.swatchIsImage(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            const swatch = this.resolveColorSwatch(color, options);
            return !!(swatch && swatch.type === 'image' && swatch.imageUrl);
        },

        swatchIsEmpty(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.swatchIsEmpty === 'function') {
                return window.CustomColorsDomainUtils.swatchIsEmpty(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            const swatch = this.resolveColorSwatch(color, options);
            return !swatch || swatch.type === 'empty';
        },

        swatchThumbnailClass(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.swatchThumbnailClass === 'function') {
                return window.CustomColorsDomainUtils.swatchThumbnailClass(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            return { 'no-image': this.swatchIsEmpty(color, options) };
        },

        getSwatchImage(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.getSwatchImage === 'function') {
                return window.CustomColorsDomainUtils.getSwatchImage(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            const swatch = this.resolveColorSwatch(color, options);
            return swatch && swatch.type === 'image' ? swatch.imageUrl : null;
        },

        previewColorSwatch(event, color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.previewColorSwatch === 'function') {
                const handled = window.CustomColorsDomainUtils.previewColorSwatch(event, color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined,
                    thumbPreview: this.$thumbPreview,
                    pureColorUtils: window.PureColorUtils
                });
                if (handled) return;
            }
            const swatch = this.resolveColorSwatch(color, options);
            if (!swatch || !this.$thumbPreview) {
                return;
            }
            if (swatch.type === 'image' && swatch.imageUrl) {
                this.$thumbPreview.show(event, swatch.imageUrl);
                return;
            }
            const hex = swatch && swatch.hex ? swatch.hex : (swatch && swatch.style && (swatch.style.background || swatch.style.backgroundColor));
            if (hex && window.PureColorUtils && typeof window.PureColorUtils.createSolidSwatchDataUrl === 'function') {
                const dataUrl = window.PureColorUtils.createSolidSwatchDataUrl(hex);
                this.$thumbPreview.show(event, dataUrl);
            }
        },
  };
})(window);
