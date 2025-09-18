// 计算器状态存储模块 (步骤2)
// 依赖: window.FormulaParser
// 参考: docs/FORMULA-CALCULATOR.md
// 作用: 按自配色编号维护倍算/投放/剩余所需状态, 支持 localStorage 持久化与配方版本迁移

(function(global){
  const LS_KEY = 'sw_calc_state_v1';
  const MAX_NUMBER = 1e6;
  const DEBOUNCE_MS = 300;

  function safeNumber(v){
    if (v === '' || v == null) return null;
    const n = Number(v);
    if (!isFinite(n) || Math.abs(n) > MAX_NUMBER) return null;
    return n;
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch(e) { console.warn('[calc-store] 读取 localStorage 失败', e); return {}; }
  }
  function saveAll(storeObj) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(storeObj)); }
    catch(e){ console.warn('[calc-store] 写入 localStorage 失败', e); }
  }

  // 生成 ingredients 匹配 key
  function ingKey(ing){ return `${ing.name}|||${ing.base}|||${ing.unit}`; }

  function createCalcStore() {
    const persisted = loadAll(); // { code: snapshot }
    const stateMap = new Map();  // code -> full runtime state
    let saveTimer = null;

    function schedulePersist(){
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(persist, DEBOUNCE_MS);
    }

    function persist() {
      saveTimer = null;
      const out = {};
      stateMap.forEach((st, code) => {
        out[code] = {
          scaleFactor: st.scaleFactor,
            anchorIndex: st.anchorIndex,
            targets: st.targets,
            delivered: st.delivered,
            versionHash: st.versionHash,
            updatedAt: st.updatedAt
        };
      });
      saveAll(out);
    }

    function buildState(code, formula) {
      const ingredients = FormulaParser.parse(formula || '');
      const versionHash = FormulaParser.hash(ingredients);
      const snapshot = persisted[code];
      if (!snapshot) {
        return {
          code,
          versionHash,
          ingredients,
          scaleFactor: null,
          anchorIndex: null,
          targets: ingredients.map(ing => ing.invalid ? null : null),
          delivered: ingredients.map(ing => ing.invalid ? null : 0),
          updatedAt: Date.now()
        };
      }
      // 迁移
      const oldTargets = snapshot.targets || [];
      const oldDelivered = snapshot.delivered || [];
      const oldHash = snapshot.versionHash;
      let scaleFactor = snapshot.scaleFactor;
      let anchorIndex = snapshot.anchorIndex;
      let targets = []; let delivered = [];

      if (oldHash === versionHash) {
        // 长度对齐 (可能数量相同)
        for (let i=0;i<ingredients.length;i++) {
          const ing = ingredients[i];
          targets[i] = ing.invalid ? null : (oldTargets[i] == null ? null : oldTargets[i]);
          delivered[i] = ing.invalid ? null : (oldDelivered[i] == null ? 0 : oldDelivered[i]);
        }
      } else {
        // 建映射: old 按 key 存
        const oldKeyToIndex = new Map();
        if (Array.isArray(snapshot._ingredientsKeys)) {
          // 未来可存储; 当前没有 -> fallback
        }
        // 无旧 ingredients 详情, 尝试由 targets/delivered 长度推断 (保守清空)
        // 改进: 若我们未来把 old ingredients keys 保存在 localStorage, 可更精准迁移
        // 当前策略: 按名称+base+unit 匹配 (需要旧记录, 缺失则全重置)
        // => 由于缺少旧 ingredients, 只能重置
        for (let i=0;i<ingredients.length;i++) {
          const ing = ingredients[i];
          targets[i] = ing.invalid ? null : null;
          delivered[i] = ing.invalid ? null : 0;
        }
        anchorIndex = null;
        scaleFactor = null;
      }

      // 若 anchorIndex 无效或越界 / 对应行 invalid => 失效
      if (anchorIndex == null || anchorIndex < 0 || anchorIndex >= ingredients.length || ingredients[anchorIndex].invalid) {
        anchorIndex = null;
        scaleFactor = null;
        // 清除 targets (若之前没有新的 scaleFactor)
        if (scaleFactor == null) {
          targets = ingredients.map(ing => ing.invalid ? null : null);
        }
      }

      // 若 scaleFactor 不为 null 且 anchorIndex 有效, 以 scaleFactor 重算 targets (避免旧 targets 与新 ingredients 不一致)
      if (scaleFactor != null && anchorIndex != null) {
        const baseAnchor = ingredients[anchorIndex].base;
        if (baseAnchor > 0) {
          for (let i=0;i<ingredients.length;i++) {
            if (ingredients[i].invalid) { targets[i] = null; continue; }
            targets[i] = Number((ingredients[i].base * scaleFactor).toFixed(2));
          }
        } else {
          // anchor 行 base=0, 无法重算, 失效
          scaleFactor = null; anchorIndex = null;
          targets = ingredients.map(ing => ing.invalid ? null : null);
        }
      }

      return {
        code,
        versionHash,
        ingredients,
        scaleFactor,
        anchorIndex,
        targets,
        delivered,
        updatedAt: Date.now()
      };
    }

    function getState(code, formula) {
      if (!code) return null;
      let st = stateMap.get(code);
      if (!st) {
        st = buildState(code, formula);
        stateMap.set(code, st);
        schedulePersist();
      } else if (formula != null) {
        // 检查 hash 是否变化
        const ingredients = FormulaParser.parse(formula || '');
        const newHash = FormulaParser.hash(ingredients);
        if (newHash !== st.versionHash) {
          // 重新构建并迁移 (简单覆盖)
          const rebuilt = buildState(code, formula);
          stateMap.set(code, rebuilt);
          st = rebuilt;
          schedulePersist();
        }
      }
      return st;
    }

    function applyScale(code, rowIndex, value) {
      const st = stateMap.get(code);
      if (!st) return null;
      if (rowIndex == null || rowIndex < 0 || rowIndex >= st.ingredients.length) return st;
      const ing = st.ingredients[rowIndex];
      if (ing.invalid) return st;
      const num = safeNumber(value);
      if (num == null || ing.base <= 0) return st;
      const factor = num / ing.base;
      st.scaleFactor = factor;
      st.anchorIndex = rowIndex;
      for (let i=0;i<st.ingredients.length;i++) {
        const cur = st.ingredients[i];
        if (cur.invalid) { st.targets[i]=null; continue; }
        let val = Number((cur.base * factor).toFixed(2));
        if (val > 9999) val = 9999; // 单元格上限
        st.targets[i] = val;
        if (st.delivered[i] == null && !cur.invalid) st.delivered[i] = 0; // 确保 delivered 初始化
      }
      st.updatedAt = Date.now();
      schedulePersist();
      return st;
    }

    // 直接按整体 scaleFactor 应用 (供总计行输入触发)
    function applyScaleFactor(code, factor, anchorIndex) {
      const st = stateMap.get(code);
      if (!st) return null;
      const fNum = safeNumber(factor);
      if (fNum == null || fNum <= 0) return st;
      st.scaleFactor = fNum;
      // 若未显式给 anchorIndex，则选择第一个非 invalid 行作为锚点
      if (anchorIndex == null || anchorIndex < 0 || anchorIndex >= st.ingredients.length || st.ingredients[anchorIndex].invalid) {
        anchorIndex = st.ingredients.findIndex(ing=>!ing.invalid && ing.base>0);
      }
      st.anchorIndex = anchorIndex >=0 ? anchorIndex : null;
      for (let i=0;i<st.ingredients.length;i++) {
        const cur = st.ingredients[i];
        if (cur.invalid) { st.targets[i]=null; continue; }
        let val = Number((cur.base * fNum).toFixed(2));
        if (val > 9999) val = 9999;
        st.targets[i] = val;
        if (st.delivered[i] == null && !cur.invalid) st.delivered[i] = 0;
      }
      st.updatedAt = Date.now();
      schedulePersist();
      return st;
    }

    function updateDelivered(code, rowIndex, value) {
      const st = stateMap.get(code);
      if (!st) return null;
      if (rowIndex == null || rowIndex < 0 || rowIndex >= st.ingredients.length) return st;
      const ing = st.ingredients[rowIndex];
      if (ing.invalid) return st;
      const num = safeNumber(value);
  let v = num == null ? 0 : num;
  if (v > 9999) v = 9999;
  st.delivered[rowIndex] = v;
      st.updatedAt = Date.now();
      schedulePersist();
      return st;
    }

    function clearState(code) {
      const st = stateMap.get(code);
      if (!st) return;
      st.scaleFactor = null;
      st.anchorIndex = null;
      st.targets = st.ingredients.map(ing => ing.invalid ? null : null);
      st.delivered = st.ingredients.map(ing => ing.invalid ? null : 0);
      st.updatedAt = Date.now();
      schedulePersist();
    }

    function syncFormulaChange(code, newFormula){
      // 触发 getState 重建（内部已比较 hash）。
      const st = getState(code, newFormula);
      return st;
    }

    function forcePersist() { persist(); }

    return {
      getState,
      applyScale,
  applyScaleFactor,
      updateDelivered,
      clearState,
  syncFormulaChange,
      forcePersist
    };
  }

  global.createCalcStore = createCalcStore;
})(window);
