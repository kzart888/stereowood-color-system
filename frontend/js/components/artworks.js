/* 作品配色管理组件
  - 顶部“视图切换”按钮：层号优先 / 自配色优先 两种矩阵视图切换（全局作用）
   - 顶部“+ 新作品”按钮：新增母bar（作品）
   - 母bar：作品标题 + “+ 新增配色方案”
   - 子bar：方案名、缩略图、矩阵视图、修改/历史（历史占位）
   - 编辑对话框：方案名、缩略图上传/替换/删除、层-自配色映射（可增删行），回车=保存
*/
const ArtworksComponent = {
  template: `
    <div class="tab-content">
      <!-- 顶部：左侧新作品，右侧视图切换 -->
      <div class="artwork-header">
        <div>
          <el-button type="primary" size="small" @click="addArtwork">
            <el-icon><Plus /></el-icon> 新作品
          </el-button>
        </div>
        <div>
          <el-button size="small" @click="toggleViewMode">
            <el-icon><Switch /></el-icon>
            {{ viewMode === 'byLayer' ? '层号优先' : '自配色优先' }}
          </el-button>
        </div>
      </div>

      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon> 加载中...
      </div>

      <div v-else>
        <div v-if="artworks.length === 0" class="empty-message">暂无作品，点击右上角“新作品”添加</div>

        <!-- 母bar：作品 -->
        <div v-for="art in artworks" :key="art.id" class="artwork-bar">
          <div class="artwork-header">
            <div class="artwork-title">{{ artworkTitle(art) }}</div>
            <div>
              <el-button size="small" @click="addScheme(art)">
                <el-icon><Plus /></el-icon> 新增配色方案
              </el-button>
            </div>
          </div>

          <!-- 子bar：方案 -->
          <div v-if="(art.schemes && art.schemes.length) > 0">
            <div class="scheme-bar" v-for="scheme in art.schemes" :key="scheme.id">
              <div class="scheme-header">
                <div class="scheme-thumbnail"
                  :style="{
                    backgroundImage: scheme.thumbnail_path ? 'url(' + baseURL + '/' + scheme.thumbnail_path + ')' : 'none',
                    backgroundColor: scheme.thumbnail_path ? 'transparent' : '#f0f0f0'
                  }">
                </div>
                <div style="flex: 1;">
                  <div class="scheme-name">{{ displaySchemeName(art, scheme) }}</div>
                  <div class="meta-text">
                    层数：{{ (scheme.layers || []).length }}
                    <span v-if="scheme.updated_at"> · 更新：{{ formatDate(scheme.updated_at) }}</span>
                  </div>
                </div>
                <div class="color-actions">
                  <el-button size="small" type="primary" @click="editScheme(art, scheme)">
                    <el-icon><Edit /></el-icon> 修改
                  </el-button>
                  <el-button size="small" @click="showHistory(art, scheme)" disabled>
                    <el-icon><Clock /></el-icon> 历史
                  </el-button>
                </div>
              </div>

              <!-- 矩阵视图 -->
              <div v-if="viewMode === 'byLayer'">
                <table class="layer-table">
                  <thead>
                    <tr>
                      <th v-for="m in normalizedMappings(scheme)" :key="'h'+m.layer">
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
                      <td v-for="m in normalizedMappings(scheme)" :key="'c'+m.layer">
                        <strong>{{ m.colorCode || '-' }}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td v-for="m in normalizedMappings(scheme)" :key="'f'+m.layer" class="meta-text" style="text-align:left;">
                        <span v-if="colorByCode(m.colorCode)">
                          {{ colorByCode(m.colorCode).formula || '（无配方）' }}
                        </span>
                        <span v-else>（未匹配到自配色：{{ m.colorCode || '-' }}）</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-else>
        <table class="layer-table">
                  <thead>
                    <tr>
          <th v-for="g in groupedByColorWithFlags(scheme)" :key="'hc'+g.code">{{ g.code || '-' }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
          <td v-for="g in groupedByColorWithFlags(scheme)" :key="'fc'+g.code" class="meta-text" style="text-align:left;">
                        <span v-if="colorByCode(g.code)">{{ colorByCode(g.code).formula || '（无配方）' }}</span>
                        <span v-else>（未匹配到自配色：{{ g.code || '-' }}）</span>
                      </td>
                    </tr>
                    <tr>
          <td v-for="g in groupedByColorWithFlags(scheme)" :key="'lc'+g.code" style="text-align:left;">
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
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-else class="empty-message">暂无配色方案，点击“新增配色方案”添加</div>
        </div>
      </div>

      <!-- 方案编辑/新增对话框 -->
      <el-dialog
        v-model="showSchemeDialog"
        :title="schemeEditing?.id ? '修改配色方案' : '新增配色方案'"
        width="760px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        @open="onOpenDialog"
      >
        <el-form ref="schemeFormRef" :model="schemeForm" label-width="110px" @submit.prevent @keydown.enter.stop.prevent="saveScheme">
          <el-form-item label="方案名称" required>
            <div class="inline-scheme-name">
              <span class="inline-art-title">{{ editingArtTitle }}</span>
              <span> - [</span>
              <el-input v-model.trim="schemeForm.name" placeholder="例如：金黄" style="display:inline-block; width: 240px; vertical-align: middle;" />
              <span>]</span>
            </div>
          </el-form-item>

          <el-form-item label="缩略图">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="scheme-thumbnail"
                :style="{
                  width:'140px', height:'100px',
                  backgroundImage: schemeForm.thumbnailPreview ? 'url(' + schemeForm.thumbnailPreview + ')' : 'none',
                  backgroundColor: schemeForm.thumbnailPreview ? 'transparent' : '#f0f0f0'
                }"></div>
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
              <table class="layer-table">
                <thead>
                  <tr>
                    <th style="width:120px;">层号</th>
                    <th>自配色号</th>
                    <th style="width:110px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(m, idx) in schemeForm.mappings" :key="idx">
                    <td>
                      <span class="layer-cell">
                        <template v-if="formDupCounts[m.layer] > 1">
                          <el-tooltip :content="'检测到第' + m.layer + '层被分配了' + formDupCounts[m.layer] + '次颜色'" placement="top">
                            <span class="dup-badge" :style="{ backgroundColor: dupBadgeColor(m.layer) }">!</span>
                          </el-tooltip>
                        </template>
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
                      <div class="meta-text" v-if="m.colorCode && colorByCode(m.colorCode)" style="margin-top:4px;">
                        {{ colorByCode(m.colorCode).formula || '（无配方）' }}
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
          <el-button @click="showSchemeDialog = false"><el-icon><Close /></el-icon> 取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveScheme"><el-icon><Check /></el-icon> 保存</el-button>
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
      schemeEditing: null,      // {art, scheme} 或 null
      editingArtId: null,
      schemeForm: {
        id: null,
        name: '',
        thumbnailFile: null,
        thumbnailPreview: null,
        mappings: [] // [{ layer: Number, colorCode: String }]
      },
      saving: false
    };
  },
  computed: {
    baseURL() { return this.globalData.baseURL; },
    artworks() { return this.globalData.artworks.value || []; },
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
      const title = this.artworkTitle(art);
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
    formatDate(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      const p = n => (n < 10 ? '0' + n : '' + n);
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    },
    artworkTitle(art) {
      // 兼容 code/name/title 三种字段
      const code = art.code || art.no || '';
      const name = art.name || art.title || '';
      if (code && name) return `${code}-${name}`;
      return code || name || `作品 #${art.id}`;
    },
    toggleViewMode() {
      this.viewMode = this.viewMode === 'byLayer' ? 'byColor' : 'byLayer';
    },
    colorByCode(code) {
      return code ? this.colorMap[code] : null;
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
      m.forEach(x => {
        const key = x.colorCode || '';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(x.layer);
      });
      const arr = Array.from(map.entries()).map(([code, layers]) => ({
        code,
        layers: layers.sort((a, b) => a - b)
      }));
      // 将空 code 放到最后
      arr.sort((a, b) => (a.code ? 0 : 1) - (b.code ? 0 : 1) || a.code.localeCompare(b.code));
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

    // 顶部“新作品”
    async addArtwork() {
      try {
        const { value, action } = await ElementPlus.ElMessageBox.prompt('请输入作品标题（如：078-太极鱼）', '新作品', {
          confirmButtonText: '创建',
          cancelButtonText: '取消',
          inputPlaceholder: '支持“编号-名称”格式',
          inputValidator: v => !!String(v || '').trim() || '标题不能为空'
        });
        if (action !== 'confirm') return;
        const title = String(value).trim();
        // 拆分为 code/name
        let code = '', name = '';
        const idx = title.indexOf('-');
        if (idx > 0) {
          code = title.slice(0, idx).trim();
          name = title.slice(idx + 1).trim();
        } else {
          // 无连字符时，尽量生成 code 与 name
          code = title;
          name = title;
        }
        await axios.post(`${this.baseURL}/api/artworks`, { code, name });
        ElementPlus.ElMessage.success('已创建新作品');
        await this.refreshAll();
      } catch (e) {
        if (e === 'cancel' || e === 'close') return;
        console.error(e);
        ElementPlus.ElMessage.error('创建失败');
      }
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
  thumbnailPreview: scheme.thumbnail_path ? `${this.baseURL}/${scheme.thumbnail_path}` : null,
        mappings: rows.length ? rows : [{ layer: 1, colorCode: '' }]
      };
      this.showSchemeDialog = true;
    },

    showHistory() {
      ElementPlus.ElMessage.info('历史功能暂未实现');
    },

    onOpenDialog() {
      // no-op
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
      if (!String(this.schemeForm.name || '').trim()) {
        return ElementPlus.ElMessage.warning('请填写方案名称');
      }
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
            await axios.put(`${this.baseURL}/api/artworks/${artId}/schemes/${this.schemeForm.id}`, fd);
          }
          ElementPlus.ElMessage.success('已保存方案修改');
        } else {
          // 新增方案
          if (window.api?.artworks?.addScheme) {
            await window.api.artworks.addScheme(artId, fd);
          } else {
            await axios.post(`${this.baseURL}/api/artworks/${artId}/schemes`, fd);
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
  },
  async mounted() {
    try {
      this.loading = true;
      await this.refreshAll();
    } finally {
      this.loading = false;
    }
  }
};