/**
 * Color Mapping Utilities
 * Maps colors to different coordinate systems and views
 */

/**
 * Map color to HSL grid position
 * @param {Object} hsl - HSL color {h, s, l}
 * @param {number} gridSize - Size of the grid (default 10)
 * @returns {Object} Grid position {row, col}
 */
function mapColorToGrid(hsl, gridSize = 10) {
    const step = 100 / gridSize;
    
    // Column is saturation (0-100)
    const col = Math.floor(hsl.s / step);
    
    // Row is lightness (100-0, inverted so light is on top)
    const row = Math.floor((100 - hsl.l) / step);
    
    return {
        row: Math.min(Math.max(0, row), gridSize - 1),
        col: Math.min(Math.max(0, col), gridSize - 1)
    };
}

/**
 * Map color to wheel coordinates
 * @param {Object} hsl - HSL color {h, s, l}
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} maxRadius - Maximum radius of wheel
 * @returns {Object} Coordinates {x, y, radius, angle}
 */
function mapColorToWheel(hsl, centerX, centerY, maxRadius) {
    // Angle is hue (0-360°)
    const angle = hsl.h;
    
    // Radius is saturation (0-100% of max radius)
    const radius = (hsl.s / 100) * maxRadius;
    
    // Convert polar to Cartesian
    const angleRad = (angle - 90) * Math.PI / 180; // -90 to start from top
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    
    // Size based on lightness (lighter = bigger)
    const size = 4 + (hsl.l / 100) * 8;
    
    return { x, y, radius, angle, size };
}

/**
 * Find grid cell for a given HSL position
 * @param {number} hue - Target hue
 * @param {number} row - Grid row
 * @param {number} col - Grid column
 * @param {number} gridSize - Size of grid
 * @returns {Object} HSL values for that cell
 */
function getGridCellHSL(hue, row, col, gridSize = 10) {
    const step = 100 / gridSize;
    
    return {
        h: hue,
        s: col * step + step / 2, // Center of cell
        l: 100 - (row * step + step / 2) // Inverted, center of cell
    };
}

/**
 * Check if color is within tolerance of target
 * @param {Object} color - Color HSL {h, s, l}
 * @param {Object} target - Target HSL {h, s, l}
 * @param {Object} tolerance - Tolerance {h, s, l}
 * @returns {boolean} Whether color is within tolerance
 */
function isColorInRange(color, target, tolerance = { h: 10, s: 15, l: 15 }) {
    const hDiff = Math.abs(color.h - target.h);
    const sDiff = Math.abs(color.s - target.s);
    const lDiff = Math.abs(color.l - target.l);
    
    // Handle hue wrapping (0-360)
    const hueInRange = Math.min(hDiff, 360 - hDiff) <= tolerance.h;
    
    return hueInRange && sDiff <= tolerance.s && lDiff <= tolerance.l;
}

/**
 * Group colors by grid cells
 * @param {Array} colors - Array of colors with HSL values
 * @param {number} targetHue - Target hue for filtering
 * @param {number} gridSize - Size of grid
 * @returns {Object} Colors grouped by grid position
 */
function groupColorsByGrid(colors, targetHue, gridSize = 10) {
    const groups = {};
    
    colors.forEach(color => {
        if (!color.hsl) return;
        
        // Check if color is in hue range
        const hueDiff = Math.abs(color.hsl.h - targetHue);
        if (Math.min(hueDiff, 360 - hueDiff) > 15) return;
        
        const pos = mapColorToGrid(color.hsl, gridSize);
        const key = `${pos.row}-${pos.col}`;
        
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(color);
    });
    
    return groups;
}

/**
 * Calculate optimal grid size based on color count
 * @param {number} colorCount - Number of colors
 * @returns {number} Optimal grid size (5-20)
 */
function getOptimalGridSize(colorCount) {
    if (colorCount < 20) return 5;
    if (colorCount < 50) return 8;
    if (colorCount < 100) return 10;
    if (colorCount < 200) return 12;
    if (colorCount < 500) return 15;
    return 20;
}

/**
 * Create gradient CSS for hue slider
 * @returns {string} CSS gradient string
 */
function createHueGradient() {
    const stops = [];
    for (let h = 0; h <= 360; h += 30) {
        const rgb = hslToRgb(h, 100, 50);
        const percent = (h / 360) * 100;
        stops.push(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b}) ${percent}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
}

/**
 * Create gradient CSS for saturation-lightness cell
 * @param {number} hue - Fixed hue value
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} CSS color string
 */
function createSLCellColor(hue, s, l) {
    const rgb = hslToRgb(hue, s, l);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
 * Sort colors by visual similarity
 * @param {Array} colors - Array of colors with LAB values
 * @param {Object} referenceColor - Reference color with LAB values
 * @returns {Array} Sorted colors by similarity
 */
function sortColorsBySimilarity(colors, referenceColor) {
    if (!referenceColor || !referenceColor.lab) return colors;
    
    return colors.slice().sort((a, b) => {
        if (!a.lab || !b.lab) return 0;
        
        const distA = deltaE2000(a.lab, referenceColor.lab);
        const distB = deltaE2000(b.lab, referenceColor.lab);
        
        return distA - distB;
    });
}

/**
 * Get dominant colors from a color array
 * @param {Array} colors - Array of colors
 * @param {number} count - Number of dominant colors to return
 * @returns {Array} Dominant colors
 */
function getDominantColors(colors, count = 5) {
    if (colors.length <= count) return colors;
    
    // Simple clustering by hue
    const hueBuckets = {};
    
    colors.forEach(color => {
        if (!color.hsl) return;
        
        // Group by 30-degree hue buckets
        const bucket = Math.floor(color.hsl.h / 30) * 30;
        if (!hueBuckets[bucket]) {
            hueBuckets[bucket] = [];
        }
        hueBuckets[bucket].push(color);
    });
    
    // Get representative from each bucket
    const representatives = [];
    Object.values(hueBuckets).forEach(bucket => {
        // Pick the color with median saturation and lightness
        bucket.sort((a, b) => {
            const scoreA = Math.abs(a.hsl.s - 50) + Math.abs(a.hsl.l - 50);
            const scoreB = Math.abs(b.hsl.s - 50) + Math.abs(b.hsl.l - 50);
            return scoreA - scoreB;
        });
        representatives.push(bucket[0]);
    });
    
    // Return top N
    return representatives.slice(0, count);
}

// Export for use in components
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mapColorToGrid,
        mapColorToWheel,
        getGridCellHSL,
        isColorInRange,
        groupColorsByGrid,
        getOptimalGridSize,
        createHueGradient,
        createSLCellColor,
        sortColorsBySimilarity,
        getDominantColors
    };
}