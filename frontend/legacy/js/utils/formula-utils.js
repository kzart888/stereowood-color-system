// Shared formula utilities
// Consolidates formula display formatting on top of FormulaParser.

function fallbackParseFormula(formula) {
    const result = [];
    const text = String(formula || '').trim();
    if (!text) return result;

    const tokens = text.split(/\s+/);
    const amountRe = /^([\d]+(?:\.[\d]+)?)([a-zA-Z\u4e00-\u9fa5%]+)$/;
    const numberOnlyRe = /^[\d]+(?:\.[\d]+)?$/;
    const unitOnlyRe = /^[a-zA-Z\u4e00-\u9fa5%]+$/;

    for (let i = 0; i < tokens.length; i += 1) {
        const nameToken = tokens[i];
        if (!nameToken) continue;

        const next = tokens[i + 1];
        let consumed = 0;
        let base = 0;
        let unit = '';
        let valid = false;

        if (next && amountRe.test(next)) {
            const m = next.match(amountRe);
            base = Number.parseFloat(m[1]);
            unit = m[2];
            valid = Number.isFinite(base);
            consumed = 1;
        } else if (next && numberOnlyRe.test(next) && tokens[i + 2] && unitOnlyRe.test(tokens[i + 2])) {
            base = Number.parseFloat(next);
            unit = tokens[i + 2];
            valid = Number.isFinite(base);
            consumed = 2;
        }

        if (consumed > 0) {
            result.push({ name: nameToken, base: valid ? base : 0, unit, invalid: !valid });
            i += consumed;
        } else {
            result.push({ name: nameToken, base: 0, unit: '', invalid: true });
        }
    }

    return result;
}

function parseFormula(formula) {
    if (window.FormulaParser && typeof window.FormulaParser.parse === 'function') {
        return window.FormulaParser.parse(formula);
    }
    return fallbackParseFormula(formula);
}

function formatAmount(base) {
    if (!Number.isFinite(base)) return '';
    return String(base);
}

const formulaUtils = {
    // Parse formula into display segments.
    // Example: ["朱红 10g", "钛白 5g"]
    segments(formula) {
        const ingredients = parseFormula(formula);
        if (!ingredients.length) return [];

        return ingredients
            .map((item) => {
                if (item.invalid) return item.name || '';
                const amount = formatAmount(item.base);
                return `${item.name} ${amount}${item.unit || ''}`.trim();
            })
            .filter(Boolean);
    },

    // Parse formula into structured rows for table rendering.
    // Returns { lines: [{ name, amount, unit }], maxNameChars }
    structured(formula) {
        const ingredients = parseFormula(formula);
        if (!ingredients.length) return { lines: [], maxNameChars: 0 };

        const lines = ingredients.map((item) => ({
            name: item.name || '',
            amount: item.invalid ? '' : formatAmount(item.base),
            unit: item.invalid ? '' : (item.unit || '')
        }));

        const maxNameChars = lines.reduce((m, l) => Math.max(m, l.name.length), 0);
        return { lines, maxNameChars };
    },

    // Deprecated wrapper kept for compatibility in this phase.
    parse(formula) {
        return parseFormula(formula);
    },

    // Deprecated wrapper kept for compatibility in this phase.
    hash(ingredients) {
        if (window.FormulaParser && typeof window.FormulaParser.hash === 'function') {
            return window.FormulaParser.hash(ingredients);
        }

        if (!Array.isArray(ingredients) || !ingredients.length) return 'h0';
        let acc = 0;
        for (const ing of ingredients) {
            const line = `${ing.name}|${ing.base}|${ing.unit}`;
            for (let i = 0; i < line.length; i += 1) {
                acc = (acc * 131 + line.charCodeAt(i)) >>> 0;
            }
        }
        return 'h' + acc.toString(16);
    }
};

// Make globally available
window.formulaUtils = formulaUtils;
