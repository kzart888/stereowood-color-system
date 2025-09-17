(function (global) {
  const SchemeEditor = {
    name: 'ArtworksSchemeEditor',
    inject: ['globalData'],
    props: {
      visible: { type: Boolean, default: false },
      context: { type: Object, default: null },
      baseUrl: { type: String, required: true },
      customColors: { type: Array, default: () => [] },
      formulaUtils: { type: Object, required: true }
    },
    emits: ['update:visible', 'saved'],
    data() {
      return {
        form: {
          id: null,
          name: '',
          thumbnailFile: null,
          thumbnailPreview: null,
          initialThumbnailFile: null,
          initialThumbnailPreview: null,
          existingInitialThumbnailPath: null,
          mappings: []
        },
        schemeRules: {
          name: [{ required: true, message: '请输入方案名称', trigger: 'blur' }]
        },
        saving: false,
        _schemeOriginalSnapshot: null,
        _escHandler: null
      };
    },
    computed: {
      dialogVisible: {
        get() {
          return this.visible;
        },
        set(val) {
          this.$emit('update:visible', val);
        }
      },
      isEditMode() {
        return !!(this.context && this.context.scheme && this.context.scheme.id);
      },
      dialogTitle() {
        return this.isEditMode ? '修改配色方案' : '新增配色方案';
      },
      formDupCounts() {
        const counts = {};
        const mappings = Array.isArray(this.form.mappings) ? this.form.mappings : [];
        mappings.forEach((entry) => {
          const layer = Number(entry.layer);
          if (Number.isFinite(layer) && layer > 0) {
            counts[layer] = (counts[layer] || 0) + 1;
          }
        });
        return counts;
      },
      colorMap() {
        const map = {};
        (this.customColors || []).forEach((c) => {
          const code = c.code || c.colorCode || c.color_code;
          if (code) {
            map[code] = c;
          }
        });
        return map;
      },
      editingArtTitle() {
        if (!this.context || !this.context.art) {
          return '';
        }
        return this.$helpers.formatArtworkTitle(this.context.art);
      },
      schemeNameDuplicate() {
        if (!this.context || !this.context.art) {
          return false;
        }
        const name = (this.form.name || '').trim();
        if (!name) {
          return false;
        }
        const currentId = this.form.id;
        const list = Array.isArray(this.context.art.schemes) ? this.context.art.schemes : [];
        return list.some((item) => item && item.name === name && item.id !== currentId);
      }
    },
    watch: {
      context: {
        handler() {
          this.initializeForm();
        },
        immediate: true
      },
      visible(val) {
        if (val) {
          this.bindEsc();
        } else {
          this.unbindEsc();
        }
      }
    },
    methods: {
      initializeForm() {
        const baseForm = {
          id: null,
          name: '',
          thumbnailFile: null,
          thumbnailPreview: null,
          initialThumbnailFile: null,
          initialThumbnailPreview: null,
          existingInitialThumbnailPath: null,
          mappings: [{ layer: 1, colorCode: '' }]
        };
        if (!this.context || !this.context.art) {
          this.form = Object.assign({}, baseForm);
          return;
        }
        if (this.context.scheme) {
          const scheme = this.context.scheme;
          const rows = this.normalizeExistingMappings(scheme);
          this.form = {
            id: scheme.id,
            name: scheme.name || '',
            thumbnailFile: null,
            thumbnailPreview: scheme.thumbnail_path ? this.$helpers.buildUploadURL(this.baseUrl, scheme.thumbnail_path) : null,
            initialThumbnailFile: null,
            initialThumbnailPreview: scheme.initial_thumbnail_path ? this.$helpers.buildUploadURL(this.baseUrl, scheme.initial_thumbnail_path) : null,
            existingInitialThumbnailPath: scheme.initial_thumbnail_path || null,
            mappings: rows.length ? rows : [{ layer: 1, colorCode: '' }]
          };
        } else {
          this.form = Object.assign({}, baseForm);
        }
      },
      normalizeExistingMappings(scheme) {
        if (!scheme) {
          return [];
        }
        let rows = [];
        if (Array.isArray(scheme.layers)) {
          rows = scheme.layers.map((entry) => ({
            layer: Number(entry.layer),
            colorCode: entry.colorCode || entry.code || entry.custom_color_code || ''
          }));
        } else if (scheme.layers && typeof scheme.layers === 'object') {
          rows = Object.keys(scheme.layers).map((key) => ({
            layer: Number(key),
            colorCode: scheme.layers[key]
          }));
        }
        return rows
          .filter((item) => Number.isFinite(item.layer))
          .sort((a, b) => a.layer - b.layer);
      },
      colorByCode(code) {
        if (!code) {
          return null;
        }
        return this.colorMap[code] || null;
      },
      parseFormulaLines(formula) {
        const str = (formula || '').trim();
        if (!str) {
          return [];
        }
        const parts = str.split(/\s+/);
        const lines = [];
        let buffer = null;
        parts.forEach((token) => {
          const match = token.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
          if (match && buffer) {
            lines.push(`${buffer} ${match[1]}${match[2]}`);
            buffer = null;
          } else {
            if (buffer) {
              lines.push(buffer);
            }
            buffer = token;
          }
        });
        if (buffer) {
          lines.push(buffer);
        }
        return lines;
      },
      dupPalette() {
        return [
          '#E57373', '#64B5F6', '#81C784', '#FFD54F', '#BA68C8', '#4DB6AC', '#FF8A65', '#A1887F',
          '#90A4AE', '#F06292', '#9575CD', '#4FC3F7', '#AED581', '#FFB74D', '#7986CB', '#4DB6F3',
          '#DCE775', '#FFF176'
        ];
      },
      dupBadgeColor(layer) {
        const l = Number(layer);
        if (!Number.isFinite(l) || l <= 0) {
          return '#999';
        }
        const palette = this.dupPalette();
        return palette[(l - 1) % palette.length];
      },
      addRow() {
        const mappings = Array.isArray(this.form.mappings) ? this.form.mappings : [];
        const maxLayer = Math.max(0, ...mappings.map((entry) => Number(entry.layer) || 0));
        mappings.push({ layer: maxLayer + 1, colorCode: '' });
      },
      duplicateRow(index) {
        const mappings = Array.isArray(this.form.mappings) ? this.form.mappings : [];
        const row = mappings[index];
        if (!row) {
          return;
        }
        mappings.splice(index + 1, 0, { layer: row.layer, colorCode: row.colorCode });
      },
      removeRow(index) {
        const mappings = Array.isArray(this.form.mappings) ? this.form.mappings : [];
        mappings.splice(index, 1);
        if (mappings.length === 0) {
          mappings.push({ layer: 1, colorCode: '' });
        }
      },
      onThumbChange(file) {
        const raw = file.raw || file;
        this.form.thumbnailFile = raw;
        const reader = new FileReader();
        reader.onload = () => {
          this.form.thumbnailPreview = reader.result;
        };
        reader.readAsDataURL(raw);
      },
      clearThumb() {
        this.form.thumbnailFile = null;
        this.form.thumbnailPreview = null;
      },
      onInitialThumbChange(file) {
        const raw = file && file.raw ? file.raw : null;
        if (!raw) {
          return;
        }
        this.form.initialThumbnailFile = raw;
        const reader = new FileReader();
        reader.onload = () => {
          this.form.initialThumbnailPreview = reader.result;
        };
        reader.readAsDataURL(raw);
      },
      clearInitialThumb() {
        this.form.initialThumbnailFile = null;
        this.form.initialThumbnailPreview = null;
      },
      handleInitialPreviewClick(event) {
        const imageUrl = this.form.initialThumbnailPreview;
        if (!imageUrl) {
          return;
        }
        const newWindow = window.open('', '_blank', 'width=1200,height=900,scrollbars=yes,resizable=yes');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>初始方案预览</title>
                <style>
                  body { margin: 0; padding: 20px; background: #333; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                  img { max-width: 100%; height: auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
                  .controls { position: fixed; top: 10px; right: 10px; z-index: 10; }
                  .controls button { padding: 10px 20px; margin: 0 5px; background: rgba(255,255,255,0.9); border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
                  .controls button:hover { background: white; }
                </style>
              </head>
              <body>
                <div class="controls">
                  <button onclick="window.print()">打印</button>
                  <button onclick="window.close()">关闭</button>
                </div>
                <img src="${imageUrl}" alt="初始方案预览" />
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      },
      buildLayerPayload() {
        const result = [];
        (this.form.mappings || []).forEach((mapping) => {
          const layer = Number(mapping.layer);
          const code = String(mapping.colorCode || '').trim();
          if (Number.isFinite(layer) && layer > 0) {
            result.push({ layer, colorCode: code });
          }
        });
        result.sort((a, b) => a.layer - b.layer);
        return result;
      },
      normalizedSnapshot() {
        return {
          id: this.form.id || null,
          name: this.form.name || '',
          thumbnail: this.form.thumbnailPreview ? '1' : '',
          mappings: (this.form.mappings || []).map((m) => ({
            layer: Number(m.layer) || 0,
            code: String(m.colorCode || '').trim()
          })).sort((a, b) => a.layer - b.layer)
        };
      },
      isDirty() {
        if (!this._schemeOriginalSnapshot) {
          return false;
        }
        return JSON.stringify(this.normalizedSnapshot()) !== this._schemeOriginalSnapshot;
      },
      async attemptClose() {
        if (this.isDirty()) {
          try {
            await ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存的修改', {
              confirmButtonText: '丢弃修改',
              cancelButtonText: '继续编辑',
              type: 'warning'
            });
          } catch (error) {
            return;
          }
        }
        this.dialogVisible = false;
      },
      bindEsc() {
        if (this._escHandler) {
          return;
        }
        this._escHandler = (event) => {
          if (event.key === 'Escape' && this.dialogVisible) {
            this.attemptClose();
          }
        };
        document.addEventListener('keydown', this._escHandler);
      },
      unbindEsc() {
        if (this._escHandler) {
          document.removeEventListener('keydown', this._escHandler);
          this._escHandler = null;
        }
      },
      handleOpen() {
        this._schemeOriginalSnapshot = JSON.stringify(this.normalizedSnapshot());
      },
      handleClose() {
        this._schemeOriginalSnapshot = null;
        this.unbindEsc();
      },
      async saveScheme() {
        const valid = await this.$refs.schemeFormRef.validate().catch(() => false);
        if (!valid) {
          return;
        }
        if (this.schemeNameDuplicate) {
          return;
        }
        const art = this.context && this.context.art;
        if (!art || !art.id) {
          return;
        }
        const formData = new FormData();
        formData.append('name', (this.form.name || '').trim());
        formData.append('layers', JSON.stringify(this.buildLayerPayload()));
        if (this.form.thumbnailFile) {
          formData.append('thumbnail', this.form.thumbnailFile);
        } else if (this.context.scheme && this.context.scheme.thumbnail_path) {
          formData.append('existingThumbnailPath', this.context.scheme.thumbnail_path);
        }
        if (this.form.initialThumbnailFile) {
          formData.append('initialThumbnail', this.form.initialThumbnailFile);
        } else if (this.form.existingInitialThumbnailPath) {
          formData.append('existingInitialThumbnailPath', this.form.existingInitialThumbnailPath);
        }
        this.saving = true;
        try {
          if (this.form.id) {
            if (global.api && global.api.artworks && typeof global.api.artworks.updateScheme === 'function') {
              await global.api.artworks.updateScheme(art.id, this.form.id, formData);
            } else {
              await axios.put(`${window.location.origin}/api/artworks/${art.id}/schemes/${this.form.id}`, formData);
            }
            msg.success('已保存方案修改');
          } else {
            if (global.api && global.api.artworks && typeof global.api.artworks.addScheme === 'function') {
              await global.api.artworks.addScheme(art.id, formData);
            } else {
              await axios.post(`${window.location.origin}/api/artworks/${art.id}/schemes`, formData);
            }
            msg.success('已新增配色方案');
          }
          this.$emit('saved');
          this.dialogVisible = false;
        } catch (error) {
          (global.logger || console).error && (global.logger || console).error('保存配色方案失败', error);
          msg.error('保存失败');
        } finally {
          this.saving = false;
        }
      }
    },
    template: `
      <el-dialog
        class="scheme-dialog"
        v-model="dialogVisible"
        :title="dialogTitle"
        width="760px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        @open="handleOpen"
        @close="handleClose"
      >
        <el-form ref="schemeFormRef" :model="form" :rules="schemeRules" label-width="80px" @submit.prevent @keydown.enter.stop.prevent="saveScheme">
          <el-form-item label="方案名称" prop="name" required>
            <div class="inline-scheme-name dup-inline-row">
              <span class="inline-art-title">{{ editingArtTitle }}</span>
              <span class="scheme-sep"> - [ </span>
              <el-input v-model.trim="form.name" placeholder="例如：金黄" class="scheme-name-input" :maxlength="10" />
              <span class="scheme-bracket-end"> ]</span>
              <span v-if="schemeNameDuplicate" class="dup-msg">名称重复</span>
            </div>
          </el-form-item>

          <el-form-item label="缩略图">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="scheme-thumbnail"
                :style="{
                  backgroundImage: form.thumbnailPreview ? 'url(' + form.thumbnailPreview + ')' : 'none',
                  backgroundColor: form.thumbnailPreview ? 'transparent' : '#f0f0f0'
                }"
                :class="{ 'no-image': !form.thumbnailPreview }"
                style="width: 80px; height: 80px; flex-shrink: 0;"
                @click="form.thumbnailPreview && $thumbPreview && $thumbPreview.show($event, form.thumbnailPreview)"
              >
                <template v-if="!form.thumbnailPreview">未上传图片</template>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                <el-upload :auto-upload="false" :show-file-list="false" :on-change="onThumbChange" accept="image/*">
                  <el-button size="small" type="primary">
                    <el-icon><Upload /></el-icon>
                    选择图片
                  </el-button>
                </el-upload>

                <el-button v-if="form.thumbnailPreview" size="small" type="danger" @click="clearThumb">
                  <el-icon><Delete /></el-icon>
                  清除图片
                </el-button>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="初始方案">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="scheme-thumbnail"
                :style="{
                  backgroundImage: form.initialThumbnailPreview ? 'url(' + form.initialThumbnailPreview + ')' : 'none',
                  backgroundColor: form.initialThumbnailPreview ? 'transparent' : '#f0f0f0'
                }"
                :class="{ 'no-image': !form.initialThumbnailPreview }"
                style="width: 80px; height: 80px; flex-shrink: 0;"
                @click="form.initialThumbnailPreview && handleInitialPreviewClick($event)"
              >
                <template v-if="!form.initialThumbnailPreview">未上传图片</template>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                <el-upload :auto-upload="false" :show-file-list="false" :on-change="onInitialThumbChange" accept="image/*">
                  <el-button size="small" type="primary">
                    <el-icon><Upload /></el-icon>
                    选择图片
                  </el-button>
                </el-upload>

                <el-button v-if="form.initialThumbnailPreview" size="small" type="danger" @click="clearInitialThumb">
                  <el-icon><Delete /></el-icon>
                  清除图片
                </el-button>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="层-自配色">
            <div style="width:100%;">
              <table class="layer-table mapping-table">
                <thead>
                  <tr>
                    <th style="width:60px;">层号</th>
                    <th style="min-width:300px;">自配色号</th>
                    <th style="width:120px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(m, idx) in form.mappings" :key="idx">
                    <td>
                      <div class="layer-cell">
                        <template v-if="formDupCounts[m.layer] > 1">
                          <el-tooltip :content="'检测到第' + m.layer + '层被分配了' + formDupCounts[m.layer] + '次颜色'" placement="top">
                            <span class="dup-badge" :style="{ backgroundColor: dupBadgeColor(m.layer) }">!</span>
                          </el-tooltip>
                        </template>
                        <el-input-number v-model="m.layer" :min="1" :max="200" controls-position="right" size="small" />
                      </div>
                    </td>
                    <td>
                      <div class="color-code-cell">
                        <div class="custom-select-wrapper">
                          <div v-if="m.colorCode && colorByCode(m.colorCode)" class="selected-color-display">
                            <div class="color-preview-square"
                                 :class="{ 'no-image': !colorByCode(m.colorCode).image_path }"
                                 :style="colorByCode(m.colorCode).image_path ? { backgroundImage: 'url(' + $helpers.buildUploadURL(baseUrl, colorByCode(m.colorCode).image_path) + ')' } : {}">
                            </div>
                          </div>
                          <el-select v-model="m.colorCode" filterable clearable placeholder="选择自配色号" style="width: 100%;">
                            <el-option v-for="c in customColors" :key="c.id" :label="c.color_code || c.colorCode || c.code" :value="c.color_code || c.colorCode || c.code">
                              <div class="color-option-content">
                                <div class="color-preview-square"
                                     :class="{ 'no-image': !c.image_path }"
                                     :style="c.image_path ? { backgroundImage: 'url(' + $helpers.buildUploadURL(baseUrl, c.image_path) + ')' } : {}">
                                </div>
                                <span class="color-code-text">{{ c.color_code || c.colorCode || c.code }}</span>
                              </div>
                            </el-option>
                          </el-select>
                        </div>

                        <div v-if="m.colorCode && colorByCode(m.colorCode)" class="mapping-formula-display">
                          <template v-if="parseFormulaLines(colorByCode(m.colorCode).formula).length">
                            <div class="mapping-formula-chips" style="display:inline-flex; flex-wrap:wrap; gap:4px;">
                              <el-tooltip v-for="(line,i) in parseFormulaLines(colorByCode(m.colorCode).formula)" :key="'mf'+idx+'-'+i" :content="line" placement="top">
                                <span class="mf-chip" style="display:inline-block; padding:2px 6px; background:#f0f0f0; border-radius:3px; font-size:11px;">{{ line }}</span>
                              </el-tooltip>
                            </div>
                          </template>
                          <span v-else class="meta-text">（无配方）</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="operation-buttons">
                        <el-button size="small" type="primary" @click="duplicateRow(idx)" circle style="width: 22px; height: 22px; padding: 0;" title="复制行">
                          <el-icon><Plus /></el-icon>
                        </el-button>
                        <el-button size="small" @click="addRow" circle style="width: 22px; height: 22px; padding: 0;" title="新增行">
                          <el-icon><Plus /></el-icon>
                        </el-button>
                        <el-button size="small" type="danger" @click="removeRow(idx)" circle style="width: 22px; height: 22px; padding: 0;" title="删除行">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="attemptClose"><el-icon><Close /></el-icon> 取消</el-button>
          <el-button type="primary" :disabled="schemeNameDuplicate || saving" @click="saveScheme">
            <el-icon><Check /></el-icon> 保存
          </el-button>
        </template>
      </el-dialog>
    `
  };

  global.ArtworksSchemeEditor = SchemeEditor;
})(typeof window !== 'undefined' ? window : globalThis);
