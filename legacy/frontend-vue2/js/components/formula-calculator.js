// 配方用量快速计算浮层组件 (步骤3)
// 依赖: FormulaParser, createCalcStore
// 挂载方式: 全局注册 <formula-calculator-overlay />，单实例 (v-if 控制)
// 提供全局服务 window.$formulaCalc.open(code, formula, triggerEl)

(function(global){
  if (!global.FormulaParser || !global.createCalcStore) {
    console.error('[formula-calculator] 缺少依赖: FormulaParser 或 createCalcStore');
    return;
  }
  const store = global._calcStoreInstance || (global._calcStoreInstance = global.createCalcStore());

  const FormulaCalculatorOverlay = {
    name: 'FormulaCalculatorOverlay',
    template: `
      <div v-if="visible" class="sw-calc-layer" :data-direction="direction" ref="panel" :style="panelStyle" @mousedown.stop>
        <div class="sw-calc-header">
          <span class="title">
            {{ currentCode }}<template v-if="displayScale"> （当前倍数：{{ displayScale }}x）</template>
          </span>
          <div class="actions">
            <el-button size="small" plain @click="onClear">清空</el-button>
            <el-button size="small" plain @click="onClose">关闭</el-button>
          </div>
        </div>
        <div class="sw-calc-body" v-if="ready">
          <template v-if="!state || !state.ingredients || !state.ingredients.length || allInvalid">
            <div class="empty-msg">该自配色无配方或全部无效</div>
          </template>
          <template v-else>
            <table class="sw-calc-table">
              <thead>
                <tr>
                  <th style="width:110px;">原料</th>
                  <th style="width:90px;">原始配比</th>
                  <th style="width:100px;">倍算值</th>
                  <th style="width:90px;">已投放</th>
                  <th style="width:90px;">剩余</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(ing,i) in state.ingredients" :key="'ing'+i" :class="{invalid: ing.invalid}">
                  <td class="ing-name">{{ ing.name }}</td>
                  <td class="ing-base">{{ ing.base }}<span v-if="ing.unit">{{ ing.unit }}</span></td>
                  <td class="ing-target">
                    <template v-if="!ing.invalid">
                      <el-input
                        size="small"
                        :model-value="targetDisplay(i)"
                        @update:modelValue="onInputTarget(i,$event)"
                        placeholder="输入"
                        data-edit-cell
                        data-col="target"
                        :data-row-index="i"
                      />
                    </template>
                    <span v-else class="dim">-</span>
                  </td>
                  <td class="ing-delivered">
                    <template v-if="!ing.invalid">
                      <el-input
                        size="small"
                        :model-value="deliveredDisplay(i)"
                        @update:modelValue="onInputDelivered(i,$event)"
                        placeholder="0"
                        data-edit-cell
                        data-col="delivered"
                        :data-row-index="i"
                      />
                    </template>
                    <span v-else class="dim">-</span>
                  </td>
                  <td class="ing-rem" :class="{neg: remainder(i)<0, rebalance: isRemainderRebalancing(i)}">
                    <span v-if="!ing.invalid && state.targets[i] != null">{{ remainderDisplay(i) }}</span>
                    <span v-else class="dim">-</span>
                  </td>
                </tr>
                <tr v-for="t in totals" :key="'tt-row'+t.unit" class="total-row">
                  <td class="ing-name">总计<span v-if="t.unit">({{ t.unit || '无单位' }})</span></td>
                  <td class="ing-base">{{ round4(t.base) }}<span v-if="t.unit">{{ t.unit }}</span></td>
                  <td class="ing-target">
                    <el-input
                      size="small"
                      :model-value="t.targetInputDisplay"
                      @update:modelValue="onInputTotalTarget(t, $event)"
                      :placeholder="hasAnyTarget? round4(t.base) : '输入'"
                      data-edit-cell
                      data-col="target"
                      :data-row-index="'total-'+(t.unit||'none')"
                    />
                  </td>
                  <td class="ing-delivered">
                    <span v-if="t.anyTarget">{{ round4(t.delivered) }}<span v-if="t.unit">{{ t.unit }}</span></span>
                    <span v-else class="dim">—</span>
                  </td>
                  <td class="ing-rem" :class="{neg: t.remainder<0 && !t.isRebalancing, rebalance: t.isRebalancing && t.remainder>0}">
                    <span v-if="t.anyTarget">
                      <template v-if="t.isRebalancing && t.remainder>0">+{{ round4(t.remainder) }}</template>
                      <template v-else>{{ round4(t.remainder) }}</template>
                      <span v-if="t.unit">{{ t.unit }}</span>
                    </span>
                    <span v-else class="dim">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>
      </div>
    `,
    data(){
      return {
        visible: false,
        currentCode: '',
        formula: '',
        state: null,
        direction: 'right',
        panelStyle: {},
        triggerEl: null,
        ready: false,
  lastActiveEl: null,
  editingValues: {} // 临时编辑态 (支持输入未完成小数 例如 '1.' 或 '.')
      };
    },
    computed: {
      displayScale(){
        if (!this.state || this.state.scaleFactor==null) return '';
        return (this.state.scaleFactor).toFixed(2).replace(/\.00$/,'');
      },
      allInvalid(){
        if (!this.state || !this.state.ingredients) return false;
        return this.state.ingredients.every(i=>i.invalid);
      },
      hasAnyTarget(){
  return this.state && this.state.targets && this.state.targets.some(t=>t!=null);
      },
      totals(){
        if (!this.state) return [];
        const buckets = {};
        const rebalanceInfo = this.getRebalanceInfo();
        
        this.state.ingredients.forEach((ing,i)=>{
          if (ing.invalid) return;
          const u = ing.unit||'';
          if (!buckets[u]) buckets[u] = { base:0, target:0, delivered:0, remainder:0, anyTarget:false, isRebalancing:false };
          buckets[u].base += ing.base;
          const target = this.state.targets[i];
          const delivered = this.state.delivered[i] || 0;
          if (target!=null) {
            buckets[u].target += target;
            buckets[u].anyTarget = true;
          }
          
          // 使用重平衡逻辑计算余量
          if (target!=null) {
            const remainderValue = this.remainder(i);
            buckets[u].remainder += remainderValue;
            
            // 检查是否处于重平衡状态
            if(rebalanceInfo.isRebalancing && rebalanceInfo.groups[u] && rebalanceInfo.groups[u].needsRebalancing){
              buckets[u].isRebalancing = true;
            }
          }
          if (!isNaN(delivered)) buckets[u].delivered += delivered;
        });
        const order = Object.keys(buckets);
        return order.map(u=>{
          const editKey = 'tot-'+(u||'none');
          let display;
          if (this.editingValues && this.editingValues[editKey] != null) {
            display = this.editingValues[editKey];
          } else {
            display = this.hasAnyTarget && buckets[u].anyTarget ? trimZeros(buckets[u].target) : '';
          }
          return { unit:u, ...buckets[u], targetInputDisplay: display };
        });
      },
  round4Proxy(){ return round4; }
    },
    methods: {
  round4(val){ return round4(val); },
      open(code, formula, triggerEl){
        this.currentCode = code;
        this.formula = formula||'';
        this.triggerEl = triggerEl || null;
        this.ready = false;
        this.visible = true;
  this.state = this._wrapState(store.getState(code, formula||''));
        this.$nextTick(()=>{
          this.position();
          this.ready = true;
          this.bindGlobal();
        });
      },
      close(reason){
        this.visible = false;
        this.unbindGlobal();
        this.state = null;
      },
      onClose(){ this.close('user'); },
  onClear(){ if(!this.state) return; store.clearState(this.currentCode); this.state = this._wrapState(store.getState(this.currentCode, this.formula)); },
      position(){
        if(!this.triggerEl || !this.$refs.panel) return;
        const rect = this.triggerEl.getBoundingClientRect();
        const panel = this.$refs.panel;
        const vw = window.innerWidth, vh = window.innerHeight;
        
        // Calculate position for absolute positioning (relative to document)
        // Add scroll offsets to convert from viewport to document coordinates
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        let left = rect.left + scrollX;
        let top = rect.bottom + scrollY + 6; // Default: open below
        const width = panel.offsetWidth || 380;
        const height = panel.offsetHeight || 200;
        
        // Horizontal positioning
        if (rect.left < vw/2) {
          this.direction = 'right';
          if (rect.left + width > vw - 8) left = (vw - width - 8) + scrollX;
        } else {
          this.direction = 'left';
          left = rect.right + scrollX - width;
          if (rect.right - width < 8) left = 8 + scrollX;
        }
        
        // Vertical overflow handling (check against viewport)
        if (rect.bottom + 6 + height > vh - 8) {
          const altTop = rect.top - height - 6;
          if (altTop >= 8) {
            top = rect.top + scrollY - height - 6;
          } else {
            top = (vh - height - 8) + scrollY;
          }
        }
        if (rect.top - height - 6 < 8 && rect.bottom + 6 + height > vh - 8) {
          top = Math.max(8 + scrollY, rect.top + scrollY - height - 6);
        }
        
        const finalStyle = { left: Math.round(left)+'px', top: Math.round(top)+'px' };
        
        this.panelStyle = finalStyle;
      },
      onInputTarget(i, val){
        if(!this.state) return;
        const rawStr = (val||'').toString();
        const clean = filterNumber(rawStr);
        // 判定是否部分小数 (仅 '.' 或 以 '.' 结尾)
        if (rawStr === '' ) {
          delete this.editingValues['t-'+i];
          const rawState = store.getState(this.currentCode, this.formula);
          if (rawState && Array.isArray(rawState.targets)) {
            rawState.targets[i] = null;
            rawState.updatedAt = Date.now();
            store.forcePersist();
            this.state = this._wrapState(rawState);
          }
          return;
        }
        if (isPartialDecimal(rawStr)) { // 保留编辑态 不触发计算
          this.editingValues['t-'+i] = rawStr;
          return;
        } else {
          delete this.editingValues['t-'+i];
        }
        if (clean === '') return; // 防御
        store.applyScale(this.currentCode, i, clean);
        this.state = this._wrapState(store.getState(this.currentCode, this.formula));
      },
      onInputDelivered(i, val){
        if(!this.state) return;
        const rawStr = (val||'').toString();
        const clean = filterNumber(rawStr);
        if (rawStr === '') {
          delete this.editingValues['d-'+i];
          // 空 -> 视为 0 (显示空更直观, 这里设 0 并刷新)
          store.updateDelivered(this.currentCode, i, '0');
          this.state = this._wrapState(store.getState(this.currentCode, this.formula));
          return;
        }
        if (isPartialDecimal(rawStr)) { this.editingValues['d-'+i] = rawStr; return; }
        delete this.editingValues['d-'+i];
        store.updateDelivered(this.currentCode, i, clean);
        this.state = this._wrapState(store.getState(this.currentCode, this.formula));
      },
      onInputTotalTarget(t, val){
        if(!this.state) return;
        const rawStr = (val||'').toString();
        const clean = filterNumber(rawStr);
        const key = 'tot-'+(t.unit||'none');
        if (rawStr === '') { delete this.editingValues[key]; return; }
        if (isPartialDecimal(rawStr)) { this.editingValues[key] = rawStr; return; }
        delete this.editingValues[key];
        if (clean === '') return;
        const num = Number(clean);
        if (!isFinite(num) || num <= 0) return;
        const baseSum = t.base;
        if (!baseSum || baseSum <= 0) return;
        const newFactor = num / baseSum;
        store.applyScaleFactor(this.currentCode, newFactor, this.state.anchorIndex);
        this.state = this._wrapState(store.getState(this.currentCode, this.formula));
      },
      targetDisplay(i){
        // 优先显示编辑态
        const editing = this.editingValues['t-'+i];
        if (editing != null) return editing;
        if(!this.state) return '';
        const t = this.state.targets[i];
        if(t==null) return '';
        return trimZeros(t);
      },
      deliveredDisplay(i){
        const editing = this.editingValues['d-'+i];
        if (editing != null) return editing;
        if(!this.state) return '';
        const v = this.state.delivered[i];
        if(v==null) return '';
        return trimZeros(v);
      },
      remainder(i){
        if(!this.state) return 0;
        const t=this.state.targets[i];
        if(t==null) return 0;
        const d=this.state.delivered[i]||0;
        
        // 检查是否处于超配重平衡状态
        const rebalanceInfo = this.getRebalanceInfo();
        if(rebalanceInfo.isRebalancing){
          const ing = this.state.ingredients[i];
          if(ing && !ing.invalid){
            const unitGroup = ing.unit || '';
            const groupInfo = rebalanceInfo.groups[unitGroup];
            if(groupInfo){
              return groupInfo.additionalNeeded[i] || 0;
            }
          }
        }
        
        // 常规余量计算
        return t - d;
      },
      
      // 获取超配重平衡信息
      getRebalanceInfo(){
        if(!this.state || !this.state.ingredients) return { isRebalancing: false, groups: {} };
        
        const groups = {};
        let hasRebalancing = false;
        
        // 按单位分组计算
        this.state.ingredients.forEach((ing, i) => {
          if(ing.invalid) return;
          const unit = ing.unit || '';
          if(!groups[unit]){
            groups[unit] = {
              ingredients: [],
              totalTarget: 0,
              totalDelivered: 0,
              maxExcessRatio: 1,
              additionalNeeded: {},
              needsRebalancing: false
            };
          }
          
          const target = this.state.targets[i];
          const delivered = this.state.delivered[i] || 0;
          
          if(target != null){
            groups[unit].ingredients.push({ index: i, ing, target, delivered, base: ing.base });
            groups[unit].totalTarget += target;
            groups[unit].totalDelivered += delivered;
            
            // 检查单个成分的超配比例
            if(target > 0 && delivered > target){
              const excessRatio = delivered / target;
              if(excessRatio > groups[unit].maxExcessRatio){
                groups[unit].maxExcessRatio = excessRatio;
                groups[unit].needsRebalancing = true;
                hasRebalancing = true;
              }
            }
          }
        });
        
        // 计算每个单位组的重平衡需求
        Object.keys(groups).forEach(unit => {
          const group = groups[unit];
          if(group.needsRebalancing && group.maxExcessRatio > 1){
            // 以最大超配比例为基准，计算其他成分需要的额外量
            group.ingredients.forEach(item => {
              const { index, target, delivered, base } = item;
              if(base > 0){
                // 按超配比例计算新的目标量
                const newTarget = target * group.maxExcessRatio;
                // 计算还需要额外添加多少
                const additional = Math.max(0, newTarget - delivered);
                group.additionalNeeded[index] = additional;
              }
            });
          }
        });
        
        return { isRebalancing: hasRebalancing, groups };
      },
      
      // 判断余量是否为重平衡状态（用于样式）
      isRemainderRebalancing(i){
        const rebalanceInfo = this.getRebalanceInfo();
        if(!rebalanceInfo.isRebalancing) return false;
        
        const ing = this.state.ingredients[i];
        if(!ing || ing.invalid) return false;
        
        const unitGroup = ing.unit || '';
        const groupInfo = rebalanceInfo.groups[unitGroup];
        return groupInfo && groupInfo.needsRebalancing && (groupInfo.additionalNeeded[i] || 0) > 0;
      },
      remainderDisplay(i){
        const r = this.remainder(i);
        const isRebalancing = this.isRemainderRebalancing(i);
        
        if(isRebalancing && r > 0){
          return '+' + trimZeros(r);
        }
        return trimZeros(r);
      },
      bindGlobal(){
        this._esc = e=>{ if(e.key==='Escape') this.close('esc'); };
        this._resize = ()=> this.position();
        this._outside = e=>{
          if(!this.$refs.panel) return;
          if(this.$refs.panel.contains(e.target)) return;
          if(this.triggerEl && this.triggerEl.contains(e.target)) return;
          this.close('outside');
        };
        this._keydown = e=> this.onKeydown(e);
        window.addEventListener('keydown', this._esc);
        window.addEventListener('resize', this._resize);
        document.addEventListener('mousedown', this._outside, false);
        document.addEventListener('keydown', this._keydown, true);
      },
      unbindGlobal(){
        window.removeEventListener('keydown', this._esc);
        window.removeEventListener('resize', this._resize);
        document.removeEventListener('mousedown', this._outside, false);
        document.removeEventListener('keydown', this._keydown, true);
      },
      _wrapState(raw){
        if(!raw) return raw;
        return {
          ...raw,
          // 克隆数组以触发 Vue 变更侦测
          ingredients: raw.ingredients ? raw.ingredients.slice() : [],
          targets: raw.targets ? raw.targets.slice() : [],
          delivered: raw.delivered ? raw.delivered.slice() : []
        };
      },
      buildFocusLists(){
        if(!this.$refs.panel) return { order:[], byCol:{ target:[], delivered:[] }, rowOrder:[] };
        const targetCol=[]; const deliveredCol=[];
        const all = this.$refs.panel.querySelectorAll('input[data-edit-cell]');
        all.forEach(inp=>{ const col=inp.getAttribute('data-col'); if(col==='target') targetCol.push(inp); else if(col==='delivered') deliveredCol.push(inp); });
        // 列优先顺序 (供上下箭头)
        const order = [...targetCol, ...deliveredCol];
        // 行优先顺序 (供左右箭头): 遍历 tbody > tr 按出现顺序, 收集行内 input 按 DOM 顺序
        const rowOrder=[];
        const rows = this.$refs.panel.querySelectorAll('tbody tr');
        rows.forEach(tr=>{
          const inputs = tr.querySelectorAll('input[data-edit-cell]');
          inputs.forEach(inp=> rowOrder.push(inp));
        });
        return { order, byCol:{ target:targetCol, delivered:deliveredCol }, rowOrder };
      },
      focusCell(el){ if(el){ el.focus(); el.select && el.select(); } },
      onKeydown(e){
        if(!this.visible) return;
        if(!this.$refs.panel) return;
        const isInside = this.$refs.panel.contains(document.activeElement);
        const { order, byCol } = this.buildFocusLists();
        if(!order.length) return;
        // TAB 循环
        if(e.key==='Tab'){
          e.preventDefault();
            if(!isInside){ this.focusCell(order[0]); return; }
          const idx = order.indexOf(document.activeElement);
          const dir = e.shiftKey? -1 : 1;
          let next = (idx + dir) % order.length; if(next<0) next = order.length-1;
          this.focusCell(order[next]);
          return;
        }
        // 上下箭头: 垂直移动 (列优先) 到上一/下一, 到尽头换列
        if(e.key==='ArrowDown' || e.key==='ArrowUp'){
          if(!isInside){ return; }
          const active = document.activeElement;
          const col = active.getAttribute('data-col');
          const list = byCol[col]||[];
          const idx = list.indexOf(active);
          if(idx===-1) return;
          e.preventDefault();
          if(e.key==='ArrowDown'){
            if(idx < list.length-1){ this.focusCell(list[idx+1]); }
            else { // 换列
              const nextCol = col==='target'? 'delivered':'target';
              const nextList = byCol[nextCol]||[]; if(nextList.length) this.focusCell(nextList[0]);
            }
          } else { // ArrowUp
            if(idx>0){ this.focusCell(list[idx-1]); }
            else { const prevCol = col==='target'? 'delivered':'target'; const prevList = byCol[prevCol]||[]; if(prevList.length) this.focusCell(prevList[prevList.length-1]); }
          }
          return;
        }
        // 左右箭头: 在输入内先移动光标. 若已在边界且无选择范围则跳单元格 (按列优先顺序整序列)
        if(e.key==='ArrowLeft' || e.key==='ArrowRight'){
          if(!isInside) return;
          const active = document.activeElement; if(!active || active.tagName!=='INPUT') return;
          const selStart = active.selectionStart; const selEnd = active.selectionEnd;
          if(selStart==null || selEnd==null) return; // 非文本框
          // 若有选择范围，允许默认调整选择
          if(selStart!==selEnd) return;
          const valLen = (active.value||'').length;
          const atStart = selStart===0;
          const atEnd = selStart===valLen;
          const { rowOrder } = this.buildFocusLists();
          const idx = rowOrder.indexOf(active);
          if(idx===-1) return;
          if(e.key==='ArrowLeft'){
            if(!atStart) return; // 先移动光标
            e.preventDefault();
            const prev = (idx-1)>=0? rowOrder[idx-1] : rowOrder[rowOrder.length-1];
            this.focusCell(prev);
          } else if(e.key==='ArrowRight'){
            if(!atEnd) return; // 先移动光标
            e.preventDefault();
            const next = (idx+1)<rowOrder.length? rowOrder[idx+1] : rowOrder[0];
            this.focusCell(next);
          }
        }
      }
    }
  };

  function filterNumber(str){
    if (str==null) return '';
    str = String(str).replace(/[^\d.]/g,'');
    if (!str) return '';
    const MAX_VAL = 9999;
    const first = str.indexOf('.');
    if (first === -1) {
      // 纯整数
      // 去掉前导 0 (保留单个 0)
      str = str.replace(/^0+(\d)/,'$1');
      if (str==='') str='0';
      const num = parseInt(str,10);
      if (num > MAX_VAL) return String(MAX_VAL);
      return String(num);
    } else {
      // 有小数点: 保留第一处, 其余去掉
      let intPart = str.slice(0, first).replace(/\./g,'');
      let decPart = str.slice(first+1).replace(/\./g,'');
      // 限制小数位 2 位
      if (decPart.length > 2) decPart = decPart.slice(0,2);
      // 允许用户输入 '.' (在调用方用 isPartialDecimal 处理), 这里只处理完整数值/截断
      if (intPart==='') intPart='0';
      // 去除 intPart 前导零
      intPart = intPart.replace(/^0+(\d)/,'$1');
      if (intPart==='') intPart='0';
      let composed = decPart.length? (intPart + '.' + decPart) : intPart + (str.endsWith('.')?'.':'');
      // 若用户还在输入阶段 (以 '.' 结尾) 由上层 isPartialDecimal 拦截; 这里若不是部分态则校验数值
      if (!/\.$/.test(composed)) {
        const val = parseFloat(composed);
        if (val > MAX_VAL) return String(MAX_VAL);
        // 不能超过 9999 整数且保留至两位小数 (不去掉用户输入的有效小数)
        return composed;
      }
      return composed; // 保留部分态 '.','123.' 由上层处理
    }
  }
  // 判定是否处于用户尚未完成的小数输入阶段: '.' 或 以 '.' 结尾 (且不只是 '.')
  function isPartialDecimal(raw){
    if (raw === '.') return true;
    if (/^\d+\.$/.test(raw)) return true;
    return false;
  }
  function trimZeros(n){
    if (n==null) return '';
    let s = Number(n).toFixed(2); // 改为最多两位小数
    s = s.replace(/0+$/,'').replace(/\.$/,'');
    return s;
  }
  function round4(n){ return trimZeros(n); }

  // 注册组件
  if (global.Vue && global.Vue.createApp) {
    // 由 app.js 注册前保证可用, 也可以在 app.js 后注册
    global.FormulaCalculatorOverlay = FormulaCalculatorOverlay;
  }

  // 全局服务
  const service = {
    _app: null,
    _vm: null,
    ensureInstance(rootApp){
      if (this._vm) return this._vm;
      // Create mount point directly on body for proper fixed positioning
      let mountPoint = document.getElementById('sw-calc-overlay-root');
      if (!mountPoint) {
        mountPoint = document.createElement('div');
        mountPoint.id = 'sw-calc-overlay-root';
        // Ensure mount point doesn't interfere with positioning
        mountPoint.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 50;';
        document.body.appendChild(mountPoint);
      }
      const compApp = Vue.createApp(FormulaCalculatorOverlay);
      compApp.use(ElementPlus);
      this._vm = compApp.mount(mountPoint);
      return this._vm;
    },
    open(code, formula, triggerEl, rootApp){
      const vm = this.ensureInstance(rootApp);
      vm.open(code, formula, triggerEl);
    },
    close(){ if(this._vm) this._vm.close('api'); }
    ,syncFormulaChange(code, newFormula){
      // 若当前打开同 code, 需要刷新 overlay
      const st = store.syncFormulaChange(code, newFormula||'');
      if (this._vm && this._vm.visible && this._vm.currentCode === code) {
        this._vm.formula = newFormula||'';
        this._vm.state = st;
      }
    }
  };

  global.$formulaCalc = service;

})(window);
