/**
 * Color Distance Utilities
 * Implements Delta E color difference algorithms
 */

/**
 * Calculate Delta E CIE76 (simple Euclidean distance)
 * @param {Object} lab1 - First LAB color {L, a, b}
 * @param {Object} lab2 - Second LAB color {L, a, b}
 * @returns {number} Delta E distance
 */
function deltaE76(lab1, lab2) {
    const deltaL = lab1.L - lab2.L;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;
    
    return Math.sqrt(
        deltaL * deltaL + 
        deltaA * deltaA + 
        deltaB * deltaB
    );
}

/**
 * Calculate Delta E CIE94 (improved perceptual accuracy)
 * @param {Object} lab1 - First LAB color {L, a, b}
 * @param {Object} lab2 - Second LAB color {L, a, b}
 * @param {Object} weights - Weight factors {kL, kC, kH} (default for graphic arts)
 * @returns {number} Delta E distance
 */
function deltaE94(lab1, lab2, weights = {}) {
    const kL = weights.kL || 1;
    const kC = weights.kC || 1;
    const kH = weights.kH || 1;
    const K1 = weights.K1 || 0.045;
    const K2 = weights.K2 || 0.015;
    
    const deltaL = lab1.L - lab2.L;
    const C1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
    const C2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
    const deltaC = C1 - C2;
    
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;
    const deltaHSquared = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    const deltaH = deltaHSquared > 0 ? Math.sqrt(deltaHSquared) : 0;
    
    const SL = 1;
    const SC = 1 + K1 * C1;
    const SH = 1 + K2 * C1;
    
    const deltaLKlsl = deltaL / (kL * SL);
    const deltaCKcsc = deltaC / (kC * SC);
    const deltaHKhsh = deltaH / (kH * SH);
    
    return Math.sqrt(
        deltaLKlsl * deltaLKlsl +
        deltaCKcsc * deltaCKcsc +
        deltaHKhsh * deltaHKhsh
    );
}

/**
 * Calculate Delta E CIE2000 (most accurate, industry standard)
 * @param {Object} lab1 - First LAB color {L, a, b}
 * @param {Object} lab2 - Second LAB color {L, a, b}
 * @param {Object} weights - Weight factors {kL, kC, kH} (default 1, 1, 1)
 * @returns {number} Delta E distance
 */
function deltaE2000(lab1, lab2, weights = {}) {
    const kL = weights.kL || 1;
    const kC = weights.kC || 1;
    const kH = weights.kH || 1;
    
    // Calculate C and h for both colors
    const C1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
    const C2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
    const Cbar = (C1 + C2) / 2;
    
    const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
    
    const a1Prime = lab1.a * (1 + G);
    const a2Prime = lab2.a * (1 + G);
    
    const C1Prime = Math.sqrt(a1Prime * a1Prime + lab1.b * lab1.b);
    const C2Prime = Math.sqrt(a2Prime * a2Prime + lab2.b * lab2.b);
    
    let h1Prime = Math.atan2(lab1.b, a1Prime) * 180 / Math.PI;
    if (h1Prime < 0) h1Prime += 360;
    
    let h2Prime = Math.atan2(lab2.b, a2Prime) * 180 / Math.PI;
    if (h2Prime < 0) h2Prime += 360;
    
    // Calculate deltas
    const deltaLPrime = lab2.L - lab1.L;
    const deltaCPrime = C2Prime - C1Prime;
    
    let deltahPrime;
    const dhAbs = Math.abs(h1Prime - h2Prime);
    if (C1Prime * C2Prime === 0) {
        deltahPrime = 0;
    } else if (dhAbs <= 180) {
        deltahPrime = h2Prime - h1Prime;
    } else if (h2Prime > h1Prime) {
        deltahPrime = h2Prime - h1Prime - 360;
    } else {
        deltahPrime = h2Prime - h1Prime + 360;
    }
    
    const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin(deltahPrime * Math.PI / 360);
    
    // Calculate means
    const LbarPrime = (lab1.L + lab2.L) / 2;
    const CbarPrime = (C1Prime + C2Prime) / 2;
    
    let HbarPrime;
    if (C1Prime * C2Prime === 0) {
        HbarPrime = h1Prime + h2Prime;
    } else if (dhAbs <= 180) {
        HbarPrime = (h1Prime + h2Prime) / 2;
    } else if (h1Prime + h2Prime < 360) {
        HbarPrime = (h1Prime + h2Prime + 360) / 2;
    } else {
        HbarPrime = (h1Prime + h2Prime - 360) / 2;
    }
    
    // Calculate T
    const T = 1 - 0.17 * Math.cos((HbarPrime - 30) * Math.PI / 180) +
              0.24 * Math.cos(2 * HbarPrime * Math.PI / 180) +
              0.32 * Math.cos((3 * HbarPrime + 6) * Math.PI / 180) -
              0.20 * Math.cos((4 * HbarPrime - 63) * Math.PI / 180);
    
    // Calculate SL, SC, SH
    const SL = 1 + (0.015 * Math.pow(LbarPrime - 50, 2)) / 
               Math.sqrt(20 + Math.pow(LbarPrime - 50, 2));
    const SC = 1 + 0.045 * CbarPrime;
    const SH = 1 + 0.015 * CbarPrime * T;
    
    // Calculate RT
    const deltaTheta = 30 * Math.exp(-Math.pow((HbarPrime - 275) / 25, 2));
    const RC = 2 * Math.sqrt(Math.pow(CbarPrime, 7) / (Math.pow(CbarPrime, 7) + Math.pow(25, 7)));
    const RT = -RC * Math.sin(2 * deltaTheta * Math.PI / 180);
    
    // Final calculation
    const deltaE = Math.sqrt(
        Math.pow(deltaLPrime / (kL * SL), 2) +
        Math.pow(deltaCPrime / (kC * SC), 2) +
        Math.pow(deltaHPrime / (kH * SH), 2) +
        RT * (deltaCPrime / (kC * SC)) * (deltaHPrime / (kH * SH))
    );
    
    return deltaE;
}

/**
 * Get perceptual color difference description
 * @param {number} deltaE - Delta E value
 * @returns {string} Human-readable difference description
 */
function getColorDifferenceDescription(deltaE) {
    if (deltaE < 1) return "Not perceptible";
    if (deltaE < 2) return "Barely perceptible";
    if (deltaE < 3) return "Perceptible";
    if (deltaE < 5) return "Noticeable";
    if (deltaE < 10) return "Significant";
    if (deltaE < 20) return "Large";
    return "Very large";
}

/**
 * Find colors within Delta E distance
 * @param {Array} colors - Array of colors with LAB values
 * @param {Object} targetLab - Target LAB color
 * @param {number} maxDeltaE - Maximum Delta E distance
 * @param {string} algorithm - Algorithm to use ('76', '94', '2000')
 * @returns {Array} Filtered colors within distance
 */
function filterColorsByDistance(colors, targetLab, maxDeltaE, algorithm = '2000') {
    const deltaEFunc = algorithm === '76' ? deltaE76 :
                       algorithm === '94' ? deltaE94 :
                       deltaE2000;
    
    return colors.filter(color => {
        const distance = deltaEFunc(color.lab, targetLab);
        color.deltaE = distance; // Add distance to color object
        return distance <= maxDeltaE;
    }).sort((a, b) => a.deltaE - b.deltaE); // Sort by distance
}

/**
 * Calculate color harmony score
 * @param {Array} colors - Array of LAB colors
 * @returns {number} Harmony score (0-100)
 */
function calculateColorHarmony(colors) {
    if (colors.length < 2) return 100;
    
    let totalDistance = 0;
    let count = 0;
    
    for (let i = 0; i < colors.length - 1; i++) {
        for (let j = i + 1; j < colors.length; j++) {
            totalDistance += deltaE2000(colors[i], colors[j]);
            count++;
        }
    }
    
    const avgDistance = totalDistance / count;
    
    // Map distance to harmony score
    // Low distance = similar colors = lower harmony
    // Optimal distance ~30-50 = good harmony
    // High distance = clashing colors = lower harmony
    
    if (avgDistance < 10) return 30; // Too similar
    if (avgDistance < 30) return 50 + (avgDistance - 10) * 2.5;
    if (avgDistance < 50) return 100; // Optimal
    if (avgDistance < 80) return 100 - (avgDistance - 50) * 1.5;
    return 20; // Too different
}

/**
 * Group colors by similarity
 * @param {Array} colors - Array of colors with LAB values
 * @param {number} threshold - Delta E threshold for grouping
 * @returns {Array} Array of color groups
 */
function groupColorsBySimilarity(colors, threshold = 10) {
    const groups = [];
    const assigned = new Set();
    
    colors.forEach((color, index) => {
        if (assigned.has(index)) return;
        
        const group = [color];
        assigned.add(index);
        
        colors.forEach((otherColor, otherIndex) => {
            if (assigned.has(otherIndex)) return;
            
            const distance = deltaE2000(color.lab, otherColor.lab);
            if (distance <= threshold) {
                group.push(otherColor);
                assigned.add(otherIndex);
            }
        });
        
        groups.push(group);
    });
    
    return groups;
}

// Export for use in Vue components
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        deltaE76,
        deltaE94,
        deltaE2000,
        getColorDifferenceDescription,
        filterColorsByDistance,
        calculateColorHarmony,
        groupColorsBySimilarity
    };
}