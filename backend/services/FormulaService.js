/**
 * 配方处理服务
 * 职责：处理配方字符串的解析和替换
 * 引用：被 MaterialService 和其他服务使用
 * @module services/FormulaService
 */

class FormulaService {
    /**
     * 把配方字符串中出现的旧颜色名精确替换为新颜色名
     * @param {string} formula - 配方字符串
     * @param {string} oldName - 旧颜色名称
     * @param {string} newName - 新颜色名称
     * @returns {string} 替换后的配方
     */
    replaceColorNameInFormula(formula, oldName, newName) {
        if (!formula || !oldName || oldName === newName) return formula;
        
        // 公式格式为：颜色名 数量单位 颜色名 数量单位 ...
        // 我们按空白拆分，只在"非数量+单位"的token上做精确匹配替换
        const isAmountToken = (t) => /^[\d.]+[a-zA-Z\u4e00-\u9fa5]+$/.test(t);
        const parts = String(formula).trim().split(/\s+/);
        let changed = false;
        
        for (let i = 0; i < parts.length; i++) {
            if (!isAmountToken(parts[i]) && parts[i] === oldName) {
                parts[i] = newName;
                changed = true;
            }
        }
        
        return changed ? parts.join(' ') : formula;
    }

    /**
     * 解析配方字符串
     * @param {string} formula - 配方字符串
     * @returns {Array} 解析后的配方数组
     */
    parseFormula(formula) {
        if (!formula || typeof formula !== 'string') return [];
        
        const parts = formula.trim().split(/\s+/);
        const result = [];
        
        // 每两个元素为一组：颜色名 + 数量单位
        for (let i = 0; i < parts.length; i += 2) {
            if (i + 1 < parts.length) {
                const colorName = parts[i];
                const amountStr = parts[i + 1];
                
                // 解析数量和单位
                const amountMatch = amountStr.match(/^([\d.]+)(.*)$/);
                if (amountMatch) {
                    result.push({
                        name: colorName,
                        amount: parseFloat(amountMatch[1]),
                        unit: amountMatch[2] || ''
                    });
                }
            }
        }
        
        return result;
    }

    /**
     * 将配方数组转换回字符串
     * @param {Array} formulaArray - 配方数组
     * @returns {string} 配方字符串
     */
    stringifyFormula(formulaArray) {
        if (!Array.isArray(formulaArray)) return '';
        
        return formulaArray
            .map(item => `${item.name} ${item.amount}${item.unit}`)
            .join(' ');
    }

    /**
     * 验证配方格式是否正确
     * @param {string} formula - 配方字符串
     * @returns {boolean} 是否有效
     */
    validateFormula(formula) {
        if (!formula || typeof formula !== 'string') return false;
        
        const parts = formula.trim().split(/\s+/);
        
        // 必须是偶数个部分
        if (parts.length === 0 || parts.length % 2 !== 0) return false;
        
        // 检查每个数量单位部分
        for (let i = 1; i < parts.length; i += 2) {
            if (!/^[\d.]+[a-zA-Z\u4e00-\u9fa5]*$/.test(parts[i])) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 计算配方总量
     * @param {string} formula - 配方字符串
     * @param {string} targetUnit - 目标单位
     * @returns {number} 总量
     */
    calculateTotalAmount(formula, targetUnit = 'g') {
        const parsed = this.parseFormula(formula);
        let total = 0;
        
        // 简单的单位转换（可以根据需要扩展）
        const unitConversion = {
            'g': 1,
            '克': 1,
            'mg': 0.001,
            '毫克': 0.001,
            'kg': 1000,
            '千克': 1000,
            'ml': 1,  // 假设密度为1
            '毫升': 1,
            'l': 1000,
            '升': 1000,
            '滴': 0.05  // 假设1滴约0.05g
        };
        
        parsed.forEach(item => {
            const conversionFactor = unitConversion[item.unit.toLowerCase()] || 1;
            total += item.amount * conversionFactor;
        });
        
        return total;
    }
}

module.exports = new FormulaService();