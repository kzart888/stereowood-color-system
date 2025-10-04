// 配方字符串解析与哈希工具 (步骤1)
// 职责: 将配方字符串解析为结构化数组 + 生成版本哈希
// 设计依据: docs/FORMULA-CALCULATOR.md

(function(global){
  const FormulaParser = {
    // 解析: 输入原始 formula 字符串, 输出 [{ name, base, unit, invalid }]
    parse(formula){
      const result = [];
      if (!formula || !(formula = String(formula).trim())) return result;
  const tokens = formula.split(/\s+/);
  const amountRe = /^([\d]+(?:\.[\d]+)?)([a-zA-Z\u4e00-\u9fa5%]+)$/; // 形式: 15g / 3ml
  const numberOnlyRe = /^[\d]+(?:\.[\d]+)?$/; // 形式: 15
  const unitOnlyRe = /^[a-zA-Z\u4e00-\u9fa5%]+$/; // 形式: g / ml / 滴
      for (let i=0; i<tokens.length; i++) {
        const nameToken = tokens[i];
        if (!nameToken) continue;
        const next = tokens[i+1];
        let consumed = 0;
        let base = 0; let unit = ''; let valid=false;
        // 1) 紧随一个 "数值+单位" token
        if (next && amountRe.test(next)) {
          const m = next.match(amountRe);
          base = parseFloat(m[1]); unit = m[2]; valid = isFinite(base); consumed = 1;
        } else if (next && numberOnlyRe.test(next) && tokens[i+2] && unitOnlyRe.test(tokens[i+2])) {
          // 2) 形式: 名称 15 g
          base = parseFloat(next); unit = tokens[i+2]; valid = isFinite(base); consumed = 2;
        }
        if (consumed>0) {
          result.push({ name: nameToken, base: valid?base:0, unit, invalid: !valid });
          i += consumed; // 跳过消耗的 token
        } else {
          // 未匹配数量
          result.push({ name: nameToken, base: 0, unit: '', invalid: true });
        }
      }
      return result;
    },
    // 生成哈希 (轻量, 非加密): 基于 name|base|unit 串联
    hash(ingredients){
      if (!Array.isArray(ingredients) || !ingredients.length) return 'h0';
      let acc = 0;
      for (const ing of ingredients) {
        const line = `${ing.name}|${ing.base}|${ing.unit}`;
        for (let i=0;i<line.length;i++) acc = (acc*131 + line.charCodeAt(i)) >>> 0; // 32位滚动
      }
      return 'h' + acc.toString(16);
    },
    // 计算单位桶: 保持首次出现顺序
    unitBuckets(ingredients){
      const order = [];
      const seen = new Set();
      ingredients.forEach(ing => {
        if (ing.invalid) return;
        const u = ing.unit || '';
        if (!seen.has(u)) { seen.add(u); order.push(u); }
      });
      return order;
    }
  };

  // 挂载
  global.FormulaParser = FormulaParser;
})(window);
