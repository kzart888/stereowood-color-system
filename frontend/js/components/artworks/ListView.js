(function (global) {
  const ListView = {
    name: 'ArtworksListView',
    props: {
      artworks: { type: Array, default: () => [] },
      paginatedArtworks: { type: Array, default: () => [] },
      viewMode: { type: String, default: 'byLayer' },
      baseUrl: { type: String, required: true },
      colorMap: { type: Object, default: () => ({}) },
      formulaUtils: { type: Object, required: true },
      highlightSchemeId: { type: Number, default: null },
      highlightLayers: { type: Array, default: () => [] },
      highlightColorCode: { type: String, default: '' },
      currentPage: { type: Number, default: 1 },
      totalPages: { type: Number, default: 1 },
      startItem: { type: Number, default: 0 },
      endItem: { type: Number, default: 0 },
      visiblePages: { type: Array, default: () => [] },
      itemsPerPage: { type: Number, default: 12 },
      isDevelopmentMode: { type: Boolean, default: false },
      onGoToPage: { type: Function, required: true },
      onItemsPerPageChange: { type: Function, required: true },
      onAddScheme: { type: Function, required: true },
      onEditScheme: { type: Function, required: true },
      onDeleteScheme: { type: Function, required: true },
      onDeleteArtwork: { type: Function, required: true },
      onShowHistory: { type: Function, required: true },
      registerSchemeRef: { type: Function, required: true },
      sizeFilters: { type: Array, default: () => [] },
      selectedSizes: { type: Array, default: () => [] },
      shapeFilters: { type: Array, default: () => [] },
      selectedShapes: { type: Array, default: () => [] }
    },
    computed: {
      itemsPerPageProxy: {
        get() {
          return this.itemsPerPage;
        },
        set(val) {
          if (typeof this.onItemsPerPageChange === 'function') {
            this.onItemsPerPageChange(val);
          }
        }
      }
    },
    methods: {
      schemeRefHandler(scheme) {
        if (typeof this.registerSchemeRef !== 'function') {
          return null;
        }
        return this.registerSchemeRef(scheme);
      },
      colorByCode(code) {
        if (!code) {
          return null;
        }
        return this.colorMap[code] || null;
      },
      displaySchemeName(art, scheme) {
        const title = this.$helpers.formatArtworkTitle(art);
        const schemeName = (scheme && (scheme.name || scheme.scheme_name)) || '-';
        return `${title}-[${schemeName}]`;
      },
      normalizedMappings(scheme) {
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
      groupedByColor(scheme) {
        const mappings = this.normalizedMappings(scheme);
        const map = new Map();
        const emptyLayers = [];
        mappings.forEach((item) => {
          if (!item.colorCode) {
            emptyLayers.push(item.layer);
            return;
          }
          if (!map.has(item.colorCode)) {
            map.set(item.colorCode, []);
          }
          map.get(item.colorCode).push(item.layer);
        });
        const groups = Array.from(map.entries()).map(([code, layers]) => ({
          code,
          layers: layers.sort((a, b) => a - b),
          isEmptyGroup: false
        }));
        if (emptyLayers.length) {
          groups.push({ code: '', layers: emptyLayers.sort((a, b) => a - b), isEmptyGroup: true });
        }
        groups.sort((a, b) => {
          if (a.isEmptyGroup && b.isEmptyGroup) {
            return 0;
          }
          if (a.isEmptyGroup) {
            return 1;
          }
          if (b.isEmptyGroup) {
            return -1;
          }
          return a.code.localeCompare(b.code);
        });
        return groups;
      },
      duplicateLayerSet(scheme) {
        const dupSet = new Set();
        const counts = new Map();
        this.normalizedMappings(scheme).forEach((row) => {
          const layer = Number(row.layer);
          const current = counts.get(layer) || 0;
          const next = current + 1;
          counts.set(layer, next);
          if (next > 1) {
            dupSet.add(layer);
          }
        });
        return dupSet;
      },
      groupedByColorWithFlags(scheme) {
        const groups = this.groupedByColor(scheme);
        const dupSet = this.duplicateLayerSet(scheme);
        return groups.map((group) => ({
          ...group,
          hasDup: (group.layers || []).some((layer) => dupSet.has(layer))
        }));
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
      dupCountFor(scheme, layer) {
        const target = Number(layer);
        if (!Number.isFinite(target)) {
          return 0;
        }
        return this.normalizedMappings(scheme).filter((row) => Number(row.layer) === target).length;
      },
      handleInitialThumbnailClick(event, scheme) {
        if (!scheme || !scheme.initial_thumbnail_path) {
          return;
        }
        const imageUrl = this.$helpers.buildUploadURL(this.baseUrl, scheme.initial_thumbnail_path);
        const newWindow = window.open('', '_blank', 'width=1200,height=900,scrollbars=yes,resizable=yes');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>初始方案 - ${scheme.name || '未命名'}</title>
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
                <img src="${imageUrl}" alt="初始方案" />
              </body>
            </html>
          `);
          newWindow.document.close();
          return;
        }
        if (this.$thumbPreview && typeof this.$thumbPreview.show === 'function') {
          this.$thumbPreview.show(event, imageUrl);
        }
      }
    },
    template: `
      <div>
        <div v-if="artworks.length === 0" class="empty-message">暂无作品，点击右上角"新作品"添加</div>

        <div v-else>
          <div class="category-switch-group filter-row" v-if="artworks.length > 0">
            <button v-for="size in sizeFilters" :key="size"
                    :class="{active: selectedSizes.includes(size)}"
                    :disabled="true"
                    style="cursor: not-allowed; opacity: 0.5;">
              {{ size }}
            </button>
            <div class="filter-separator"></div>
            <button v-for="shape in shapeFilters" :key="shape"
                    :class="{active: selectedShapes.includes(shape)}"
                    :disabled="true"
                    style="cursor: not-allowed; opacity: 0.5;">
              {{ shape }}
            </button>
          </div>

          <div v-for="art in paginatedArtworks" :key="art.id" class="artwork-bar" :data-art-id="art.id" :data-focus-single="art._swFocusSingle ? 'true' : null">
            <div class="artwork-header">
              <div class="artwork-title">{{ $helpers.formatArtworkTitle(art) }}</div>
              <div class="color-actions">
                <el-button size="small" @click="onAddScheme(art)"><el-icon><Plus /></el-icon> 新增配色方案</el-button>
                <template v-if="(art.schemes||[]).length>0">
                  <el-tooltip content="该作品下仍有配色方案，无法删除作品" placement="top">
                    <span>
                      <el-button size="small" type="danger" disabled><el-icon><Delete /></el-icon> 删除</el-button>
                    </span>
                  </el-tooltip>
                </template>
                <el-button v-else size="small" type="danger" @click="onDeleteArtwork(art)"><el-icon><Delete /></el-icon> 删除</el-button>
              </div>
            </div>

            <div v-if="(art.schemes && art.schemes.length) > 0">
              <div class="scheme-bar" v-for="scheme in art.schemes" :key="scheme.id" :ref="schemeRefHandler(scheme)" :class="{ 'highlight-pulse': highlightSchemeId === scheme.id }">
                <div class="scheme-header">
                  <div class="scheme-thumbnail" :class="{ 'no-image': !scheme.thumbnail_path }" @click="scheme.thumbnail_path && $thumbPreview && $thumbPreview.show($event, $helpers.buildUploadURL(baseUrl, scheme.thumbnail_path))">
                    <template v-if="!scheme.thumbnail_path">未上传图片</template>
                    <img v-else :src="$helpers.buildUploadURL(baseUrl, scheme.thumbnail_path)" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                  </div>
                  <div style="flex: 1;">
                    <div class="scheme-name">{{ displaySchemeName(art, scheme) }}</div>
                    <div style="display: flex; align-items: flex-start; gap: 30px; margin-top: 4px;">
                      <div>
                        <div class="meta-text">层数：{{ (scheme.layers || []).length }}</div>
                        <div class="meta-text" v-if="scheme.updated_at">更新：{{ $helpers.formatDate(scheme.updated_at) }}</div>
                      </div>
                      <div style="display: flex; align-items: flex-start; gap: 8px;">
                        <span class="meta-text" style="white-space: nowrap;">原始配色：</span>
                        <span class="initial-thumbnail-inline a4-preview-trigger"
                              :class="{ 'no-image': !scheme.initial_thumbnail_path }"
                              @click="handleInitialThumbnailClick($event, scheme)">
                          <img v-if="scheme.initial_thumbnail_path" :src="$helpers.buildUploadURL(baseUrl, scheme.initial_thumbnail_path)" />
                          <span v-else>无</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="color-actions">
                    <el-button size="small" type="primary" @click="onEditScheme(art, scheme)">
                      <el-icon><Edit /></el-icon> 修改
                    </el-button>
                    <el-button size="small" @click="onShowHistory(art, scheme)" disabled>
                      <el-icon><Clock /></el-icon> 历史
                    </el-button>
                    <el-button size="small" type="danger" @click="onDeleteScheme(art, scheme)">
                      <el-icon><Delete /></el-icon> 删除
                    </el-button>
                  </div>
                </div>

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
                        <td v-for="m in normalizedMappings(scheme)" :key="'c'+m.layer" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightLayers.includes(m.layer) && (!highlightColorCode || m.colorCode===highlightColorCode)}">
                          <div v-if="!m.colorCode" class="empty-cell">
                            <strong>（未指定）</strong>
                          </div>
                          <div v-else class="table-cell-layout">
                            <div class="cell-left">
                              <span v-if="colorByCode(m.colorCode)"
                                   class="color-preview-square"
                                   :class="{ 'no-image': !colorByCode(m.colorCode).image_path }"
                                   :style="colorByCode(m.colorCode).image_path ? { backgroundImage: 'url(' + $helpers.buildUploadURL(baseUrl, colorByCode(m.colorCode).image_path) + ')' } : {}">
                              </span>
                            </div>
                            <div class="cell-center">
                              <strong>{{ m.colorCode }}</strong>
                            </div>
                            <div class="cell-right">
                              <button v-if="colorByCode(m.colorCode) && colorByCode(m.colorCode).formula"
                                      class="table-calc-btn"
                                      @click.stop="$calc && $calc.open(m.colorCode, colorByCode(m.colorCode).formula||'', $event.currentTarget)"
                                      title="快速计算">算</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td v-for="m in normalizedMappings(scheme)" :key="'f'+m.layer" class="meta-text" style="text-align:left;" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightLayers.includes(m.layer) && (!highlightColorCode || m.colorCode===highlightColorCode)}">
                          <template v-if="!m.colorCode">
                            -
                          </template>
                          <template v-else-if="colorByCode(m.colorCode)">
                            <template v-if="formulaUtils.structured(colorByCode(m.colorCode).formula).lines.length">
                              <div class="formula-lines" :style="{ '--max-name-ch': formulaUtils.structured(colorByCode(m.colorCode).formula).maxNameChars }">
                                <div class="fl" v-for="(p,i) in formulaUtils.structured(colorByCode(m.colorCode).formula).lines" :key="'pfl'+i">
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
                        <th v-for="g in groupedByColorWithFlags(scheme)" :key="'hc'+g.code" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightColorCode && g.code===highlightColorCode}">
                          <div v-if="!g.code || g.isEmptyGroup" class="empty-cell">
                            <strong>{{ g.isEmptyGroup ? '(未指定)' : '-' }}</strong>
                          </div>
                          <div v-else class="table-cell-layout">
                            <div class="cell-left">
                              <span v-if="colorByCode(g.code)"
                                   class="color-preview-square"
                                   :class="{ 'no-image': !colorByCode(g.code).image_path }"
                                   :style="colorByCode(g.code).image_path ? { backgroundImage: 'url(' + $helpers.buildUploadURL(baseUrl, colorByCode(g.code).image_path) + ')' } : {}">
                              </span>
                            </div>
                            <div class="cell-center">
                              <strong>{{ g.code }}</strong>
                            </div>
                            <div class="cell-right">
                              <button v-if="colorByCode(g.code) && colorByCode(g.code).formula"
                                      class="table-calc-btn"
                                      @click.stop="$calc && $calc.open(g.code, colorByCode(g.code).formula||'', $event.currentTarget)"
                                      title="快速计算">算</button>
                            </div>
                          </div>
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
                            <template v-if="formulaUtils.structured(colorByCode(g.code).formula).lines.length">
                              <div class="formula-lines" :style="{ '--max-name-ch': formulaUtils.structured(colorByCode(g.code).formula).maxNameChars }">
                                <div class="fl" v-for="(p,i) in formulaUtils.structured(colorByCode(g.code).formula).lines" :key="'bcfl'+g.code+'-'+i">
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

          <div class="pagination-container">
            <div class="pagination-info">
              <span v-if="artworks.length > 0">显示 {{ startItem }}-{{ endItem }} 共 {{ artworks.length }} 项</span>
              <span v-else>暂无作品数据</span>
            </div>

            <div class="pagination-controls">
              <el-button :disabled="currentPage === 1" @click="onGoToPage(1)" icon="el-icon-d-arrow-left">首页</el-button>
              <el-button :disabled="currentPage === 1" @click="onGoToPage(currentPage - 1)" icon="el-icon-arrow-left">上一页</el-button>

              <span class="page-numbers">
                <button v-for="page in visiblePages" :key="page" :class="{ active: page === currentPage, ellipsis: page === '...' }" :disabled="page === '...'" @click="onGoToPage(page)">
                  {{ page }}
                </button>
              </span>

              <el-button :disabled="currentPage === totalPages" @click="onGoToPage(currentPage + 1)" icon="el-icon-arrow-right">下一页</el-button>
              <el-button :disabled="currentPage === totalPages" @click="onGoToPage(totalPages)" icon="el-icon-d-arrow-right">末页</el-button>
            </div>

            <div class="items-per-page">
              <span>每页显示：</span>
              <el-select v-model="itemsPerPageProxy">
                <el-option v-if="isDevelopmentMode" :value="2" label="2 项" />
                <el-option :value="12" label="12 项" />
                <el-option :value="24" label="24 项" />
                <el-option :value="48" label="48 项" />
                <el-option :value="0" label="全部" />
              </el-select>
            </div>
          </div>
        </div>
      </div>
    `
  };

  global.ArtworksListView = ListView;
})(typeof window !== 'undefined' ? window : globalThis);
