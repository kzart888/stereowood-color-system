/**
 * Simple Debounce and Throttle Utilities
 * Simplified for small team maintenance (3-5 users)
 * @module utils/debounce-throttle
 */

(function(global) {
    'use strict';
    
    /**
     * Basic debounce function
     * Delays execution until after wait milliseconds have elapsed since last call
     * Perfect for search inputs and resize handlers
     * 
     * @param {Function} func - Function to debounce
     * @param {Number} wait - Milliseconds to wait (default: 250ms)
     * @returns {Function} Debounced function
     */
    function debounce(func, wait = 250) {
        let timeout;
        
        const debounced = function(...args) {
            const context = this;
            
            // Clear existing timeout
            clearTimeout(timeout);
            
            // Set new timeout
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
        
        // Allow manual cancellation
        debounced.cancel = function() {
            clearTimeout(timeout);
            timeout = null;
        };
        
        return debounced;
    }
    
    /**
     * Basic throttle function
     * Ensures function is called at most once per specified time period
     * Perfect for scroll and mousemove handlers
     * 
     * @param {Function} func - Function to throttle
     * @param {Number} wait - Milliseconds between calls (default: 250ms)
     * @returns {Function} Throttled function
     */
    function throttle(func, wait = 250) {
        let inThrottle;
        let lastFunc;
        let lastTime;
        
        return function(...args) {
            const context = this;
            
            if (!inThrottle) {
                // Execute immediately on first call
                func.apply(context, args);
                lastTime = Date.now();
                inThrottle = true;
                
                // Set timeout to reset throttle
                setTimeout(() => {
                    inThrottle = false;
                    
                    // Execute any pending call
                    if (lastFunc) {
                        lastFunc();
                        lastFunc = null;
                    }
                }, wait);
            } else {
                // Store last call to execute after throttle period
                lastFunc = () => func.apply(context, args);
            }
        };
    }
    
    /**
     * RequestAnimationFrame throttle
     * Ensures function runs at most once per animation frame (~16ms)
     * Perfect for animations and visual updates
     * 
     * @param {Function} func - Function to throttle
     * @returns {Function} RAF-throttled function
     */
    function rafThrottle(func) {
        let ticking = false;
        
        return function(...args) {
            const context = this;
            
            if (!ticking) {
                requestAnimationFrame(() => {
                    func.apply(context, args);
                    ticking = false;
                });
                ticking = true;
            }
        };
    }
    
    // Export for global use
    global.debounce = debounce;
    global.throttle = throttle;
    global.rafThrottle = rafThrottle;
    
    // Debug helper for development
    console.log('[Debounce/Throttle] Utilities loaded - keeping it simple for small team');
    
})(window);