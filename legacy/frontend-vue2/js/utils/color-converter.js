// Color Converter Utility Module
// Provides RGB/CMYK/HEX conversion and image color extraction
// Version: 0.8.4

(function(window) {
    'use strict';
    
    const ColorConverter = {
        // RGB to HEX conversion
        rgbToHex(r, g, b) {
            // Validate input
            if (!this.isValidRGB(r, g, b)) {
                return null;
            }
            
            return '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('').toUpperCase();
        },
        
        // HEX to RGB conversion
        hexToRgb(hex) {
            // Remove # if present
            hex = hex.replace('#', '');
            
            // Validate hex string
            if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                return null;
            }
            
            return {
                r: parseInt(hex.substr(0, 2), 16),
                g: parseInt(hex.substr(2, 2), 16),
                b: parseInt(hex.substr(4, 2), 16)
            };
        },
        
        // RGB to CMYK conversion
        rgbToCmyk(r, g, b) {
            // Validate input
            if (!this.isValidRGB(r, g, b)) {
                return null;
            }
            
            // Normalize RGB values
            const rNorm = r / 255;
            const gNorm = g / 255;
            const bNorm = b / 255;
            
            // Calculate K (black)
            const k = 1 - Math.max(rNorm, gNorm, bNorm);
            
            // Handle pure black
            if (k === 1) {
                return { c: 0, m: 0, y: 0, k: 100 };
            }
            
            // Calculate CMY
            const c = (1 - rNorm - k) / (1 - k);
            const m = (1 - gNorm - k) / (1 - k);
            const y = (1 - bNorm - k) / (1 - k);
            
            return {
                c: Math.round(c * 100),
                m: Math.round(m * 100),
                y: Math.round(y * 100),
                k: Math.round(k * 100)
            };
        },
        
        // CMYK to RGB conversion
        cmykToRgb(c, m, y, k) {
            // Validate input
            if (!this.isValidCMYK(c, m, y, k)) {
                return null;
            }
            
            // Normalize CMYK values
            c = c / 100;
            m = m / 100;
            y = y / 100;
            k = k / 100;
            
            // Calculate RGB
            const r = 255 * (1 - c) * (1 - k);
            const g = 255 * (1 - m) * (1 - k);
            const b = 255 * (1 - y) * (1 - k);
            
            return {
                r: Math.round(r),
                g: Math.round(g),
                b: Math.round(b)
            };
        },
        
        // Extract average color from image
        async extractColorFromImage(imageFile) {
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
                            
                            // Use 1x1 canvas for average color
                            canvas.width = canvas.height = 1;
                            ctx.drawImage(img, 0, 0, 1, 1);
                            
                            // Get pixel data
                            const imageData = ctx.getImageData(0, 0, 1, 1);
                            const [r, g, b, a] = imageData.data;
                            
                            // Return RGB values
                            resolve({ 
                                r: r, 
                                g: g, 
                                b: b,
                                hex: this.rgbToHex(r, g, b),
                                cmyk: this.rgbToCmyk(r, g, b)
                            });
                        } catch (error) {
                            reject(new Error('Failed to extract color: ' + error.message));
                        }
                    };
                    
                    img.src = e.target.result;
                };
                
                reader.readAsDataURL(imageFile);
            });
        },
        
        // Extract dominant colors from image (advanced)
        async extractDominantColors(imageFile, numColors = 5) {
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
                            
                            // Use smaller size for performance
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
                            
                            // Get pixel data
                            const imageData = ctx.getImageData(0, 0, width, height);
                            const pixels = imageData.data;
                            
                            // Simple color quantization
                            const colorMap = {};
                            
                            for (let i = 0; i < pixels.length; i += 4) {
                                // Quantize to reduce color space
                                const r = Math.round(pixels[i] / 32) * 32;
                                const g = Math.round(pixels[i + 1] / 32) * 32;
                                const b = Math.round(pixels[i + 2] / 32) * 32;
                                
                                const key = `${r},${g},${b}`;
                                colorMap[key] = (colorMap[key] || 0) + 1;
                            }
                            
                            // Sort by frequency
                            const sortedColors = Object.entries(colorMap)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, numColors)
                                .map(([color, count]) => {
                                    const [r, g, b] = color.split(',').map(Number);
                                    return {
                                        r, g, b,
                                        hex: this.rgbToHex(r, g, b),
                                        cmyk: this.rgbToCmyk(r, g, b),
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
        },
        
        // Find closest Pantone color
        findClosestPantone(rgb, pantoneDatabase) {
            if (!pantoneDatabase || !Array.isArray(pantoneDatabase)) {
                return null;
            }
            
            let minDistance = Infinity;
            let closestColor = null;
            
            for (const color of pantoneDatabase) {
                // Calculate Euclidean distance in RGB space
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
        },
        
        // Find multiple closest Pantone matches
        findClosestPantones(rgb, pantoneDatabase, count = 5) {
            if (!pantoneDatabase || !Array.isArray(pantoneDatabase)) {
                return [];
            }
            
            // Calculate distances for all colors
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
            
            // Sort by distance and return top matches
            return distances
                .sort((a, b) => a.distance - b.distance)
                .slice(0, count);
        },
        
        // Validation helpers
        isValidRGB(r, g, b) {
            return Number.isInteger(r) && r >= 0 && r <= 255 &&
                   Number.isInteger(g) && g >= 0 && g <= 255 &&
                   Number.isInteger(b) && b >= 0 && b <= 255;
        },
        
        isValidCMYK(c, m, y, k) {
            return typeof c === 'number' && c >= 0 && c <= 100 &&
                   typeof m === 'number' && m >= 0 && m <= 100 &&
                   typeof y === 'number' && y >= 0 && y <= 100 &&
                   typeof k === 'number' && k >= 0 && k <= 100;
        },
        
        isValidHex(hex) {
            return /^#?[0-9A-Fa-f]{6}$/.test(hex);
        },
        
        // Format color values for display
        formatRGB(r, g, b) {
            return `${r}, ${g}, ${b}`;
        },
        
        formatCMYK(c, m, y, k) {
            return `${c}, ${m}, ${y}, ${k}`;
        },
        
        formatHex(hex) {
            if (!hex) return '';
            return hex.startsWith('#') ? hex.toUpperCase() : '#' + hex.toUpperCase();
        }
    };
    
    // Expose to global scope
    window.ColorConverter = ColorConverter;
    
})(window);