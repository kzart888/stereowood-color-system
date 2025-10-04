// Shared formula utilities
// Consolidates common formula parsing and formatting functions

const formulaUtils = {
    // Parse formula into segments for display (from custom-colors.js)
    // Returns array of strings like ["朱红 10g", "钛白 5g"]
    segments(formula) {
        const str = (formula || '').trim();
        if (!str) return [];
        const parts = str.split(/\s+/);
        const segs = [];
        let pending = null;
        for (const t of parts) {
            const m = t.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
            if (m && pending) {
                segs.push(pending + ' ' + m[1] + m[2]);
                pending = null;
            } else {
                if (pending) segs.push(pending);
                pending = t;
            }
        }
        if (pending) segs.push(pending);
        return segs;
    },

    // Parse formula into structured format (from artworks.js)
    // Returns { lines: [{name, amount, unit}], maxNameChars }
    structured(formula) {
        const str = (formula || '').trim();
        if (!str) return { lines: [], maxNameChars: 0 };
        const parts = str.split(/\s+/);
        const lines = [];
        let current = null;
        for (const token of parts) {
            const m = token.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
            if (m && current) {
                lines.push({ name: current, amount: m[1], unit: m[2] });
                current = null;
            } else {
                if (current) {
                    lines.push({ name: current, amount: '', unit: '' });
                }
                current = token;
            }
        }
        if (current) lines.push({ name: current, amount: '', unit: '' });
        const maxNameChars = lines.reduce((m, l) => Math.max(m, l.name.length), 0);
        return { lines, maxNameChars };
    },

    // Wrapper for existing FormulaParser.parse
    parse(formula) {
        return window.FormulaParser ? window.FormulaParser.parse(formula) : [];
    },

    // Wrapper for existing FormulaParser.hash
    hash(ingredients) {
        return window.FormulaParser ? window.FormulaParser.hash(ingredients) : 'h0';
    }
};

// Make globally available
window.formulaUtils = formulaUtils;