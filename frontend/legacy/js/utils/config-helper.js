// Configuration helper for test mode detection
// This utility helps components determine the appropriate items per page based on app config

window.ConfigHelper = {
    // Normalize page-size input to supported values.
    normalizeItemsPerPage(value, fallback = 24, options = {}) {
        const allowNull = Boolean(options.allowNull);
        if (value === null || value === undefined || value === '') {
            return allowNull ? null : fallback;
        }

        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed)) {
            return allowNull ? null : fallback;
        }

        const allowed = new Set([0, 12, 24, 48]);
        if (allowed.has(parsed)) {
            return parsed;
        }

        return allowNull ? null : fallback;
    },

    // Get items per page based on mode and component type
    getItemsPerPage(appConfig, componentType = 'default', savedValue = null) {
        // Default values for different components
        const defaults = {
            'custom-colors': 24,
            'artworks': 24,
            'mont-marte': 24,
            'default': 24
        };

        const fallback = defaults[componentType] || defaults['default'];

        // Prefer saved value if available (and valid)
        const normalizedSaved = this.normalizeItemsPerPage(savedValue, null, { allowNull: true });
        if (normalizedSaved !== null) {
            return normalizedSaved;
        }

        // Test-mode config remains supported, but still normalized to supported page sizes.
        if (appConfig && appConfig.mode === 'test') {
            return this.normalizeItemsPerPage(appConfig.testModeItemsPerPage, fallback);
        }

        return fallback;
    },
    
    // Check if we're in test mode
    isTestMode(appConfig) {
        return appConfig && appConfig.mode === 'test';
    }
};
