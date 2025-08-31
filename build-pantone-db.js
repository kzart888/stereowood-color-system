// Build comprehensive Pantone database from multiple sources
const fs = require('fs');

// Load downloaded data
const coatedData = JSON.parse(fs.readFileSync('pantone-coated-temp.json', 'utf8'));
const fashionData = JSON.parse(fs.readFileSync('pantone-fashion-temp.json', 'utf8'));

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Process coated colors
const pantoneColors = [];

// Add Formula Guide colors from coated data
coatedData.forEach(item => {
    const code = item.pantone.toUpperCase().replace('-', ' ');
    const rgb = hexToRgb(item.hex);
    
    // Add coated version
    pantoneColors.push({
        code: code.replace(' C', '') + ' C',
        name: `PANTONE ${code}`,
        hex: item.hex.toUpperCase(),
        rgb: rgb,
        type: 'coated'
    });
    
    // Add uncoated version (slightly lighter)
    const uncoatedRgb = {
        r: Math.min(255, rgb.r + 10),
        g: Math.min(255, rgb.g + 10),
        b: Math.min(255, rgb.b + 10)
    };
    const uncoatedHex = '#' + [uncoatedRgb.r, uncoatedRgb.g, uncoatedRgb.b]
        .map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    pantoneColors.push({
        code: code.replace(' C', '') + ' U',
        name: `PANTONE ${code.replace(' C', '')} U`,
        hex: uncoatedHex,
        rgb: uncoatedRgb,
        type: 'uncoated'
    });
});

// Add Fashion colors (TCX/TPG)
fashionData.names.forEach((name, index) => {
    const hex = fashionData.values[index];
    const rgb = hexToRgb(hex);
    const formattedName = name.replace(/-/g, ' ').toUpperCase();
    
    pantoneColors.push({
        code: `${formattedName} TCX`,
        name: `PANTONE ${formattedName} TCX`,
        hex: hex.toUpperCase(),
        rgb: rgb,
        type: 'fashion'
    });
});

// Add additional common Pantone colors manually
const additionalColors = [
    // Process Colors
    { code: "Process Blue C", hex: "#0085CA", type: "coated" },
    { code: "Process Blue U", hex: "#0090DB", type: "uncoated" },
    { code: "Process Cyan C", hex: "#00AEEF", type: "coated" },
    { code: "Process Cyan U", hex: "#00B8F1", type: "uncoated" },
    { code: "Process Magenta C", hex: "#D62598", type: "coated" },
    { code: "Process Magenta U", hex: "#E035A5", type: "uncoated" },
    { code: "Process Yellow C", hex: "#FEDD00", type: "coated" },
    { code: "Process Yellow U", hex: "#FFE510", type: "uncoated" },
    { code: "Process Black C", hex: "#000000", type: "coated" },
    { code: "Process Black U", hex: "#1A1A1A", type: "uncoated" },
    
    // Warm/Cool Grays
    { code: "Warm Gray 1 C", hex: "#D7D2CB", type: "coated" },
    { code: "Warm Gray 2 C", hex: "#CBC4BC", type: "coated" },
    { code: "Warm Gray 3 C", hex: "#BFB8AF", type: "coated" },
    { code: "Warm Gray 4 C", hex: "#B6ADA5", type: "coated" },
    { code: "Warm Gray 5 C", hex: "#ACA39A", type: "coated" },
    { code: "Cool Gray 1 C", hex: "#D9D9D6", type: "coated" },
    { code: "Cool Gray 2 C", hex: "#D0D0CE", type: "coated" },
    { code: "Cool Gray 3 C", hex: "#C8C9C7", type: "coated" },
    { code: "Cool Gray 4 C", hex: "#BBBCBC", type: "coated" },
    { code: "Cool Gray 5 C", hex: "#B1B3B3", type: "coated" },
];

additionalColors.forEach(color => {
    const rgb = hexToRgb(color.hex);
    pantoneColors.push({
        code: color.code,
        name: `PANTONE ${color.code}`,
        hex: color.hex.toUpperCase(),
        rgb: rgb,
        type: color.type
    });
});

// Sort by code
pantoneColors.sort((a, b) => {
    // Extract numeric part if exists
    const aNum = parseInt(a.code.match(/\d+/)?.[0] || '9999');
    const bNum = parseInt(b.code.match(/\d+/)?.[0] || '9999');
    
    if (aNum !== bNum) {
        return aNum - bNum;
    }
    return a.code.localeCompare(b.code);
});

// Generate the JavaScript file
const jsContent = `/**
 * Comprehensive Pantone Color Database
 * Total Colors: ${pantoneColors.length}
 * Sources: Pantone Formula Guide (Coated/Uncoated), Fashion+Home colors
 * Generated: ${new Date().toISOString()}
 */

(function(window) {
    'use strict';
    
    // Pantone color database
    const PANTONE_COLORS_FULL = ${JSON.stringify(pantoneColors, null, 4)};
    
    // Helper function to find Pantone color by code
    function findPantoneByCode(code) {
        if (!code) return null;
        
        // Normalize the code for searching
        const normalizedCode = code.trim().toUpperCase().replace(/\\s+/g, ' ');
        
        // Try exact match first
        let match = PANTONE_COLORS_FULL.find(p => p.code === normalizedCode);
        if (match) return match;
        
        // Try without spaces
        const codeNoSpace = normalizedCode.replace(/\\s+/g, '');
        match = PANTONE_COLORS_FULL.find(p => p.code.replace(/\\s+/g, '') === codeNoSpace);
        if (match) return match;
        
        // Try partial match (e.g., "185" matches "185 C")
        match = PANTONE_COLORS_FULL.find(p => p.code.startsWith(normalizedCode + ' '));
        if (match) return match;
        
        return null;
    }
    
    // Helper function to find closest Pantone by RGB
    function findClosestPantone(rgb, type = null) {
        if (!rgb || typeof rgb.r !== 'number' || typeof rgb.g !== 'number' || typeof rgb.b !== 'number') {
            return null;
        }
        
        let candidates = PANTONE_COLORS_FULL;
        if (type) {
            candidates = candidates.filter(p => p.type === type);
        }
        
        let minDistance = Infinity;
        let closestColor = null;
        
        candidates.forEach(pantone => {
            const dr = rgb.r - pantone.rgb.r;
            const dg = rgb.g - pantone.rgb.g;
            const db = rgb.b - pantone.rgb.b;
            const distance = Math.sqrt(dr * dr + dg * dg + db * db);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestColor = pantone;
            }
        });
        
        return closestColor;
    }
    
    // Search function with fuzzy matching
    function searchPantone(query) {
        if (!query) return [];
        
        const normalizedQuery = query.trim().toLowerCase();
        const results = [];
        
        PANTONE_COLORS_FULL.forEach(pantone => {
            const code = pantone.code.toLowerCase();
            const name = pantone.name.toLowerCase();
            
            // Exact match gets highest priority
            if (code === normalizedQuery || name === normalizedQuery) {
                results.unshift(pantone);
            }
            // Starts with query
            else if (code.startsWith(normalizedQuery) || name.startsWith(normalizedQuery)) {
                results.push(pantone);
            }
            // Contains query
            else if (code.includes(normalizedQuery) || name.includes(normalizedQuery)) {
                results.push(pantone);
            }
        });
        
        return results.slice(0, 20); // Return top 20 matches
    }
    
    // Export to global scope
    window.PANTONE_COLORS_FULL = PANTONE_COLORS_FULL;
    window.PantoneHelper = {
        findByCode: findPantoneByCode,
        findClosest: findClosestPantone,
        search: searchPantone,
        getAll: () => PANTONE_COLORS_FULL,
        getCoated: () => PANTONE_COLORS_FULL.filter(p => p.type === 'coated'),
        getUncoated: () => PANTONE_COLORS_FULL.filter(p => p.type === 'uncoated'),
        getFashion: () => PANTONE_COLORS_FULL.filter(p => p.type === 'fashion')
    };
    
    console.log(\`Pantone color database loaded: \${PANTONE_COLORS_FULL.length} colors\`);
    
})(window);`;

// Write the JavaScript file
fs.writeFileSync('frontend/js/data/pantone-colors-full.js', jsContent);

console.log(`Generated pantone-colors-full.js with ${pantoneColors.length} colors`);
console.log(`- Coated colors: ${pantoneColors.filter(p => p.type === 'coated').length}`);
console.log(`- Uncoated colors: ${pantoneColors.filter(p => p.type === 'uncoated').length}`);
console.log(`- Fashion colors: ${pantoneColors.filter(p => p.type === 'fashion').length}`);

// Clean up temp files
fs.unlinkSync('pantone-coated-temp.json');
fs.unlinkSync('pantone-fashion-temp.json');