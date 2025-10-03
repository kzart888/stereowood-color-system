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
    <div class="artworks-page">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon> 加载中...
      </div>

      <div v-else>
        <div v-if="artworks.length === 0" class="empty-message">暂无作品，点击右上角"新作品"添加</div>

        <!-- Filter Row -->
        <!-- 注释：分类过滤功能暂未开发 -->
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

        <!-- 母bar：作品 -->
  <div v-for="art in paginatedArtworks" :key="art.id" class="artwork-bar" :data-art-id="art.id" :data-focus-single="art._swFocusSingle ? 'true' : null">
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
            <div class="scheme-bar" v-for="scheme in art.schemes" :key="scheme.id" :ref="setSchemeRef(scheme)" :class="{ 'highlight-pulse': highlightSchemeId === scheme.id }">
              <div class="scheme-header">
                <div class="scheme-thumbnail" :class="{ 'no-image': !scheme.thumbnail_path }" @click="scheme.thumbnail_path && $thumbPreview && $thumbPreview.show($event, $helpers.buildUploadURL(baseURL, scheme.thumbnail_path))">
                  <template v-if="!scheme.thumbnail_path">未上传图片</template>
                  <img v-else :src="$helpers.buildUploadURL(baseURL, scheme.thumbnail_path)" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                </div>
                <div style="flex: 1;">
                  <div class="scheme-name">{{ displaySchemeName(art, scheme) }}</div>
                  <div style="display: flex; align-items: flex-start; gap: 30px; margin-top: 4px;">
                    <!-- 左列：层数和更新时间 -->
                    <div>
                      <div class="meta-text">层数：{{ (scheme.layers || []).length }}</div>
                      <div class="meta-text" v-if="scheme.updated_at">更新：{{ $helpers.formatDate(scheme.updated_at) }}</div>
                    </div>
                    <!-- 右列：初始方案缩略图 -->
                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                      <span class="meta-text" style="white-space: nowrap;">原始配色：</span>
                      <span class="initial-thumbnail-inline a4-preview-trigger" 
                            :class="{ 'no-image': !scheme.initial_thumbnail_path }"
                            @click="handleInitialThumbnailClick($event, scheme)">
                        <img v-if="scheme.initial_thumbnail_path" :src="$helpers.buildUploadURL(baseURL, scheme.initial_thumbnail_path)" />
                        <span v-else>无</span>
                      </span>
                    </div>
                  </div>
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
                      <td v-for="m in normalizedMappings(scheme)" :key="'c'+m.layer" :class="{'highlight-pulse': highlightSchemeId===scheme.id && highlightLayers.includes(m.layer) && (!highlightColorCode || m.colorCode===highlightColorCode)}">
                        <div v-if="!m.colorCode" class="empty-cell">
                          <strong>（未指定）</strong>
                        </div>
                        <div v-else class="table-cell-layout">
                          <div class="cell-left">
                            <span v-if="colorByCode(m.colorCode)" 
                                 class="color-preview-square" 
                                 :class="swatchClassByCode(m.colorCode)"
                                 :style="swatchStyleByCode(m.colorCode)">
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
                     :class="swatchClassByCode(g.code)"
                     :style="swatchStyleByCode(g.code)">
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
        
        <!-- Pagination Controls (Always show for consistency) -->
        <div class="pagination-container">
          <div class="pagination-info">
            <span v-if="artworks.length > 0">显示 {{ startItem }}-{{ endItem }} 共 {{ artworks.length }} 项</span>
            <span v-else>暂无作品数据</span>
          </div>
          
          <div class="pagination-controls">
            <el-button 
              :disabled="currentPage === 1"
              @click="goToPage(1)"
              icon="el-icon-d-arrow-left">
              首页
            </el-button>
            
            <el-button 
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
              icon="el-icon-arrow-left">
              上一页
            </el-button>
            
            <span class="page-numbers">
              <button 
                v-for="page in visiblePages"
                :key="page"
                :class="{ active: page === currentPage, ellipsis: page === '...' }"
                :disabled="page === '...'"
                @click="goToPage(page)">
                {{ page }}
              </button>
            </span>
            
            <el-button 
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
              icon="el-icon-arrow-right">
              下一页
            </el-button>
            
            <el-button 
              :disabled="currentPage === totalPages"
              @click="goToPage(totalPages)"
              icon="el-icon-d-arrow-right">
              末页
            </el-button>
          </div>
          
          <div class="items-per-page">
            <span>每页显示：</span>
            <el-select v-model="itemsPerPage" @change="onItemsPerPageChange">
              <el-option v-if="isDevelopmentMode" :value="2" label="2 项" />
              <el-option :value="12" label="12 项" />
              <el-option :value="24" label="24 项" />
              <el-option :value="48" label="48 项" />
              <el-option :value="0" label="全部" />
            </el-select>
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
              <span class="scheme-sep"> - [ </span>
              <el-input v-model.trim="schemeForm.name" placeholder="例如：金黄" class="scheme-name-input" :maxlength="10" />
              <span class="scheme-bracket-end"> ]</span>
              <span v-if="schemeNameDuplicate" class="dup-msg">名称重复</span> <!-- 统一查重：仅内联显示，不再弹出 Toast -->
            </div>
          </el-form-item>

          <el-form-item label="缩略图">
            <div style="display: flex; align-items: center; gap: 12px;">
              <!-- 缩略图预览区域 -->
              <div class="scheme-thumbnail"
                :style="{
                  backgroundImage: schemeForm.thumbnailPreview ? 'url(' + schemeForm.thumbnailPreview + ')' : 'none',
                  backgroundColor: schemeForm.thumbnailPreview ? 'transparent' : '#f0f0f0'
                }"
                :class="{ 'no-image': !schemeForm.thumbnailPreview }"
                style="width: 80px; height: 80px; flex-shrink: 0;"
                @click="schemeForm.thumbnailPreview && $thumbPreview && $thumbPreview.show($event, schemeForm.thumbnailPreview)"
              >
                <template v-if="!schemeForm.thumbnailPreview">未上传图片</template>
              </div>
              
              <!-- 操作按钮区域 -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <el-upload
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="onThumbChange"
                  accept="image/*"
                >
                  <el-button size="small" type="primary">
                    <el-icon><Upload /></el-icon>
                    选择图片
                  </el-button>
                </el-upload>
                
                <el-button 
                  v-if="schemeForm.thumbnailPreview" 
                  size="small" 
                  type="danger" 
                  @click="clearThumb"
                >
                  <el-icon><Delete /></el-icon>
                  清除图片
                </el-button>
              </div>
            </div>
          </el-form-item>

          <!-- 初始方案缩略图上传 -->
          <el-form-item label="初始方案">
            <div style="display: flex; align-items: center; gap: 12px;">
              <!-- 初始方案缩略图预览区域 -->
              <div class="scheme-thumbnail"
                :style="{
                  backgroundImage: schemeForm.initialThumbnailPreview ? 'url(' + schemeForm.initialThumbnailPreview + ')' : 'none',
                  backgroundColor: schemeForm.initialThumbnailPreview ? 'transparent' : '#f0f0f0'
                }"
                :class="{ 'no-image': !schemeForm.initialThumbnailPreview }"
                style="width: 80px; height: 80px; flex-shrink: 0;"
                @click="schemeForm.initialThumbnailPreview && handleInitialPreviewClick($event)"
              >
                <template v-if="!schemeForm.initialThumbnailPreview">未上传图片</template>
              </div>
              
              <!-- 操作按钮区域 -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <el-upload
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="onInitialThumbChange"
                  accept="image/*"
                >
                  <el-button size="small" type="primary">
                    <el-icon><Upload /></el-icon>
                    选择图片
                  </el-button>
                </el-upload>
                
                <el-button 
                  v-if="schemeForm.initialThumbnailPreview" 
                  size="small" 
                  type="danger" 
                  @click="clearInitialThumb"
                >
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
                  <tr v-for="(m, idx) in schemeForm.mappings" :key="idx">
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
                                 :class="swatchClassByCode(m.colorCode)"
                                 :style="swatchStyleByCode(m.colorCode)">
                            </div>
                          </div>
                          <el-select 
                            v-model="m.colorCode" 
                            filterable 
                            clearable 
                            placeholder="选择自配色号"
                            style="width: 100%;"
                          >
                            <el-option
                              v-for="c in customColors"
                              :key="c.id"
                              :label="c.color_code"
                              :value="c.color_code"
                            >
                              <div class="color-option-content">
                                <div class="color-preview-square" 
                                     :class="swatchClassForColor(c)"
                                     :style="swatchStyleForColor(c)">
                                </div>
                                <span class="color-code-text">{{ c.color_code }}</span>
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
                        <el-button 
                          size="small" 
                          type="primary" 
                          @click="duplicateRow(idx)" 
                          circle 
                          style="width: 22px; height: 22px; padding: 0;"
                          title="复制行"
                        >
                          <el-icon><Plus /></el-icon>
                        </el-button>
                        <el-button 
                          size="small" 
                          type="danger" 
                          @click="removeRow(idx)" 
                          circle 
                          style="width: 22px; height: 22px; padding: 0;"
                          title="删除行"
                        >
                          <el-icon><Minus /></el-icon>
                        </el-button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="add-button-container" style="margin-top: 6px;">
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="addRow" 
                  circle 
                  style="width: 22px; height: 22px; padding: 0;"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
                <span class="add-hint" style="margin-left: 6px;">按层号顺序填写；保存时会按层号排序；允许相同层号，即同层多色，但会触发提醒图标</span>
              </div>
            </div>
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="attemptCloseSchemeDialog"><el-icon><Close /></el-icon> 取消</el-button>
          <el-button type="primary" :disabled="schemeNameDuplicate || saving" @click="saveScheme">
            <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
            <el-icon v-else><Check /></el-icon>
            {{ saving ? '保存中...' : '保存' }}
          </el-button>
        </template>
      </el-dialog>
    </div>
  `,
  inject: ['globalData'],
  data() {
    // Initial items per page - will be updated from app config in mounted
    
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
  , artworkForm: { title: '' },
      
      // Pagination
      currentPage: 1,
      itemsPerPage: 12  // Default, will be updated from app config
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
  , // Filter options
    sizeFilters: ['巨尺寸', '大尺寸', '中尺寸', '小尺寸'],
    selectedSizes: [],
    shapeFilters: ['正方形', '长方形', '圆形', '不规则形'],
    selectedShapes: [],
    showHelp: false
    };
  },
  computed: {
  // Expose formulaUtils to template
  formulaUtils() { return window.formulaUtils; },

  isDevelopmentMode() {
    return this.globalData &&
           this.globalData.appConfig &&
           this.globalData.appConfig.value &&
           this.globalData.appConfig.value.mode === 'test';
  },
  baseURL() { return window.location.origin; },
    // 回退：直接使用注入的 artworks 原始数组并按 sortMode 排序（暂不做搜索过滤）
    artworks() {
      let raw = (this.globalData.artworks?.value || []).slice();
      
      // Apply filters
      if (this.selectedSizes.length > 0 || this.selectedShapes.length > 0) {
        raw = raw.filter(art => {
          // Extract size and shape from title
          const title = art.title || '';
          let matchesSize = this.selectedSizes.length === 0;
          let matchesShape = this.selectedShapes.length === 0;
          
          // Check size filter
          if (this.selectedSizes.length > 0) {
            matchesSize = this.selectedSizes.some(size => title.includes(size));
          }
          
          // Check shape filter  
          if (this.selectedShapes.length > 0) {
            matchesShape = this.selectedShapes.some(shape => title.includes(shape));
          }
          
          return matchesSize && matchesShape;
        });
      }
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
    },
    
    // Pagination computed properties
    totalPages() {
      // If showing all items, only 1 page
      if (this.itemsPerPage === 0) return 1;
      return Math.ceil(this.artworks.length / this.itemsPerPage);
    },
    
    paginatedArtworks() {
      // If itemsPerPage is 0, show all items
      if (this.itemsPerPage === 0) {
        return this.artworks;
      }
      
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.artworks.slice(start, end);
    },
    
    startItem() {
      if (this.artworks.length === 0) return 0;
      if (this.itemsPerPage === 0) return 1;  // Show all
      return (this.currentPage - 1) * this.itemsPerPage + 1;
    },
    
    endItem() {
      if (this.itemsPerPage === 0) return this.artworks.length;  // Show all
      return Math.min(
        this.currentPage * this.itemsPerPage,
        this.artworks.length
      );
    },
    
    visiblePages() {
      const pages = [];
      const maxVisible = 7;  // Show max 7 page numbers
      
      if (this.totalPages <= maxVisible) {
        // Show all pages
        for (let i = 1; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Smart pagination with ellipsis
        if (this.currentPage <= 4) {
          // Near beginning
          for (let i = 1; i <= 5; i++) pages.push(i);
          pages.push('...');
          pages.push(this.totalPages);
        } else if (this.currentPage >= this.totalPages - 3) {
          // Near end
          pages.push(1);
          pages.push('...');
          for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
            pages.push(i);
          }
        } else {
          // Middle
          pages.push(1);
          pages.push('...');
          for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(this.totalPages);
        }
      }
      
      return pages;
    }
  },
  methods: {
    toggleSizeFilter(size) {
      const idx = this.selectedSizes.indexOf(size);
      if (idx === -1) {
        this.selectedSizes.push(size);
      } else {
        this.selectedSizes.splice(idx, 1);
      }
      this.currentPage = 1; // Reset to first page
    },
    toggleShapeFilter(shape) {
      const idx = this.selectedShapes.indexOf(shape);
      if (idx === -1) {
        this.selectedShapes.push(shape);
      } else {
        this.selectedShapes.splice(idx, 1);
      }
      this.currentPage = 1; // Reset to first page
    },
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
    resolveSwatchForColor(color, options = {}) {
      if (!color || !window.CustomColorSwatch || typeof window.CustomColorSwatch.resolveSwatch !== 'function') {
        return null;
      }
      const baseURL = options.baseURL || this.baseURL || window.location.origin;
      const buildURL = this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
        ? this.$helpers.buildUploadURL
        : ((base, path) => `${base.replace(/\/$/, '')}/uploads/${path}`);
      return window.CustomColorSwatch.resolveSwatch(color, {
        baseURL,
        buildURL,
        includeColorConcentrate: !!options.includeColorConcentrate,
        forceOriginal: !!options.forceOriginal
      });
    },
    resolveSwatchByCode(code, options = {}) {
      const color = this.colorByCode(code);
      return color ? this.resolveSwatchForColor(color, options) : null;
    },
    computeSwatchStyle(swatch) {
      if (!swatch) return {};
      if (swatch.type === 'image' && swatch.imageUrl) {
        return {
          backgroundImage: `url(${swatch.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      }
      if (swatch.type === 'pure' || swatch.type === 'color') {
        return swatch.style || {};
      }
      return {};
    },
    swatchStyleByCode(code) {
      return this.computeSwatchStyle(this.resolveSwatchByCode(code));
    },
    swatchClassByCode(code) {
      const swatch = this.resolveSwatchByCode(code);
      return {
        'no-image': !swatch || swatch.type === 'empty',
        'image-swatch': !!(swatch && swatch.type === 'image' && swatch.imageUrl)
      };
    },
    swatchStyleForColor(color) {
      return this.computeSwatchStyle(this.resolveSwatchForColor(color));
    },
    swatchClassForColor(color) {
      const swatch = this.resolveSwatchForColor(color);
      return {
        'no-image': !swatch || swatch.type === 'empty',
        'image-swatch': !!(swatch && swatch.type === 'image' && swatch.imageUrl)
      };
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
    // Formula structure method removed - using shared formulaUtils.structured instead
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
      
      // Find the artwork that contains this scheme
      const artworkIndex = this.artworks.findIndex(a => a.id === artworkId);
      if (artworkIndex === -1) return;
      
      // Calculate which page the artwork is on
      const targetPage = this.itemsPerPage === 0 ? 1 : Math.floor(artworkIndex / this.itemsPerPage) + 1;
      
      // Navigate to the correct page if needed
      if (targetPage !== this.currentPage) {
        this.currentPage = targetPage;
      }
      
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
      // 滚动定位 - wait for page change to render
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
        msg.success('已创建新作品');
        await this.refreshAll();
        this.showArtworkDialog = false;
      } catch(e) {
        console.error(e);
        msg.error('创建失败');
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
        initialThumbnailFile: null,
        initialThumbnailPreview: null,
        existingInitialThumbnailPath: null,
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
        initialThumbnailFile: null,
        initialThumbnailPreview: scheme.initial_thumbnail_path ? this.$helpers.buildUploadURL(this.baseURL, scheme.initial_thumbnail_path) : null,
        existingInitialThumbnailPath: scheme.initial_thumbnail_path,
        mappings: rows.length ? rows : [{ layer: 1, colorCode: '' }]
      };
      this.showSchemeDialog = true;
    },

    showHistory() {
      msg.info('历史功能暂未实现');
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
    
    // Handle initial thumbnail upload
    onInitialThumbChange(f) {
      if (!f || !f.raw) return;
      this.schemeForm.initialThumbnailFile = f.raw;
      const raw = f.raw;
      const reader = new FileReader();
      reader.onload = () => { this.schemeForm.initialThumbnailPreview = reader.result; };
      reader.readAsDataURL(raw);
    },
    
    clearInitialThumb() {
      this.schemeForm.initialThumbnailFile = null;
      this.schemeForm.initialThumbnailPreview = null;
      // 仅清预览，是否删除服务器旧图由保存时处理
    },
    
    // Handle initial preview click in edit dialog
    handleInitialPreviewClick(event) {
      const imageUrl = this.schemeForm.initialThumbnailPreview;
      if (!imageUrl) return;
      
      // Open in new window for better A4 document viewing
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
    
    // Handle initial thumbnail click for enhanced preview
    handleInitialThumbnailClick(event, scheme) {
      if (!scheme.initial_thumbnail_path) return;
      
      const imageUrl = this.$helpers.buildUploadURL(this.baseURL, scheme.initial_thumbnail_path);
      // Open in new window for better A4 document viewing
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
      } else {
        // Fallback to regular thumbnail preview if popup blocked
        this.$thumbPreview && this.$thumbPreview.show(event, imageUrl);
      }
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
      
      // Handle initial thumbnail
      if (this.schemeForm.initialThumbnailFile) {
        fd.append('initialThumbnail', this.schemeForm.initialThumbnailFile);
      }
      // 若是编辑且未选择新初始图但有旧初始图，由后端决定是否保留
      if (!this.schemeForm.initialThumbnailFile && this.schemeForm.existingInitialThumbnailPath) {
        fd.append('existingInitialThumbnailPath', this.schemeForm.existingInitialThumbnailPath);
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
          msg.success('已保存方案修改');
        } else {
          // 新增方案
          if (window.api?.artworks?.addScheme) {
            await window.api.artworks.addScheme(artId, fd);
          } else {
            await axios.post(`${window.location.origin}/api/artworks/${artId}/schemes`, fd);
          }
          msg.success('已新增配色方案');
        }
        await this.refreshAll();
        this.showSchemeDialog = false;
      } catch (e) {
        console.error(e);
        msg.error('保存失败');
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
        msg.success('已删除配色方案');
        await this.refreshAll();
      } catch(e) {
        console.error('删除配色方案失败', e);
        const status = e?.response?.status;
        const msg = e?.response?.data?.error || '';
        if (status === 404) {
          msg.warning(msg || '配色方案不存在或已被删除');
          // 前端刷新一次，清掉缓存中的 phantom 方案
          await this.refreshAll();
        } else if (status === 400) {
          msg.warning(msg || '无法删除该配色方案');
        } else if (status === 409) {
          msg.warning(msg || '该配色方案存在引用，无法删除');
        } else {
          msg.error(msg || '删除失败');
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
        msg.success('已删除作品');
        await this.refreshAll();
      } catch(e) {
        console.error('删除作品失败', e);
        const status = e?.response?.status;
        const msg = e?.response?.data?.error || '';
        if (status === 404) {
          msg.warning(msg || '作品不存在或已被删除');
          await this.refreshAll();
        } else if (status === 400) {
          msg.warning(msg || '无法删除该作品');
        } else if (status === 409) {
          msg.warning(msg || '该作品存在引用，无法删除');
        } else {
          msg.error(msg || '删除失败');
        }
      }
  },
    
    // Pagination methods
    goToPage(page) {
      if (page === '...') return;
      if (page < 1 || page > this.totalPages) return;
      
      this.currentPage = page;
      
      // Scroll to top of content area
      this.$nextTick(() => {
        const container = this.$el.querySelector('.artwork-bar');
        if (container) {
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      
      // Save preference
      try {
        localStorage.setItem('sw-artworks-page', page);
      } catch(e) {}
    },
    
    onItemsPerPageChange() {
      // Reset to first page when changing items per page
      this.currentPage = 1;
      
      // Save preference
      try {
        localStorage.setItem('sw-artworks-items-per-page', this.itemsPerPage);
      } catch(e) {}
    },
    
    // Restore pagination state on mount
    restorePaginationState() {
      try {
        const savedPage = localStorage.getItem('sw-artworks-page');
        const savedItems = localStorage.getItem('sw-artworks-items-per-page');
        
        if (savedItems) {
          this.itemsPerPage = parseInt(savedItems);
        }
        
        if (savedPage) {
          const page = parseInt(savedPage);
          if (page <= this.totalPages) {
            this.currentPage = page;
          }
        }
      } catch(e) {}
    },
    
    // Update pagination based on app config
    updatePaginationFromConfig() {
      if (this.globalData && this.globalData.appConfig && this.globalData.appConfig.value) {
        const config = this.globalData.appConfig.value;
        
        // Get saved items per page preference
        let savedItems = null;
        try {
          const saved = localStorage.getItem('sw-artworks-items-per-page');
          if (saved) savedItems = parseInt(saved);
        } catch(e) {}
        
        // Use ConfigHelper to determine items per page
        this.itemsPerPage = window.ConfigHelper.getItemsPerPage(
          config, 
          'artworks', 
          savedItems
        );
      }
    }
  },
  
  watch: {
    // Reset to page 1 when sort mode changes
    sortMode() {
      this.currentPage = 1;
    },
    
    // Adjust current page if it exceeds total pages
    totalPages(newVal) {
      if (this.currentPage > newVal && newVal > 0) {
        this.currentPage = newVal;
      }
    },
    
    // Watch for app config changes
    'globalData.appConfig.value': {
      handler(newConfig) {
        if (newConfig) {
          this.updatePaginationFromConfig();
        }
      },
      deep: true
    }
  },
  
  async mounted() {
    // Update items per page based on app config
    this.updatePaginationFromConfig();
    
    try {
      this.loading = true;
      // 恢复视图模式
      try {
        const vm = localStorage.getItem('sw_artworks_view_mode');
        if (vm === 'byLayer' || vm === 'byColor') {
          this.viewMode = vm;
        }
      } catch(e) {}
      
      // Restore pagination state
      this.restorePaginationState();
      
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

// Expose to global scope for app.js to access
window.ArtworksComponent = ArtworksComponent;