// Configuration helper for test mode detection
// This utility helps components determine the appropriate items per page based on app config

window.ConfigHelper = {
    // Get items per page based on mode and component type
    getItemsPerPage(appConfig, componentType = 'default', savedValue = null) {
        // If app config is available and mode is test, use test mode items
        if (appConfig && appConfig.mode === 'test') {
            return appConfig.testModeItemsPerPage || 3;
        }
        
        // In production mode, prefer saved value if available
        if (savedValue !== null) {
            return savedValue;
        }
        
        // Default values for different components
        const defaults = {
            'custom-colors': 12,
            'artworks': 12,
            'mont-marte': 24,
            'default': 12
        };
        
        return defaults[componentType] || defaults['default'];
    },
    
    // Check if we're in test mode
    isTestMode(appConfig) {
        return appConfig && appConfig.mode === 'test';
    },
    
    // Log mode information for debugging
    logModeInfo(appConfig) {
        if (appConfig) {
            const mode = appConfig.mode || 'production';
            const itemsPerPage = appConfig.testModeItemsPerPage || 3;
            console.log(`App Mode: ${mode}${mode === 'test' ? ` (${itemsPerPage} items/page)` : ''}`);
        }
    }
};