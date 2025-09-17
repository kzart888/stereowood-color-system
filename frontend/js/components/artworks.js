const artworksLogger = (typeof window !== 'undefined' && window.createLogger)
  ? window.createLogger('ArtworksComponent')
  : null;

const ArtworksComponent = {
  props: {
    sortMode: { type: String, default: 'time' }
  },
  emits: ['view-mode-changed'],
  inject: ['globalData'],
  mixins: [
    window.ArtworksPaginationMixin,
    window.ArtworksHighlightMixin,
    window.ArtworksFocusMixin
  ],
  components: {
    'artworks-list-view': window.ArtworksListView,
    'scheme-editor': window.ArtworksSchemeEditor,
    'artwork-editor': window.ArtworksArtworkEditor
  },
  data() {
    return {
      loading: false,
      viewMode: 'byLayer',
      showSchemeDialog: false,
      showArtworkDialog: false,
      schemeContext: null,
      sizeFilters: ['巨尺寸', '大尺寸', '中尺寸', '小尺寸'],
      selectedSizes: [],
      shapeFilters: ['正方形', '长方形', '圆形', '不规则形'],
      selectedShapes: []
    };
  },
  computed: {
    formulaUtils() {
      return window.formulaUtils;
    },
    isDevelopmentMode() {
      return this.globalData &&
        this.globalData.appConfig &&
        this.globalData.appConfig.value &&
        this.globalData.appConfig.value.mode === 'test';
    },
    baseURL() {
      return window.location.origin;
    },
    artworks() {
      let raw = (this.globalData.artworks?.value || []).slice();
      if (this.selectedSizes.length > 0 || this.selectedShapes.length > 0) {
        raw = raw.filter((art) => {
          const title = art.title || '';
          let matchesSize = this.selectedSizes.length === 0;
          let matchesShape = this.selectedShapes.length === 0;
          if (this.selectedSizes.length > 0) {
            matchesSize = this.selectedSizes.some((size) => title.includes(size));
          }
          if (this.selectedShapes.length > 0) {
            matchesShape = this.selectedShapes.some((shape) => title.includes(shape));
          }
          return matchesSize && matchesShape;
        });
      }
      if (this.sortMode === 'name') {
        raw.sort((a, b) => this.$helpers.formatArtworkTitle(a).localeCompare(this.$helpers.formatArtworkTitle(b)));
      } else {
        raw.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
      }
      const query = (this.$root && this.$root.globalSearchQuery || '').trim().toLowerCase();
      if (!query || this.$root.activeTab !== 'artworks') {
        return raw;
      }
      const tokens = query.split(/\s+/).filter(Boolean);
      const multi = tokens.length > 1;
      const processed = raw.map((art) => {
        const code = (art.code || '').toLowerCase();
        const name = (art.name || art.title || '').toLowerCase();
        const artCombo = code && name ? `${code}-${name}` : (code || name);
        const schemes = Array.isArray(art.schemes) ? art.schemes.slice() : [];
        const matchedSchemes = schemes.filter((scheme) => {
          const schemeName = (scheme.name || '').toLowerCase();
          if (multi) {
            return tokens.every((token) =>
              schemeName.includes(token) ||
              code.includes(token) ||
              name.includes(token) ||
              artCombo.includes(token)
            );
          }
          return schemeName.includes(query);
        });
        const artNameHit = multi
          ? tokens.every((token) => code.includes(token) || name.includes(token) || artCombo.includes(token))
          : (code.includes(query) || name.includes(query) || artCombo.includes(query));
        if (!artNameHit && matchedSchemes.length === 0) {
          return null;
        }
        const clone = { ...art };
        if (artNameHit && matchedSchemes.length === 0) {
          clone.schemes = schemes;
          clone._swSearchArtOnly = true;
        } else if (!artNameHit) {
          clone.schemes = matchedSchemes;
          clone._swSearchSchemesPartial = true;
        } else {
          clone.schemes = matchedSchemes.length ? matchedSchemes : schemes;
          clone._swSearchSchemesPartial = matchedSchemes.length > 0;
        }
        return clone;
      }).filter(Boolean);
      return processed;
    },
    customColors() {
      return this.globalData.customColors.value || [];
    },
    colorMap() {
      const map = {};
      (this.customColors || []).forEach((color) => {
        const code = color.code || color.colorCode || color.color_code;
        if (code) {
          map[code] = color;
        }
      });
      return map;
    }
  },
  methods: {
    async refreshAll() {
      await Promise.all([
        this.globalData.loadCustomColors(),
        this.globalData.loadArtworks()
      ]);
    },
    toggleViewMode() {
      this.viewMode = this.viewMode === 'byLayer' ? 'byColor' : 'byLayer';
      try {
        localStorage.setItem('sw_artworks_view_mode', this.viewMode);
      } catch (error) {
        if (artworksLogger && artworksLogger.warn) {
          artworksLogger.warn('无法持久化视图模式', error);
        }
      }
      this.$emit('view-mode-changed', this.viewMode);
    },
    addArtwork() {
      this.showArtworkDialog = true;
    },
    onArtworkCreated() {
      this.refreshAll();
    },
    addScheme(art) {
      this.schemeContext = { art, scheme: null };
      this.showSchemeDialog = true;
    },
    editScheme(art, scheme) {
      this.schemeContext = { art, scheme };
      this.showSchemeDialog = true;
    },
    formatSchemeLabel(art, scheme) {
      const title = this.$helpers.formatArtworkTitle(art);
      const schemeName = (scheme && (scheme.name || scheme.scheme_name)) || '-';
      return `${title}-[${schemeName}]`;
    },
    async deleteScheme(art, scheme) {
      const confirmed = await this.$helpers.doubleDangerConfirm({
        firstMessage: `确定要删除配色方案 “${this.formatSchemeLabel(art, scheme)}” 吗？`,
        secondMessage: '删除后将无法恢复，确认最终删除？',
        secondConfirmText: '永久删除'
      });
      if (!confirmed) {
        return;
      }
      try {
        const url = `${window.location.origin}/api/artworks/${art.id}/schemes/${scheme.id}`;
        await axios.delete(url);
        msg.success('已删除配色方案');
        await this.refreshAll();
      } catch (error) {
        const status = error?.response?.status;
        const serverMessage = error?.response?.data?.error || '';
        if (artworksLogger && artworksLogger.error) {
          artworksLogger.error('删除配色方案失败', error);
        }
        if (status === 404) {
          msg.warning(serverMessage || '配色方案不存在或已被删除');
          await this.refreshAll();
        } else if (status === 400) {
          msg.warning(serverMessage || '无法删除该配色方案');
        } else if (status === 409) {
          msg.warning(serverMessage || '该配色方案存在引用，无法删除');
        } else {
          msg.error(serverMessage || '删除失败');
        }
      }
    },
    async deleteArtwork(art) {
      if ((art.schemes || []).length > 0) {
        return;
      }
      const confirmed = await this.$helpers.doubleDangerConfirm({
        firstMessage: `确定要删除作品 "${this.$helpers.formatArtworkTitle(art)}" 吗？`,
        secondMessage: '删除后将无法恢复，确认最终删除？',
        secondConfirmText: '永久删除'
      });
      if (!confirmed) {
        return;
      }
      try {
        const url = `${window.location.origin}/api/artworks/${art.id}`;
        await axios.delete(url);
        msg.success('已删除作品');
        await this.refreshAll();
      } catch (error) {
        const status = error?.response?.status;
        const serverMessage = error?.response?.data?.error || '';
        if (artworksLogger && artworksLogger.error) {
          artworksLogger.error('删除作品失败', error);
        }
        if (status === 404) {
          msg.warning(serverMessage || '作品不存在或已被删除');
          await this.refreshAll();
        } else if (status === 400) {
          msg.warning(serverMessage || '无法删除该作品');
        } else if (status === 409) {
          msg.warning(serverMessage || '该作品存在引用，无法删除');
        } else {
          msg.error(serverMessage || '删除失败');
        }
      }
    },
    showHistory() {
      msg.info('历史功能暂未实现');
    },
    async onSchemeSaved() {
      await this.refreshAll();
    },
    restoreViewMode() {
      try {
        const stored = localStorage.getItem('sw_artworks_view_mode');
        if (stored === 'byLayer' || stored === 'byColor') {
          this.viewMode = stored;
        }
      } catch (error) {
        if (artworksLogger && artworksLogger.warn) {
          artworksLogger.warn('无法恢复视图模式', error);
        }
      }
    }
  },
  watch: {
    sortMode() {
      this.currentPage = 1;
    }
  },
  async mounted() {
    this.updatePaginationFromConfig();
    this.restoreViewMode();
    this.restorePaginationState();
    try {
      this.loading = true;
      await this.refreshAll();
    } finally {
      this.loading = false;
    }
    this.$emit('view-mode-changed', this.viewMode);
  },
  template: `
    <div class="artworks-page">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon> 加载中...
      </div>
      <div v-else>
        <artworks-list-view
          :artworks="artworks"
          :paginated-artworks="paginatedArtworks"
          :view-mode="viewMode"
          :base-url="baseURL"
          :color-map="colorMap"
          :formula-utils="formulaUtils"
          :highlight-scheme-id="highlightSchemeId"
          :highlight-layers="highlightLayers"
          :highlight-color-code="highlightColorCode"
          :current-page="currentPage"
          :total-pages="totalPages"
          :start-item="startItem"
          :end-item="endItem"
          :visible-pages="visiblePages"
          :items-per-page="itemsPerPage"
          :is-development-mode="isDevelopmentMode"
          :on-go-to-page="goToPage"
          :on-items-per-page-change="onItemsPerPageChange"
          :on-add-scheme="addScheme"
          :on-edit-scheme="editScheme"
          :on-delete-scheme="deleteScheme"
          :on-delete-artwork="deleteArtwork"
          :on-show-history="showHistory"
          :register-scheme-ref="setSchemeRef"
          :size-filters="sizeFilters"
          :selected-sizes="selectedSizes"
          :shape-filters="shapeFilters"
          :selected-shapes="selectedShapes"
        ></artworks-list-view>

        <scheme-editor
          :visible="showSchemeDialog"
          :context="schemeContext"
          :base-url="baseURL"
          :custom-colors="customColors"
          :formula-utils="formulaUtils"
          @update:visible="val => showSchemeDialog = val"
          @saved="onSchemeSaved"
        ></scheme-editor>

        <artwork-editor
          :visible="showArtworkDialog"
          :artworks="artworks"
          @update:visible="val => showArtworkDialog = val"
          @created="onArtworkCreated"
        ></artwork-editor>
      </div>
    </div>
  `
};

window.ArtworksComponent = ArtworksComponent;
