/**
 * Color Conversion Utilities
 * Provides RGB, HSL, and LAB color space conversions
 */

/**
 * Convert RGB to HSL
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Object} HSL values {h: 0-360, s: 0-100, l: 0-100}
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: 
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6; 
                break;
            case g: 
                h = ((b - r) / d + 2) / 6; 
                break;
            case b: 
                h = ((r - g) / d + 4) / 6; 
                break;
        }
    }
    
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {Object} RGB values {r: 0-255, g: 0-255, b: 0-255}
 */
function hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * Convert RGB to LAB color space
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Object} LAB values {L: 0-100, a: -128-127, b: -128-127}
 */
function rgbToLab(r, g, b) {
    // First convert to XYZ
    r = r / 255;
    g = g / 255;
    b = b / 255;

    // Gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Observer = 2°, Illuminant = D65
    let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
    let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100;
    let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100;

    // Normalize for D65 illuminant
    x = x / 95.047;
    y = y / 100.000;
    z = z / 108.883;

    // Convert to LAB
    const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

    return {
        L: (116 * fy) - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz)
    };
}

/**
 * Convert LAB to RGB color space
 * @param {number} L - Lightness (0-100)
 * @param {number} a - Green-Red (-128-127)
 * @param {number} b - Blue-Yellow (-128-127)
 * @returns {Object} RGB values {r: 0-255, g: 0-255, b: 0-255}
 */
function labToRgb(L, a, b) {
    // Convert to XYZ
    let y = (L + 16) / 116;
    let x = a / 500 + y;
    let z = y - b / 200;

    const y3 = Math.pow(y, 3);
    const x3 = Math.pow(x, 3);
    const z3 = Math.pow(z, 3);

    y = y3 > 0.008856 ? y3 : (y - 16/116) / 7.787;
    x = x3 > 0.008856 ? x3 : (x - 16/116) / 7.787;
    z = z3 > 0.008856 ? z3 : (z - 16/116) / 7.787;

    // D65 illuminant
    x = x * 95.047;
    y = y * 100.000;
    z = z * 108.883;

    // Convert to RGB
    x = x / 100;
    y = y / 100;
    z = z / 100;

    let r = x *  3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.9692660 + y *  1.8760108 + z *  0.0415560;
    let bVal = x *  0.0556434 + y * -0.2040259 + z *  1.0572252;

    // Gamma correction
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
    bVal = bVal > 0.0031308 ? 1.055 * Math.pow(bVal, 1/2.4) - 0.055 : 12.92 * bVal;

    return {
        r: Math.max(0, Math.min(255, Math.round(r * 255))),
        g: Math.max(0, Math.min(255, Math.round(g * 255))),
        b: Math.max(0, Math.min(255, Math.round(bVal * 255)))
    };
}

/**
 * Parse hex color to RGB
 * @param {string} hex - Hex color string (#RRGGBB or #RGB)
 * @returns {Object} RGB values {r: 0-255, g: 0-255, b: 0-255}
 */
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Handle 3-digit hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

/**
 * Convert RGB to hex color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color string (#RRGGBB)
 */
function rgbToHex(r, g, b) {
    const toHex = (n) => {
        const hex = Math.round(n).toString(16).padStart(2, '0');
        return hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Extract RGB from CSS color string
 * @param {string} color - CSS color string (rgb, rgba, hex, or named)
 * @returns {Object|null} RGB values or null if invalid
 */
function parseColorString(color) {
    if (!color) return null;
    
    // Handle hex colors
    if (color.startsWith('#')) {
        return hexToRgb(color);
    }
    
    // Handle rgb/rgba
    const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1]),
            g: parseInt(rgbMatch[2]),
            b: parseInt(rgbMatch[3])
        };
    }
    
    // For named colors, create a temporary element
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div).color;
    document.body.removeChild(div);
    
    return parseColorString(computed);
}

// Export for use in Vue components
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        rgbToHsl,
        hslToRgb,
        rgbToLab,
        labToRgb,
        hexToRgb,
        rgbToHex,
        parseColorString
    };
}