(function(window) {
    'use strict';

    function isValidRGB(r, g, b) {
        return Number.isInteger(r) && r >= 0 && r <= 255 &&
               Number.isInteger(g) && g >= 0 && g <= 255 &&
               Number.isInteger(b) && b >= 0 && b <= 255;
    }

    function isValidCMYK(c, m, y, k) {
        return typeof c === 'number' && c >= 0 && c <= 100 &&
               typeof m === 'number' && m >= 0 && m <= 100 &&
               typeof y === 'number' && y >= 0 && y <= 100 &&
               typeof k === 'number' && k >= 0 && k <= 100;
    }

    function isValidHex(hex) {
        return /^#?[0-9A-Fa-f]{6}$/.test(hex);
    }

    function rgbToHex(r, g, b) {
        if (!isValidRGB(r, g, b)) {
            return null;
        }
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
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

    function rgbToCmyk(r, g, b) {
        if (!isValidRGB(r, g, b)) {
            return null;
        }
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        const k = 1 - Math.max(rNorm, gNorm, bNorm);
        if (k === 1) {
            return { c: 0, m: 0, y: 0, k: 100 };
        }
        const c = (1 - rNorm - k) / (1 - k);
        const m = (1 - gNorm - k) / (1 - k);
        const y = (1 - bNorm - k) / (1 - k);
        return {
            c: Math.round(c * 100),
            m: Math.round(m * 100),
            y: Math.round(y * 100),
            k: Math.round(k * 100)
        };
    }

    function cmykToRgb(c, m, y, k) {
        if (!isValidCMYK(c, m, y, k)) {
            return null;
        }
        c = c / 100;
        m = m / 100;
        y = y / 100;
        k = k / 100;
        const r = 255 * (1 - c) * (1 - k);
        const g = 255 * (1 - m) * (1 - k);
        const b = 255 * (1 - y) * (1 - k);
        return {
            r: Math.round(r),
            g: Math.round(g),
            b: Math.round(b)
        };
    }

    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
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

    function hslToRgb(h, s, l) {
        h = h / 360;
        s = s / 100;
        l = l / 100;

        let r, g, b;

        if (s === 0) {
            r = g = b = l;
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

    function rgbToLab(r, g, b) {
        r = r / 255;
        g = g / 255;
        b = b / 255;

        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
        let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100;
        let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100;

        x = x / 95.047;
        y = y / 100.000;
        z = z / 108.883;

        const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
        const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
        const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

        return {
            L: (116 * fy) - 16,
            a: 500 * (fx - fy),
            b: 200 * (fy - fz)
        };
    }

    function labToRgb(L, a, b) {
        let y = (L + 16) / 116;
        let x = a / 500 + y;
        let z = y - b / 200;

        const y3 = Math.pow(y, 3);
        const x3 = Math.pow(x, 3);
        const z3 = Math.pow(z, 3);

        y = y3 > 0.008856 ? y3 : (y - 16/116) / 7.787;
        x = x3 > 0.008856 ? x3 : (x - 16/116) / 7.787;
        z = z3 > 0.008856 ? z3 : (z - 16/116) / 7.787;

        x = x * 95.047;
        y = y * 100.000;
        z = z * 108.883;

        x = x / 100;
        y = y / 100;
        z = z / 100;

        let r = x *  3.2404542 + y * -1.5371385 + z * -0.4985314;
        let g = x * -0.9692660 + y *  1.8760108 + z *  0.0415560;
        let bVal = x *  0.0556434 + y * -0.2040259 + z *  1.0572252;

        r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
        g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
        bVal = bVal > 0.0031308 ? 1.055 * Math.pow(bVal, 1/2.4) - 0.055 : 12.92 * bVal;

        return {
            r: Math.max(0, Math.min(255, Math.round(r * 255))),
            g: Math.max(0, Math.min(255, Math.round(g * 255))),
            b: Math.max(0, Math.min(255, Math.round(bVal * 255)))
        };
    }

    function parseColorString(color) {
        if (!color) return null;

        if (color.startsWith('#')) {
            return hexToRgb(color);
        }

        const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3])
            };
        }

        const div = document.createElement('div');
        div.style.color = color;
        document.body.appendChild(div);
        const computed = window.getComputedStyle(div).color;
        document.body.removeChild(div);

        return parseColorString(computed);
    }

    function extractColorFromImage(imageFile) {
        return new Promise((resolve, reject) => {
            if (!imageFile || !imageFile.type.startsWith('image/')) {
                reject(new Error('Invalid image file'));
                return;
            }

            const img = new Image();
            const reader = new FileReader();

            reader.onerror = () => reject(new Error('Failed to read file'));

            reader.onload = (e) => {
                img.onerror = () => reject(new Error('Failed to load image'));

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = canvas.height = 1;
                        ctx.drawImage(img, 0, 0, 1, 1);

                        const imageData = ctx.getImageData(0, 0, 1, 1);
                        const [r, g, b] = imageData.data;

                        resolve({
                            r,
                            g,
                            b,
                            hex: rgbToHex(r, g, b),
                            cmyk: rgbToCmyk(r, g, b)
                        });
                    } catch (error) {
                        reject(new Error('Failed to extract color: ' + error.message));
                    }
                };

                img.src = e.target.result;
            };

            reader.readAsDataURL(imageFile);
        });
    }

    function extractDominantColors(imageFile, numColors = 5) {
        return new Promise((resolve, reject) => {
            if (!imageFile || !imageFile.type.startsWith('image/')) {
                reject(new Error('Invalid image file'));
                return;
            }

            const img = new Image();
            const reader = new FileReader();

            reader.onerror = () => reject(new Error('Failed to read file'));

            reader.onload = (e) => {
                img.onerror = () => reject(new Error('Failed to load image'));

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        const maxSize = 100;
                        let width = img.width;
                        let height = img.height;

                        if (width > maxSize || height > maxSize) {
                            const scale = Math.min(maxSize / width, maxSize / height);
                            width *= scale;
                            height *= scale;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);

                        const imageData = ctx.getImageData(0, 0, width, height);
                        const pixels = imageData.data;

                        const colorMap = {};

                        for (let i = 0; i < pixels.length; i += 4) {
                            const r = Math.round(pixels[i] / 32) * 32;
                            const g = Math.round(pixels[i + 1] / 32) * 32;
                            const b = Math.round(pixels[i + 2] / 32) * 32;

                            const key = `${r},${g},${b}`;
                            colorMap[key] = (colorMap[key] || 0) + 1;
                        }

                        const sortedColors = Object.entries(colorMap)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, numColors)
                            .map(([color, count]) => {
                                const [r, g, b] = color.split(',').map(Number);
                                return {
                                    r,
                                    g,
                                    b,
                                    hex: rgbToHex(r, g, b),
                                    cmyk: rgbToCmyk(r, g, b),
                                    frequency: count
                                };
                            });

                        resolve(sortedColors);
                    } catch (error) {
                        reject(new Error('Failed to extract colors: ' + error.message));
                    }
                };

                img.src = e.target.result;
            };

            reader.readAsDataURL(imageFile);
        });
    }

    function findClosestPantone(rgb, pantoneDatabase) {
        if (!pantoneDatabase || !Array.isArray(pantoneDatabase)) {
            return null;
        }

        let minDistance = Infinity;
        let closestColor = null;

        for (const color of pantoneDatabase) {
            const distance = Math.sqrt(
                Math.pow(rgb.r - (color.rgb?.r || 0), 2) +
                Math.pow(rgb.g - (color.rgb?.g || 0), 2) +
                Math.pow(rgb.b - (color.rgb?.b || 0), 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestColor = {
                    ...color,
                    distance: Math.round(distance * 100) / 100
                };
            }
        }

        return closestColor;
    }

    function findClosestPantones(rgb, pantoneDatabase, count = 5) {
        if (!pantoneDatabase || !Array.isArray(pantoneDatabase)) {
            return [];
        }

        const distances = pantoneDatabase.map(color => {
            const distance = Math.sqrt(
                Math.pow(rgb.r - (color.rgb?.r || 0), 2) +
                Math.pow(rgb.g - (color.rgb?.g || 0), 2) +
                Math.pow(rgb.b - (color.rgb?.b || 0), 2)
            );

            return {
                ...color,
                distance: Math.round(distance * 100) / 100
            };
        });

        return distances
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count);
    }

    function formatRGB(r, g, b) {
        return `${r}, ${g}, ${b}`;
    }

    function formatCMYK(c, m, y, k) {
        return `${c}, ${m}, ${y}, ${k}`;
    }

    function formatHex(hex) {
        if (!hex) return '';
        return hex.startsWith('#') ? hex.toUpperCase() : '#' + hex.toUpperCase();
    }

    const ColorTools = {
        rgbToHex,
        hexToRgb,
        rgbToCmyk,
        cmykToRgb,
        rgbToHsl,
        hslToRgb,
        rgbToLab,
        labToRgb,
        parseColorString,
        extractColorFromImage,
        extractDominantColors,
        findClosestPantone,
        findClosestPantones,
        isValidRGB,
        isValidCMYK,
        isValidHex,
        formatRGB,
        formatCMYK,
        formatHex
    };

    window.ColorTools = ColorTools;
    window.ColorConverter = ColorTools;
    window.rgbToHsl = rgbToHsl;
    window.hslToRgb = hslToRgb;
    window.rgbToLab = rgbToLab;
    window.labToRgb = labToRgb;
    window.hexToRgb = hexToRgb;
    window.rgbToHex = rgbToHex;
    window.parseColorString = parseColorString;
})(window);
