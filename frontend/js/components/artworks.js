/* 作品配色管理组件
  - 顶部“视图切换”双按钮：层号优先 / 自配色优先
  - 顶部“排序”双按钮：按时间 / 按名称（外部传入 sortMode）
   - 顶部“+ 新作品”按钮：新增母bar（作品）
   - 母bar：作品标题 + “+ 新增配色方案”
   - 子bar：方案名、缩略图、矩阵视图、修改/历史（历史占位）
   - 编辑对话框：方案名、缩略图上传/替换/删除、层-自配色映射（可增删行），回车=保存
*/
const ArtworksComponent = {
  props: {
    sortMode: { type: String, default: 'time' } // time | name
  },
  emits: ['view-mode-changed'],
  template: `
    <div>
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon> 加载中...
      </div>

      <div v-else>
        <div v-if="artworks.length === 0" class="empty-message">暂无作品，点击右上角“新作品”添加</div>

        <!-- 母bar：作品 -->
  <div v-for="art in artworks" :key="art.id" class="artwork-bar" :data-art-id="art.id" :data-focus-single="art._swFocusSingle ? 'true' : null">
          <div class="artwork-header">
            <div class="artwork-title">{{ $helpers.formatArtworkTitle(art) }}</div>
            <div class="color-actions">
              <el-button size="small" @click="addScheme(art)"><el-icon><Plus /></el-icon> 新增配色方案</el-button>
              <template v-if="(art.schemes||[]).length>0">
                <el-tooltip content="该作品下仍有配色方案，无法删除作品" placement="top">
                  <span>
                    <el-button size="small" type="danger" disabled><el-icon><Delete /></el-icon> 删除</el-button>
                  </span>
                </el-tooltip>
              </template>
              <el-button v-else size="small" type="danger" @click="deleteArtwork(art)"><el-icon><Delete /></el-icon> 删除</el-button>
            </div>
          </div>

          <!-- 子bar：方案 -->
          <div v-if="(art.schemes && art.schemes.length) > 0">
            <div class="scheme-bar" v-for="scheme in art.schemes" :key="scheme.id" :ref="setSchemeRef(scheme)" :class="{ 'highlight-pulse': art._swFocusSingle }">
              <div class="scheme-header">
                <div class="scheme-thumbnail" :class="{ 'no-image': !scheme.thumbnail_path }" @click="scheme.thumbnail_path && $thumbPreview && $thumbPreview.show($event, $helpers.buildUploadURL(baseURL, scheme.thumbnail_path))">
                  <template v-if="!scheme.thumbnail_path">未上传图片</template>
                  <img v-else :src="$helpers.buildUploadURL(baseURL, scheme.thumbnail_path)" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                </div>
                <div style="flex: 1;">
                  <div class="scheme-name">{{ displaySchemeName(art, scheme) }}</div>
                  <div class="meta-text">层数：{{ (scheme.layers || []).length }}</div>
                  <div class="meta-text" v-if="scheme.updated_at">更新：{{ $helpers.formatDate(scheme.updated_at) }}</div>
                </div>
                <div class="color-actions">
                  <el-button size="small" type="primary" @click="editScheme(art, scheme)">
                    <el-icon><Edit /></el-icon> 修改
                  </el-button>
                  <el-button size="small" @click="showHistory(art, scheme)" disabled>
                    <el-icon><Clock /></el-icon> 历史
                  </el-button>
                  <el-button size="small" type="danger" @click="deleteScheme(art, scheme)">
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </div>
              </div>

              <!-- 矩阵视图 -->
              <div v-if="viewMode === 'byLayer'">
                <table class="layer-table">
                  <thead>
                    <tr>
                      <th v-for="m in normalizedMappings(scheme)" :key="'h'+m.layer" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightLayers.includes(m.layer) && (!highlightColorCode || m.colorCode===highlightColorCode)}">
                        <span class="layer-cell">
                          <template v-if="dupCountFor(scheme, m.layer) > 1">
                            <el-tooltip :content="'检测到第' + m.layer + '层被分配了' + dupCountFor(scheme, m.layer) + '次颜色'" placement="top">
                              <span class="dup-badge" :style="{ backgroundColor: dupBadgeColor(m.layer) }">!</span>
                            </el-tooltip>
                          </template>
                          <span>第{{ m.layer }}层</span>
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td v-for="m in normalizedMappings(scheme)" :key="'c'+m.layer" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightLayers.includes(m.layer) && (!highlightColorCode || m.colorCode===highlightColorCode)}" style="position:relative;">
                        <strong>{{ m.colorCode ? m.colorCode : '（未指定）' }}</strong>
                        <template v-if="m.colorCode && colorByCode(m.colorCode) && colorByCode(m.colorCode).formula">
                          <button class="calc-mini-btn" @click.stop="$calc && $calc.open(m.colorCode, colorByCode(m.colorCode).formula||'', $event.currentTarget)" title="快速计算">算</button>
                        </template>
                      </td>
                    </tr>
                    <tr>
                      <td v-for="m in normalizedMappings(scheme)" :key="'f'+m.layer" class="meta-text" style="text-align:left;" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightLayers.includes(m.layer) && (!highlightColorCode || m.colorCode===highlightColorCode)}">
                        <template v-if="!m.colorCode">
                          -
                        </template>
                        <template v-else-if="colorByCode(m.colorCode)">
                          <template v-if="structuredFormula(colorByCode(m.colorCode).formula).lines.length">
                            <div class="formula-lines" :style="{ '--max-name-ch': structuredFormula(colorByCode(m.colorCode).formula).maxNameChars }">
                              <div class="fl" v-for="(p,i) in structuredFormula(colorByCode(m.colorCode).formula).lines" :key="'pfl'+i">
                                <span class="fl-name">{{ p.name }}</span>
                                <span class="fl-amt" v-if="p.amount">{{ p.amount }}{{ p.unit }}</span>
                              </div>
                            </div>
                          </template>
                          <span v-else>（无配方）</span>
                        </template>
                        <span v-else>（未匹配到自配色：{{ m.colorCode }}）</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

      <div v-else>
    <table class="layer-table bycolor-table">
                  <thead>
                    <tr>
          <th v-for="g in groupedByColorWithFlags(scheme)" :key="'hc'+g.code" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightColorCode && g.code===highlightColorCode}" style="position:relative;">
            {{ g.code ? g.code : (g.isEmptyGroup ? '(未指定)' : '-') }}
            <template v-if="g.code && colorByCode(g.code) && colorByCode(g.code).formula">
              <button class="calc-mini-btn" @click.stop="$calc && $calc.open(g.code, colorByCode(g.code).formula||'', $event.currentTarget)" title="快速计算" style="position:absolute; top:2px; right:4px;">算</button>
            </template>
          </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td v-for="g in groupedByColorWithFlags(scheme)" :key="'fc'+g.code" class="meta-text formula-chip-row" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightColorCode && g.code===highlightColorCode}">
                        <template v-if="g.isEmptyGroup">
                          -
                        </template>
                        <template v-else-if="colorByCode(g.code)">
                          <template v-if="structuredFormula(colorByCode(g.code).formula).lines.length">
                            <div class="formula-lines" :style="{ '--max-name-ch': structuredFormula(colorByCode(g.code).formula).maxNameChars }">
                              <div class="fl" v-for="(p,i) in structuredFormula(colorByCode(g.code).formula).lines" :key="'bcfl'+g.code+'-'+i">
                                <span class="fl-name">{{ p.name }}</span>
                                <span class="fl-amt" v-if="p.amount">{{ p.amount }}{{ p.unit }}</span>
                              </div>
                            </div>
                          </template>
                          <span v-else>（无配方）</span>
                        </template>
                        <span v-else>（未匹配到自配色：{{ g.code }}）</span>
                      </td>
                    </tr>
                    <tr class="layers-row">
                      <td v-for="g in groupedByColorWithFlags(scheme)" :key="'lc'+g.code" class="layers-cell" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightColorCode && g.code===highlightColorCode}">
                        <div class="layers-line">
                          <span>第 </span>
                          <template v-for="(l, i) in g.layers" :key="'l'+g.code+'-'+l+'-'+i">
                            <span class="layer-cell">
                              <template v-if="dupCountFor(scheme, l) > 1">
                                <el-tooltip :content="'检测到第' + l + '层被分配了' + dupCountFor(scheme, l) + '次颜色'" placement="top">
                                  <span class="dup-badge" :style="{ backgroundColor: dupBadgeColor(l) }">!</span>
                                </el-tooltip>
                              </template>
                              <span>{{ l }}</span>
                            </span>
                            <span v-if="i < g.layers.length - 1">、</span>
                          </template>
                          <span> 层</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-if="art._swSearchSchemesPartial" class="meta-text" style="padding:4px 6px 6px;">（仅显示命中的配色方案）</div>
            <div v-else-if="art._swSearchArtOnly" class="meta-text" style="padding:4px 6px 6px;">（作品命中，方案均未命中）</div>
          </div>

          <div v-else>
            <div v-if="art._swSearchNoSchemeMatch" class="empty-message">作品命中，但未匹配到包含关键字的配色方案</div>
            <div v-else class="empty-message">暂无配色方案，点击“新增配色方案”添加</div>
          </div>
        </div>
      </div>

      <!-- 方案编辑/新增对话框 -->
      <!-- 新作品对话框 -->
      <el-dialog
        class="scheme-dialog"
        v-model="showArtworkDialog"
        title="新作品"
        width="480px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        @open="onOpenArtworkDialog"
        @close="onCloseArtworkDialog"
      >
        <el-form ref="artworkFormRef" :model="artworkForm" :rules="artworkRules" label-width="80px" @keydown.enter.stop.prevent="saveNewArtwork">
          <el-form-item label="作品" prop="title" required>
            <el-input v-model.trim="artworkForm.title" placeholder="示例：C02-中国结02" @input="onArtworkTitleInput"></el-input>
            <div class="form-hint">格式：作品编号-作品名称<br>作品编号=3~5位字母/数字（自动转大写）<br>作品名称=中英文或数字，不含特殊符号（- * / 等）</div>
            <div v-if="artworkTitleStatus==='ok'" class="form-hint success-hint">可添加此新作品</div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="attemptCloseArtworkDialog"><el-icon><Close /></el-icon> 取消</el-button>
          <el-button type="primary" @click="saveNewArtwork"><el-icon><Check /></el-icon> 创建</el-button>
        </template>
      </el-dialog>

      <el-dialog
        class="scheme-dialog"
        v-model="showSchemeDialog"
        :title="schemeForm.id ? '修改配色方案' : '新增配色方案'"
        width="760px"
  :close-on-click-modal="false"
  :close-on-press-escape="false"
  @open="onOpenDialog"
  @close="onCloseDialog"
      >
        <el-form ref="schemeFormRef" :model="schemeForm" :rules="schemeRules" label-width="80px" @submit.prevent @keydown.enter.stop.prevent="saveScheme">
          <el-form-item label="方案名称" prop="name" required>
            <div class="inline-scheme-name dup-inline-row">
              <span class="inline-art-title">{{ editingArtTitle }}</span>
              <span class="scheme-sep"> - [</span>
              <el-input v-model.trim="schemeForm.name" placeholder="例如：金黄" class="scheme-name-input" :maxlength="10" />
              <span class="scheme-bracket-end">]</span>
              <span v-if="schemeNameDuplicate" class="dup-msg">名称重复</span> <!-- 统一查重：仅内联显示，不再弹出 Toast -->
            </div>
          </el-form-item>

          <el-form-item label="缩略图">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="scheme-thumbnail"
                :style="{
                  backgroundImage: schemeForm.thumbnailPreview ? 'url(' + schemeForm.thumbnailPreview + ')' : 'none',
                  backgroundColor: schemeForm.thumbnailPreview ? 'transparent' : '#f0f0f0'
                }"
                :class="{ 'no-image': !schemeForm.thumbnailPreview }"
                @click="schemeForm.thumbnailPreview && $thumbPreview && $thumbPreview.show($event, schemeForm.thumbnailPreview)"
              >
                <template v-if="!schemeForm.thumbnailPreview">未上传图片</template>
              </div>
              <div style="display:flex; gap:8px;">
                <el-upload
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="onThumbChange"
                  accept="image/*"
                >
                  <el-button><el-icon><Upload /></el-icon> 选择图片</el-button>
                </el-upload>
                <el-button type="warning" :disabled="!schemeForm.thumbnailPreview" @click="clearThumb">
                  <el-icon><Delete /></el-icon> 移除
                </el-button>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="层-自配色">
            <div style="width:100%;">
              <table class="layer-table mapping-table">
                <thead>
                  <tr>
                    <th style="width:80px;">层号</th>
                    <th style="width:260px;">自配色号</th>
                    <th style="width:110px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(m, idx) in schemeForm.mappings" :key="idx">
                    <td>
                      <span class="layer-cell">
                        <span class="badge-slot">
                          <template v-if="formDupCounts[m.layer] > 1">
                            <el-tooltip :content="'检测到第' + m.layer + '层被分配了' + formDupCounts[m.layer] + '次颜色'" placement="top">
                              <span class="dup-badge" :style="{ backgroundColor: dupBadgeColor(m.layer) }">!</span>
                            </el-tooltip>
                          </template>
                        </span>
                        <el-input-number v-model="m.layer" :min="1" :max="200" controls-position="right" />
                      </span>
                    </td>
                    <td>
                      <el-select v-model="m.colorCode" filterable clearable placeholder="选择自配色号">
                        <el-option
                          v-for="c in customColors"
                          :key="c.id"
                          :label="c.color_code"
                          :value="c.color_code"
                        />
                      </el-select>
                      <div v-if="m.colorCode && colorByCode(m.colorCode)" class="mapping-formula-chips">
                        <template v-if="parseFormulaLines(colorByCode(m.colorCode).formula).length">
                          <template v-for="(line,i) in parseFormulaLines(colorByCode(m.colorCode).formula)" :key="'mf'+idx+'-'+i">
                            <span class="mf-chip">{{ line }}</span>
                          </template>
                        </template>
                        <span v-else class="meta-text">（无配方）</span>
                      </div>
                    </td>
                    <td>
                      <el-button size="small" @click="duplicateRow(idx)"><el-icon><CopyDocument /></el-icon></el-button>
                      <el-button size="small" type="danger" @click="removeRow(idx)"><el-icon><Delete /></el-icon></el-button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="add-button-container">
                <el-button size="small" @click="addRow"><el-icon><Plus /></el-icon> 添加一行</el-button>
                <span class="add-hint">按层号顺序填写；保存时会按层号排序（允许相同层号）</span>
              </div>
            </div>
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="attemptCloseSchemeDialog"><el-icon><Close /></el-icon> 取消</el-button>
          <el-button type="primary" :loading="saving" :disabled="schemeNameDuplicate" @click="saveScheme"><el-icon><Check /></el-icon> 保存</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  inject: ['globalData'],
  data() {
    return {
      loading: false,
  viewMode: 'byLayer', // byLayer | byColor（全局切换）
      showSchemeDialog: false,
  showArtworkDialog: false,
      schemeEditing: null,      // {art, scheme} 或 null
      editingArtId: null,
      schemeForm: {
        id: null,
        name: '',
        thumbnailFile: null,
        thumbnailPreview: null,
        mappings: [] // [{ layer: Number, colorCode: String }]
      },
  schemeRules: { name: [ { required:true, message:'请输入方案名称', trigger:'blur' } ] },
      saving: false
  , _formulaCache: null
  , _schemeOriginalSnapshot: null
  , _escHandler: null
  , artworkForm: { title: '' }
  , artworkRules: {
    title: [
      { required: true, message: '请输入“编号-名称”', trigger: 'blur' },
      { validator: (r,v,cb)=>cb(), trigger: ['blur','change'] } // 真正的校验器在 mounted 中替换
    ]
  }
  , _artworkSnapshot: null
  , artworkTitleStatus: '' // '' | 'ok'
  , highlightSchemeId: null
  , highlightLayers: []
  , highlightColorCode: ''
  , _highlightTimer: null
  , _schemeRefs: new Map()
    };
  },
  computed: {
  baseURL() { return window.location.origin; },
    // 回退：直接使用注入的 artworks 原始数组并按 sortMode 排序（暂不做搜索过滤）
    artworks() {
      const raw = (this.globalData.artworks?.value || []).slice();
      // 排序
      if (this.sortMode === 'name') {
        raw.sort((a,b)=>this.$helpers.formatArtworkTitle(a).localeCompare(this.$helpers.formatArtworkTitle(b)));
      } else {
        raw.sort((a,b)=> new Date(b.updated_at||b.created_at||0) - new Date(a.updated_at||a.created_at||0));
      }
      const q = (this.$root && this.$root.globalSearchQuery || '').trim().toLowerCase();
      if (!q || this.$root.activeTab !== 'artworks') return raw;
      const tokens = q.split(/\s+/).filter(t=>t);
      const multi = tokens.length > 1;
      // 先尝试：若多 token 能唯一锁定到 某作品 + 某方案（全部 tokens 在 作品代码/名称/方案名 合集中都命中），则只保留该作品的所有命中方案（且若其中仅命中一个方案，则只显示那个方案）。
      const processed = raw.map(a => {
        const code = (a.code||'').toLowerCase();
        const name = (a.name||a.title||'').toLowerCase();
        const artCombo = code && name ? code+'-'+name : (code||name);
        const schemes = Array.isArray(a.schemes)? a.schemes.slice():[];
        // 每个方案的匹配：tokens 分布在 作品(code/name/combo) 或 方案名
        const matchedSchemes = schemes.filter(s => {
          const sName = (s.name||'').toLowerCase();
          if (multi) return tokens.every(t => sName.includes(t) || code.includes(t) || name.includes(t) || artCombo.includes(t));
          return sName.includes(q);
        });
        const artNameHit = multi ? tokens.every(t=> code.includes(t)|| name.includes(t)|| artCombo.includes(t)) : (code.includes(q)|| name.includes(q)|| artCombo.includes(q));
        if (!artNameHit && matchedSchemes.length===0) return null;
        const clone = Object.assign({}, a);
        if (artNameHit && matchedSchemes.length===0) {
          // 仅作品命中：显示所有方案
          clone.schemes = schemes;
          clone._swSearchArtOnly = true;
        } else if (!artNameHit) {
          // 仅方案命中：只显示命中方案
          clone.schemes = matchedSchemes;
          clone._swSearchSchemesPartial = true;
        } else {
          // 作品与方案均命中：只显示命中方案集合（更符合“聚焦”需求）
          clone.schemes = matchedSchemes.length ? matchedSchemes : schemes;
          clone._swSearchSchemesPartial = matchedSchemes.length>0;
        }
        return clone;
      }).filter(Boolean);
      // 若多 token 且整体只剩一个作品，并且该作品下只剩一个方案，则这是“单方案视图”情形：无需额外样式，只返回即可
      return processed;
    },
    editingArtwork() {
      if (!this.editingArtId) return null;
      return this.artworks.find(a => a.id === this.editingArtId) || null;
    },
    schemeNameDuplicate() {
      const name = (this.schemeForm.name || '').trim();
      if (!name || !this.editingArtwork) return false;
      const list = (this.editingArtwork.schemes || []).filter(s => s && typeof s.name === 'string');
      return list.some(s => s.name === name && s.id !== this.schemeForm.id);
    },
    customColors() { return this.globalData.customColors.value || []; },
    colorMap() {
      const map = {};
      (this.customColors || []).forEach(c => {
        const code = c.code || c.colorCode || c.color_code;
        if (code) map[code] = c;
      });
      return map;
    },
    formDupCounts() {
      const counts = {};
      const rows = (this.schemeForm && Array.isArray(this.schemeForm.mappings)) ? this.schemeForm.mappings : [];
      rows.forEach(m => {
        const l = Number(m.layer);
        if (Number.isFinite(l) && l > 0) {
          counts[l] = (counts[l] || 0) + 1;
        }
      });
      return counts;
    },
    editingArtTitle() {
      // 优先从 schemeEditing.art 取，回退按 editingArtId 查找
      if (this.schemeEditing && this.schemeEditing.art) {
        return this.$helpers.formatArtworkTitle(this.schemeEditing.art);
      }
      const art = this.artworks.find(a => a.id === this.editingArtId);
      return art ? this.$helpers.formatArtworkTitle(art) : '';
    }
  },
  methods: {
    dupCountFor(scheme, layer) {
      const l = Number(layer);
      if (!Number.isFinite(l)) return 0;
      const rows = this.normalizedMappings(scheme);
      let c = 0;
      for (const r of rows) if (Number(r.layer) === l) c++;
      return c;
    },
    displaySchemeName(art, scheme) {
      const title = this.$helpers.formatArtworkTitle(art);
      const sn = (scheme && (scheme.name || scheme.scheme_name)) || '-';
      return `${title}-[${sn}]`;
    },
    async refreshAll() {
      // 依赖全局 loadArtworks（已包含 schemes 的 layers）避免重复拉取导致覆盖
      await Promise.all([
        this.globalData.loadCustomColors(),
        this.globalData.loadArtworks(),
      ]);
    },
    toggleViewMode() {
  this.viewMode = this.viewMode === 'byLayer' ? 'byColor' : 'byLayer';
  try { localStorage.setItem('sw_artworks_view_mode', this.viewMode); } catch(e) {}
  this.$emit('view-mode-changed', this.viewMode);
    },
    colorByCode(code) {
      return code ? this.colorMap[code] : null;
    },
    // 将配方字符串拆成一行一条成分：匹配 “名称 数值单位” 组合
    parseFormulaLines(formula) {
      const str = (formula || '').trim();
      if (!str) return [];
      const parts = str.split(/\s+/);
      const lines = [];
      let buffer = null; // { name }
      for (const token of parts) {
        const m = token.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
        if (m && buffer) {
          lines.push(`${buffer} ${m[1]}${m[2]}`);
          buffer = null;
        } else {
          // 新的颜色名
          if (buffer) {
            // 上一个没有数量，直接推入
            lines.push(buffer);
          }
          buffer = token;
        }
      }
      if (buffer) lines.push(buffer);
      return lines;
    },
    // 结构化配方：返回 { lines: [{name,amount,unit}], maxNameChars }
    structuredFormula(formula) {
      if (!this._formulaCache) this._formulaCache = new Map();
      const key = formula || '';
      if (this._formulaCache.has(key)) return this._formulaCache.get(key);
      const str = (key).trim();
      if (!str) { const empty = { lines: [], maxNameChars: 0 }; this._formulaCache.set(key, empty); return empty; }
      const parts = str.split(/\s+/);
      const lines = [];
      let current = null;
      for (const token of parts) {
        const m = token.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
        if (m && current) {
          lines.push({ name: current, amount: m[1], unit: m[2] });
          current = null;
        } else {
          if (current) { // 上一个没有匹配到数量
            lines.push({ name: current, amount: '', unit: '' });
          }
            current = token;
        }
      }
      if (current) lines.push({ name: current, amount: '', unit: '' });
      const maxNameChars = lines.reduce((m, l) => Math.max(m, l.name.length), 0);
      const result = { lines, maxNameChars };
      this._formulaCache.set(key, result);
      return result;
    },
    normalizedMappings(scheme) {
      // scheme.layers: [{layer, colorCode}] or { [layer]: colorCode }
      let rows = [];
      if (Array.isArray(scheme.layers)) {
        rows = scheme.layers.map(x => ({ layer: Number(x.layer), colorCode: x.colorCode || x.code || x.custom_color_code || '' }));
      } else if (scheme.layers && typeof scheme.layers === 'object') {
        rows = Object.keys(scheme.layers).map(k => ({ layer: Number(k), colorCode: scheme.layers[k] }));
      }
      return rows
        .filter(x => Number.isFinite(x.layer))
        .sort((a, b) => a.layer - b.layer);
    },
    groupedByColor(scheme) {
      const m = this.normalizedMappings(scheme);
      const map = new Map();
      const emptyLayers = [];
      m.forEach(x => {
        const raw = x.colorCode;
        if (!raw) {
          emptyLayers.push(x.layer);
        } else {
          const key = raw;
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(x.layer);
        }
      });
      const arr = Array.from(map.entries()).map(([code, layers]) => ({
        code,
        layers: layers.sort((a, b) => a - b),
        isEmptyGroup: false
      }));
      if (emptyLayers.length) {
        arr.push({ code: '', layers: emptyLayers.sort((a,b)=>a-b), isEmptyGroup: true });
      }
      // 排序：正常 code 字典序，其次空组（未指定）放最后
      arr.sort((a, b) => {
        if (a.isEmptyGroup && b.isEmptyGroup) return 0;
        if (a.isEmptyGroup) return 1;
        if (b.isEmptyGroup) return -1;
        return a.code.localeCompare(b.code);
      });
      return arr;
    },
    duplicateLayerSet(scheme) {
      const dupSet = new Set();
      const seen = new Map();
      const rows = this.normalizedMappings(scheme);
      rows.forEach(r => {
        const cnt = (seen.get(r.layer) || 0) + 1;
        seen.set(r.layer, cnt);
        if (cnt > 1) dupSet.add(r.layer);
      });
      return dupSet;
    },
    groupedByColorWithFlags(scheme) {
      const groups = this.groupedByColor(scheme);
      const dup = this.duplicateLayerSet(scheme);
  return groups.map(g => ({ ...g, hasDup: (g.layers || []).some(l => dup.has(l)) }));
    },
    hasScheme(schemeId) {
      schemeId = Number(schemeId);
      if (!schemeId) return false;
      return (this.artworks || []).some(a => (a.schemes||[]).some(s => s.id === schemeId));
    },
    setSchemeRef(scheme) {
      return (el) => {
        if (el) this._schemeRefs.set(scheme.id, el); else this._schemeRefs.delete(scheme.id);
      };
    },
    focusArtwork(id) {
      if (!id) return;
      this.$nextTick(()=>{
        const el = document.querySelector(`.artwork-bar[data-art-id="${id}"]`);
        if (!el) return;
        try {
          const rect = el.getBoundingClientRect();
          const current = window.pageYOffset || document.documentElement.scrollTop;
          const offset = current + rect.top - 20; // 顶部缓冲
          window.scrollTo(0, Math.max(0, offset));
        } catch(e) { el.scrollIntoView(); }
        el.classList.add('highlight-pulse');
        setTimeout(()=> el.classList.remove('highlight-pulse'), 2100);
      });
    },
    focusSchemeUsage({ artworkId, schemeId, layers, colorCode }) {
      if (!schemeId) return;
      // 设置高亮状态
      this.highlightSchemeId = schemeId;
      this.highlightColorCode = colorCode || '';
      // byLayer 模式仅高亮同时层号匹配 + 颜色匹配的列（模板已做颜色二次判断）
      this.highlightLayers = Array.isArray(layers) ? layers.slice() : [];
  try { console.debug('[focusSchemeUsage]', { schemeId, layers: this.highlightLayers, color: this.highlightColorCode, viewMode: this.viewMode }); } catch(e) {}
      // 追加：输出该方案的 normalizedMappings 用于排查
      try {
        const art = (this.artworks || []).find(a => a.id === artworkId);
        const scheme = art ? (art.schemes || []).find(s => s.id === schemeId) : null;
        if (scheme) {
          const rows = this.normalizedMappings(scheme);
          console.debug('[focusSchemeUsage rows]', rows);
          if (this.viewMode === 'byLayer') {
            const targetSet = new Set(this.highlightLayers);
            const matchRows = rows.filter(r => targetSet.has(r.layer));
            console.debug('[focusSchemeUsage layerMatches]', matchRows, 'colorFilter=', this.highlightColorCode || '(none)');
          } else {
            console.debug('[focusSchemeUsage byColor targetCode]', this.highlightColorCode);
          }
        } else {
          console.warn('[focusSchemeUsage] 未找到方案数据 schemeId=', schemeId);
        }
      } catch(e) { console.warn('focusSchemeUsage debug error', e); }
      if (this._highlightTimer) { clearTimeout(this._highlightTimer); this._highlightTimer=null; }
      this._highlightTimer = setTimeout(()=>{
        this.highlightSchemeId = null; this.highlightColorCode=''; this.highlightLayers=[]; this._highlightTimer=null;
      }, 2000);
      // 滚动定位
      this.$nextTick(() => {
        const el = this._schemeRefs.get(schemeId);
        if (el && el.scrollIntoView) {
          try {
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight || document.documentElement.clientHeight;
            const current = window.pageYOffset || document.documentElement.scrollTop;
            const targetScroll = current + rect.top - (vh/2 - rect.height/2);
            // 直接跳转，无动画
            window.scrollTo(0, Math.max(0, targetScroll));
          } catch(e) { el.scrollIntoView({ block:'center' }); }
        }
      });
    },

    // 顶部“新作品”
    async addArtwork() {
      this.artworkForm = { title: '' };
      this.showArtworkDialog = true;
    },
    onOpenArtworkDialog() {
      this._artworkSnapshot = JSON.stringify(this._normalizedArtworkForm());
      this._bindEsc(); // 复用 ESC 逻辑（同方案对话框）
    },
    onCloseArtworkDialog() {
      this._artworkSnapshot = null;
      if (!this.showSchemeDialog) this._unbindEsc();
    },
    _normalizedArtworkForm() {
      return { title: this.artworkForm.title || '' };
    },
    _isArtworkDirty() {
      if (!this._artworkSnapshot) return false;
      return JSON.stringify(this._normalizedArtworkForm()) !== this._artworkSnapshot;
    },
    async attemptCloseArtworkDialog() {
      if (this._isArtworkDirty()) {
        try {
          await ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存的修改', {
            confirmButtonText: '丢弃修改',
            cancelButtonText: '继续编辑',
            type: 'warning'
          });
        } catch(e) { return; }
      }
      this.showArtworkDialog = false;
    },
    async saveNewArtwork() {
  const valid = await this.$refs.artworkFormRef.validate().catch(()=>false);
  if (!valid) return; // 校验失败，错误信息已在输入框下显示
  const parsed = this._parseArtworkTitle(this.artworkForm.title);
  if (!parsed) return; // 理论上不会到这
  const { code, name } = parsed;
      try {
  await axios.post(`${window.location.origin}/api/artworks`, { code, name });
        ElementPlus.ElMessage.success('已创建新作品');
        await this.refreshAll();
        this.showArtworkDialog = false;
      } catch(e) {
        console.error(e);
        ElementPlus.ElMessage.error('创建失败');
      }
    },
    onArtworkTitleInput() {
      // 自动将连字符前的编号转大写
      const v = this.artworkForm.title || '';
      const idx = v.indexOf('-');
      if (idx > 0) {
        const left = v.slice(0, idx).toUpperCase();
        const right = v.slice(idx + 1);
        const combined = left + '-' + right;
        if (combined !== v) this.artworkForm.title = combined;
      }
      // 即时判定是否可添加
      const parsed = this._parseArtworkTitle(this.artworkForm.title);
      if (!parsed) { this.artworkTitleStatus=''; return; }
  const codeRe = /^[A-Z0-9]{3,5}$/; // 已大写 3-5 位
      const nameRe = /^[A-Za-z0-9\u4e00-\u9fa5 ]+$/;
      if (!codeRe.test(parsed.code) || !nameRe.test(parsed.name) || parsed.name.includes('-')) { this.artworkTitleStatus=''; return; }
      // duplicate check
      const norm = (x)=>String(x||'').replace(/\s+/g,'').toLowerCase();
      const pCode = norm(parsed.code);
      const pName = norm(parsed.name);
      const dup = (this.artworks||[]).some(a => {
        const aCode = norm(a.code || a.no || '');
        const aName = norm(a.name || a.title || '');
        return aCode===pCode && aName===pName;
      });
      this.artworkTitleStatus = dup ? '' : 'ok';
    },

    // 母bar“新增方案”
    addScheme(art) {
      this.editingArtId = art.id;
      this.schemeEditing = { art, scheme: null };
      this.schemeForm = {
        id: null,
        name: '',
        thumbnailFile: null,
        thumbnailPreview: null,
        mappings: [{ layer: 1, colorCode: '' }]
      };
      this.showSchemeDialog = true;
    },

    // 子bar“修改”
    editScheme(art, scheme) {
      this.editingArtId = art.id;
      this.schemeEditing = { art, scheme };
      const rows = this.normalizedMappings(scheme);
      this.schemeForm = {
        id: scheme.id,
        name: scheme.name || '',
        thumbnailFile: null,
  thumbnailPreview: scheme.thumbnail_path ? this.$helpers.buildUploadURL(this.baseURL, scheme.thumbnail_path) : null,
        mappings: rows.length ? rows : [{ layer: 1, colorCode: '' }]
      };
      this.showSchemeDialog = true;
    },

    showHistory() {
      ElementPlus.ElMessage.info('历史功能暂未实现');
    },

    onOpenDialog() {
      // 创建初始快照
      this._schemeOriginalSnapshot = JSON.stringify(this._normalizedSchemeForm());
      this._bindEsc();
    },
    onCloseDialog() {
      this._schemeOriginalSnapshot = null;
      this._unbindEsc();
    },
    _normalizedSchemeForm() {
      return {
        id: this.schemeForm.id || null,
        name: this.schemeForm.name || '',
        thumbnail: this.schemeForm.thumbnailPreview ? '1' : '',
        mappings: (this.schemeForm.mappings||[]).map(m=>({layer:Number(m.layer)||0, code:String(m.colorCode||'').trim()}))
          .sort((a,b)=>a.layer-b.layer)
      };
    },
    _isSchemeDirty() {
      if (!this._schemeOriginalSnapshot) return false;
      return JSON.stringify(this._normalizedSchemeForm()) !== this._schemeOriginalSnapshot;
    },
    async attemptCloseSchemeDialog() {
      if (this._isSchemeDirty()) {
        try {
          await ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存的修改', {
            confirmButtonText: '丢弃修改',
            cancelButtonText: '继续编辑',
            type: 'warning'
          });
        } catch(e) { return; }
      }
      this.showSchemeDialog = false;
    },
    _bindEsc() {
      if (this._escHandler) return;
      this._escHandler = (e)=>{
        if (e.key === 'Escape') {
          if (this.showSchemeDialog) return this.attemptCloseSchemeDialog();
          if (this.showArtworkDialog) return this.attemptCloseArtworkDialog();
        }
      };
      document.addEventListener('keydown', this._escHandler);
    },
    _parseArtworkTitle(str) {
      const s = String(str||'').trim();
      const idx = s.indexOf('-');
      if (idx<=0 || idx===s.length-1) return null;
      const code = s.slice(0,idx).trim();
      const name = s.slice(idx+1).trim();
      return { code, name };
    },
    validateArtworkTitle(rule, value, callback) {
      const s = String(value||'').trim();
      if (!s) return callback(new Error('请输入“编号-名称”'));
      const parsed = this._parseArtworkTitle(s);
      if (!parsed) return callback(new Error('格式应为：编号-名称'));
  const codeRe = /^[A-Z0-9]{3,5}$/;
  if (!codeRe.test(parsed.code)) return callback(new Error('编号须为3-5位字母或数字'));
      const nameRe = /^[A-Za-z0-9\u4e00-\u9fa5 ]+$/;
      if (!nameRe.test(parsed.name)) return callback(new Error('名称仅允许中英文/数字/空格'));
      if (parsed.name.includes('-')) return callback(new Error('名称不能包含 -'));
      const norm = (x)=>String(x||'').replace(/\s+/g,'').toLowerCase();
      const pCode = norm(parsed.code);
      const pName = norm(parsed.name);
      const dup = (this.artworks||[]).some(a => {
        const aCode = norm(a.code || a.no || '');
        const aName = norm(a.name || a.title || '');
        return aCode===pCode && aName===pName;
      });
      if (dup) return callback(new Error('该作品已存在'));
      callback();
    },
    _unbindEsc() {
      if (this._escHandler) {
        document.removeEventListener('keydown', this._escHandler);
        this._escHandler = null;
      }
    },

    onThumbChange(file) {
      const raw = file.raw || file;
      this.schemeForm.thumbnailFile = raw;
      const reader = new FileReader();
      reader.onload = () => { this.schemeForm.thumbnailPreview = reader.result; };
      reader.readAsDataURL(raw);
    },
    clearThumb() {
      this.schemeForm.thumbnailFile = null;
      this.schemeForm.thumbnailPreview = null;
      // 仅清预览，是否删除服务器旧图由保存时处理
    },

    addRow() {
      const maxLayer = Math.max(0, ...this.schemeForm.mappings.map(x => Number(x.layer) || 0));
      this.schemeForm.mappings.push({ layer: maxLayer + 1, colorCode: '' });
    },
    duplicateRow(idx) {
      const row = this.schemeForm.mappings[idx];
      this.schemeForm.mappings.splice(idx + 1, 0, { layer: row.layer, colorCode: row.colorCode });
    },
    removeRow(idx) {
      this.schemeForm.mappings.splice(idx, 1);
      if (this.schemeForm.mappings.length === 0) {
        this.schemeForm.mappings.push({ layer: 1, colorCode: '' });
      }
    },

    // 序列化层映射，保留重复层，按层排序
    buildLayerPayload() {
      const arr = [];
      (this.schemeForm.mappings || []).forEach(m => {
        const layer = Number(m.layer);
        const code = String(m.colorCode || '').trim();
        if (Number.isFinite(layer) && layer > 0) arr.push({ layer, colorCode: code });
      });
      arr.sort((a, b) => a.layer - b.layer);
      return arr;
    },
    // 重复层的小圆叹号颜色（最多18种）
    dupPalette() {
      return [
        '#E57373', '#64B5F6', '#81C784', '#FFD54F', '#BA68C8', '#4DB6AC', '#FF8A65', '#A1887F',
        '#90A4AE', '#F06292', '#9575CD', '#4FC3F7', '#AED581', '#FFB74D', '#7986CB', '#4DB6F3',
        '#DCE775', '#FFF176'
      ];
    },
    dupBadgeColor(layer) {
      const l = Number(layer);
      const palette = this.dupPalette();
      if (!Number.isFinite(l) || l <= 0) return '#999';
      // 题设中所有画作层数 < 18，直接按层号分配颜色
      return palette[(l - 1) % palette.length];
    },

    async saveScheme() {
      const valid = await this.$refs.schemeFormRef.validate().catch(()=>false);
      if (!valid) return; // 内联错误已显示
      if (this.schemeNameDuplicate) return; // 重复提示已内联
      const artId = this.editingArtId;
      if (!artId) return;

      // 组装 FormData
      const fd = new FormData();
      fd.append('name', this.schemeForm.name.trim());
      fd.append('layers', JSON.stringify(this.buildLayerPayload()));
      if (this.schemeForm.thumbnailFile) {
        fd.append('thumbnail', this.schemeForm.thumbnailFile);
      }
      // 若是编辑且未选择新图但有旧图，由后端决定是否保留
      if (!this.schemeForm.thumbnailFile && this.schemeEditing?.scheme?.thumbnail_path) {
        fd.append('existingThumbnailPath', this.schemeEditing.scheme.thumbnail_path);
      }

      this.saving = true;
      try {
        if (this.schemeForm.id) {
          // 更新方案
          if (window.api?.artworks?.updateScheme) {
            await window.api.artworks.updateScheme(artId, this.schemeForm.id, fd);
          } else {
            await axios.put(`${window.location.origin}/api/artworks/${artId}/schemes/${this.schemeForm.id}`, fd);
          }
          ElementPlus.ElMessage.success('已保存方案修改');
        } else {
          // 新增方案
          if (window.api?.artworks?.addScheme) {
            await window.api.artworks.addScheme(artId, fd);
          } else {
            await axios.post(`${window.location.origin}/api/artworks/${artId}/schemes`, fd);
          }
          ElementPlus.ElMessage.success('已新增配色方案');
        }
        await this.refreshAll();
        this.showSchemeDialog = false;
      } catch (e) {
        console.error(e);
        ElementPlus.ElMessage.error('保存失败');
      } finally {
        this.saving = false;
      }
    }
    , async deleteScheme(art, scheme) {
      const ok = await this.$helpers.doubleDangerConfirm({
        firstMessage: `确定要删除配色方案 “${this.displaySchemeName(art, scheme)}” 吗？`,
        secondMessage: '删除后将无法恢复，确认最终删除？',
        secondConfirmText: '永久删除'
      });
      if (!ok) return;
      try {
  const url = `${window.location.origin}/api/artworks/${art.id}/schemes/${scheme.id}`;
        await axios.delete(url);
        ElementPlus.ElMessage.success('已删除配色方案');
        await this.refreshAll();
      } catch(e) {
        console.error('删除配色方案失败', e);
        const status = e?.response?.status;
        const msg = e?.response?.data?.error || '';
        if (status === 404) {
          ElementPlus.ElMessage.warning(msg || '配色方案不存在或已被删除');
          // 前端刷新一次，清掉缓存中的 phantom 方案
          await this.refreshAll();
        } else if (status === 400) {
          ElementPlus.ElMessage.warning(msg || '无法删除该配色方案');
        } else if (status === 409) {
          ElementPlus.ElMessage.warning(msg || '该配色方案存在引用，无法删除');
        } else {
          ElementPlus.ElMessage.error(msg || '删除失败');
        }
      }
    }
    , async deleteArtwork(art) {
      if ((art.schemes||[]).length > 0) return; // 保险拦截
      const ok = await this.$helpers.doubleDangerConfirm({
        firstMessage: `确定要删除作品 "${this.$helpers.formatArtworkTitle(art)}" 吗？`,
        secondMessage: '删除后将无法恢复，确认最终删除？',
        secondConfirmText: '永久删除'
      });
      if (!ok) return;
      try {
  const url = `${window.location.origin}/api/artworks/${art.id}`;
        await axios.delete(url);
        ElementPlus.ElMessage.success('已删除作品');
        await this.refreshAll();
      } catch(e) {
        console.error('删除作品失败', e);
        const status = e?.response?.status;
        const msg = e?.response?.data?.error || '';
        if (status === 404) {
          ElementPlus.ElMessage.warning(msg || '作品不存在或已被删除');
          await this.refreshAll();
        } else if (status === 400) {
          ElementPlus.ElMessage.warning(msg || '无法删除该作品');
        } else if (status === 409) {
          ElementPlus.ElMessage.warning(msg || '该作品存在引用，无法删除');
        } else {
          ElementPlus.ElMessage.error(msg || '删除失败');
        }
      }
  }
  },
  async mounted() {
    try {
      this.loading = true;
      // 恢复视图模式
      try {
        const vm = localStorage.getItem('sw_artworks_view_mode');
        if (vm === 'byLayer' || vm === 'byColor') {
          this.viewMode = vm;
        }
      } catch(e) {}
      await this.refreshAll();
    } finally {
      this.loading = false;
    }
    // 首次 emit 供父级按钮文本响应式
    this.$emit('view-mode-changed', this.viewMode);
    // 替换新作品校验器（此时 this 已可用）
    if (this.artworkRules && this.artworkRules.title && this.artworkRules.title.length > 1) {
      this.artworkRules.title[1].validator = (r,v,cb)=>this.validateArtworkTitle(r,v,cb);
    }
  }
};