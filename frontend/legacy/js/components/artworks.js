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
                <div class="scheme-thumbnail" :class="{ 'no-image': !schemePreviewSource(scheme) }" @click="schemePreviewOriginal(scheme) && $thumbPreview && $thumbPreview.show($event, schemePreviewOriginal(scheme))">
                  <template v-if="!schemePreviewSource(scheme)">未上传图片</template>
                  <img v-else :src="schemePreviewSource(scheme)" @error="onSchemeThumbError($event, scheme)" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                </div>
                <div style="flex: 1;">
                  <div class="scheme-name">{{ displaySchemeName(art, scheme) }}</div>
                  <div class="scheme-meta-row">
                    <!-- 左列：层数和更新时间 -->
                    <div class="scheme-meta-main">
                      <div class="meta-text">层数：{{ (scheme.layers || []).length }}</div>
                      <div class="meta-text" v-if="scheme.updated_at">更新：{{ $helpers.formatDate(scheme.updated_at) }}</div>
                    </div>
                    <div class="scheme-related-assets-block">
                      <span class="meta-text related-assets-label">相关资料：</span>
                      <div class="related-assets-strip">
                        <button
                          type="button"
                          class="related-asset-card"
                          v-for="asset in getSchemeRelatedAssets(scheme)"
                          :key="asset.id"
                          @click="openRelatedAsset(asset, $event, art.id, scheme.id)"
                          :title="asset.original_name || asset.file_path"
                        >
                          <img v-if="asset.is_image" :src="assetThumbURL(asset)" @error="onRelatedAssetThumbError($event, asset)" />
                          <span v-else class="related-asset-doc">
                            <strong>{{ assetExt(asset) }}</strong>
                            <small>查看详情</small>
                          </span>
                        </button>
                        <label v-if="canQuickAddAsset(scheme)" class="related-asset-add" :title="'添加资料（最多6个）'" :class="{ 'is-uploading': quickAssetUploadingSchemeId === scheme.id }">
                          <input
                            class="related-asset-input"
                            type="file"
                            accept="image/*,.doc,.docx,.xls,.xlsx,.txt,.md"
                            :disabled="quickAssetUploadingSchemeId === scheme.id"
                            @change="onQuickAddAssetChange(art, scheme, $event)"
                          />
                          <span class="related-asset-plus">+</span>
                        </label>
                      </div>
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
              <span class="scheme-sep">- [</span>
              <el-input v-model.trim="schemeForm.name" placeholder="例如：金黄" class="scheme-name-input" :maxlength="10" />
              <span class="scheme-bracket-end">]</span>
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

          <el-form-item label="相关资料">
            <div class="scheme-related-editor">
              <div class="scheme-related-editor-actions">
                <el-upload
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="onRelatedAssetFilesChange"
                  accept="image/*,.doc,.docx,.xls,.xlsx,.txt,.md"
                  :disabled="remainingRelatedAssetSlots <= 0"
                >
                  <el-button size="small" type="primary" :disabled="remainingRelatedAssetSlots <= 0">
                    <el-icon><Upload /></el-icon>
                    添加资料
                  </el-button>
                </el-upload>
                <span class="meta-text">最多6个，当前可添加 {{ remainingRelatedAssetSlots }} 个</span>
              </div>
              <div class="scheme-related-editor-list">
                <div
                  class="scheme-related-item"
                  v-for="asset in schemeForm.relatedAssets"
                  :key="'existing-'+asset.id"
                >
                  <button type="button" class="related-asset-card" @click="openRelatedAsset(asset, $event)">
                    <img v-if="asset.is_image" :src="assetThumbURL(asset)" @error="onRelatedAssetThumbError($event, asset)" />
                    <span v-else class="related-asset-doc">
                      <strong>{{ assetExt(asset) }}</strong>
                      <small>查看详情</small>
                    </span>
                  </button>
                  <div class="scheme-related-meta">
                    <span class="scheme-related-name">{{ asset.original_name || asset.file_path }}</span>
                    <span class="scheme-related-sub">文件时间：{{ assetModifiedTimeLabel(asset) }}</span>
                    <span class="scheme-related-sub">文件类型：{{ assetTypeLabel(asset) }}</span>
                  </div>
                  <div class="scheme-related-actions">
                    <el-button size="small" plain @click="downloadRelatedAsset(asset)">下载</el-button>
                    <el-button size="small" type="danger" plain @click="removeExistingRelatedAsset(asset)">删除</el-button>
                  </div>
                </div>
                <div
                  class="scheme-related-item"
                  v-for="asset in schemeForm.newRelatedFiles"
                  :key="'new-'+asset.uid"
                >
                  <button type="button" class="related-asset-card" @click="openPendingRelatedAsset(asset, $event)">
                    <img v-if="asset.isImage" :src="asset.previewUrl" />
                    <span v-else class="related-asset-doc">
                      <strong>{{ asset.extension }}</strong>
                      <small>待上传</small>
                    </span>
                  </button>
                  <div class="scheme-related-meta">
                    <span class="scheme-related-name">{{ asset.name }}</span>
                    <span class="scheme-related-sub">文件时间：{{ assetModifiedTimeLabel(asset) }}</span>
                    <span class="scheme-related-sub">文件类型：{{ assetTypeLabel(asset) }}</span>
                  </div>
                  <div class="scheme-related-actions">
                    <el-button size="small" type="danger" plain @click="removePendingRelatedAsset(asset.uid)">移除</el-button>
                  </div>
                </div>
                <div v-if="!schemeForm.relatedAssets.length && !schemeForm.newRelatedFiles.length" class="meta-text">
                  暂无相关资料
                </div>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="层-自配色">
            <div style="width:100%;">
              <table class="layer-table mapping-table">
                <colgroup>
                  <col class="mapping-col-layer" />
                  <col class="mapping-col-color" />
                  <col class="mapping-col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>层号</th>
                    <th>自配色号</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(m, idx) in schemeForm.mappings" :key="idx">
                    <td>
                      <div class="layer-input-cell">
                        <div class="layer-input-main">
                          <el-input-number class="layer-number-input" v-model="m.layer" :min="1" :max="200" controls-position="right" size="small" />
                        </div>
                        <div class="layer-dup-indicator">
                          <template v-if="formDupCounts[m.layer] > 1">
                            <el-tooltip :content="'检测到第' + m.layer + '层被分配了' + formDupCounts[m.layer] + '次颜色'" placement="top">
                              <span class="dup-badge" :style="{ backgroundColor: dupBadgeColor(m.layer) }">!</span>
                            </el-tooltip>
                          </template>
                        </div>
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
                            <div class="mapping-formula-chips">
                              <el-tooltip v-for="(line,i) in parseFormulaLines(colorByCode(m.colorCode).formula)" :key="'mf'+idx+'-'+i" :content="line" placement="top">
                                <span class="mf-chip">{{ line }}</span>
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
                          class="mapping-action-btn"
                          title="复制行"
                        >
                          <el-icon><Plus /></el-icon>
                        </el-button>
                        <el-button 
                          size="small" 
                          type="danger" 
                          @click="removeRow(idx)"
                          class="mapping-action-btn"
                          title="删除行"
                        >
                          <el-icon><Minus /></el-icon>
                        </el-button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="add-button-container" style="margin-top: 6px; align-items: center;">
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="addRow"
                  class="mapping-action-btn"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
                <span class="add-hint">按层号顺序填写；保存时会按层号排序；允许相同层号，即同层多色，但会触发提醒图标</span>
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

      <el-dialog
        class="asset-preview-dialog"
        v-model="showAssetPreviewDialog"
        :title="assetPreviewTitle"
        width="860px"
        append-to-body
      >
        <div class="asset-preview-meta" v-if="assetPreviewData && assetPreviewData.asset">
          <span>文件名：{{ assetPreviewData.asset.original_name || assetPreviewData.asset.file_path || '-' }}</span>
          <span>文件时间：{{ assetModifiedTimeLabel(assetPreviewData.asset) }}</span>
          <span>文件类型：{{ assetTypeLabel(assetPreviewData.asset) }}</span>
          <span>文件大小：{{ assetSizeLabel(assetPreviewData.asset) }}</span>
        </div>
        <div class="asset-preview-loading" v-if="assetPreviewLoading">
          <el-icon class="is-loading"><Loading /></el-icon>
          加载预览中...
        </div>
        <div v-else class="asset-preview-body">
          <pre v-if="assetPreviewData.preview && assetPreviewData.preview.kind === 'text'" class="asset-preview-text">{{ assetPreviewData.preview.text || '暂无文本内容' }}</pre>
          <div v-else-if="assetPreviewData.preview && assetPreviewData.preview.kind === 'table'" class="asset-preview-table-wrap">
            <table class="asset-preview-table">
              <tbody>
                <tr v-for="(row, rowIndex) in assetPreviewData.preview.rows || []" :key="'apr-'+rowIndex">
                  <td v-for="(cell, cellIndex) in row" :key="'apc-'+rowIndex+'-'+cellIndex">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
            <div class="meta-text" v-if="assetPreviewData.preview.truncated">表格较大，仅展示部分内容。</div>
          </div>
          <div v-else-if="assetPreviewData.preview && assetPreviewData.preview.kind === 'image'" class="meta-text">
            图片文件请直接点击缩略图查看大图。
          </div>
          <div v-else class="meta-text">
            {{ (assetPreviewData.preview && assetPreviewData.preview.warning) || '当前文件类型暂不支持内置预览，可下载后查看。' }}
          </div>
          <div class="meta-text" v-if="assetPreviewData.preview && assetPreviewData.preview.truncated && assetPreviewData.preview.kind === 'text'">文本较长，仅展示部分内容。</div>
        </div>
        <template #footer>
          <el-button @click="showAssetPreviewDialog = false">关闭</el-button>
          <el-button type="primary" :disabled="!assetPreviewData || !assetPreviewData.fileUrl" @click="openAssetPreviewSourceFile">打开原文件</el-button>
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
        version: null,
        name: '',
        thumbnailFile: null,
        thumbnailPreview: null,
        relatedAssets: [],
        removedRelatedAssetIds: [],
        newRelatedFiles: [],
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
      itemsPerPage: 24  // Default, will be updated from app config
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
  , showAssetPreviewDialog: false
  , assetPreviewLoading: false
  , assetPreviewTitle: '相关资料预览'
  , assetPreviewData: { asset: null, preview: { kind: 'unsupported', warning: '' }, fileUrl: null }
  , // Filter options
    sizeFilters: ['巨尺寸', '大尺寸', '中尺寸', '小尺寸'],
    selectedSizes: [],
    shapeFilters: ['正方形', '长方形', '圆形', '不规则形'],
    selectedShapes: [],
    showHelp: false,
    artworksStore: null,
    _listState: null,
    _artworkDialogGuard: null,
    _schemeDialogGuard: null
  , quickAssetUploadingSchemeId: null
    };
  },
  ...(window.ArtworksComponentOptions || {})

};

// Expose to global scope for app.js to access
window.ArtworksComponent = ArtworksComponent;





