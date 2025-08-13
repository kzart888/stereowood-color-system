// 配方查重模块 (顺序 + 倍数不敏感) 初始实现 - 阶段A部分
// 依赖: window.FormulaParser.parse
// 暴露: window.duplicateDetector
(function(global){
  const EPS = 1e-6;
  function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ const t=a%b; a=b; b=t; } return a||1; }
  function gcdArray(arr){ return arr.reduce((g,v)=>gcd(g,v), arr[0]||1); }
  function buildRatioSignature(formula){
    if(!formula) return '';
    const parser = global.FormulaParser;
    if(!parser || !parser.parse) return '';
    let ings = parser.parse(formula)||[];
    ings = ings.filter(i=> i && !i.invalid && i.name && isFinite(i.base) && i.base>0);
    if(!ings.length) return '';
    ings = ings.map(i=>({ name:(i.name||'').trim().toLowerCase(), unit:(i.unit||'').trim().toLowerCase(), amt:Number(i.base) }));
    ings.sort((a,b)=> a.name.localeCompare(b.name) || a.unit.localeCompare(b.unit));
    // 放大为整数
    const decimals = ings.map(i=>{ const s=String(i.amt); const m=s.split('.')[1]; return m?m.length:0; });
    const scale = Math.pow(10, Math.max(...decimals));
    let ints = ings.map(i=> Math.round(i.amt*scale));
    if(ints.every(v=>v===0)){ // 回退：浮点比
      const base = ings[0].amt;
      return ings.map(i=> `${i.name}#${i.unit}#${Math.round((i.amt/base)*1e6)/1e6}`).join('|');
    }
    const g = gcdArray(ints);
    if(g>1) ints = ints.map(v=> v/g);
    return ings.map((ing,idx)=> `${ing.name}#${ing.unit}#${ints[idx]}`).join('|');
  }
  function groupByRatioSignature(list){
    const map = new Map();
    (list||[]).forEach(rec=>{
      const sig = buildRatioSignature(rec.formula||'');
      if(!sig) return;
      if(!map.has(sig)) map.set(sig, []);
      map.get(sig).push(rec);
    });
    const dup = {};
    for(const [sig, arr] of map.entries()) if(arr.length>=2) dup[sig]=arr;
    return dup;
  }
  function detectOnSave(rec, all){
    if(!rec) return null;
    const sig = buildRatioSignature(rec.formula||'');
    if(!sig) return null;
    const group = (all||[]).filter(r=> buildRatioSignature(r.formula||'')===sig);
    return group.length>=2 ? { signature:sig, records:group } : null;
  }
  function parseRatio(signature){
    if(!signature) return { items:[], ratios:[] };
    const parts = signature.split('|');
    const items = []; const ratios=[];
    parts.forEach(p=>{ const seg=p.split('#'); if(seg.length===3){ const ratioNum = Number(seg[2]); items.push({ name:seg[0], unit:seg[1], ratio:ratioNum }); ratios.push(ratioNum); } });
    return { items, ratios };
  }
  global.duplicateDetector = { buildRatioSignature, groupByRatioSignature, detectOnSave, parseRatio };
})(window);
