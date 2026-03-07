(function (window) {
  window.ArtworksComponentOptions = {
  created() {
    if (window.ArtworksStore && typeof window.ArtworksStore.create === 'function') {
      this.artworksStore = window.ArtworksStore.create({ baseURL: this.baseURL, helpers: this.$helpers });
      this.artworksStore.setCustomColors(this.customColors);
    }
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
    remainingRelatedAssetSlots() {
      const existing = Array.isArray(this.schemeForm?.relatedAssets) ? this.schemeForm.relatedAssets.length : 0;
      const pending = Array.isArray(this.schemeForm?.newRelatedFiles) ? this.schemeForm.newRelatedFiles.length : 0;
      const remaining = 6 - existing - pending;
      return remaining > 0 ? remaining : 0;
    },
    customColors() { return this.globalData.customColors.value || []; },
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
  methods: Object.assign(
    {},
    window.ArtworksSchemeDomainMethods || {},
    window.ArtworksSchemeStateMethods || {},
    window.ArtworksSchemeDialogMethods || {},
    {
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
      return this.artworksStore ? this.artworksStore.getColorByCode(code) : null;
    },

    resolveSwatchForColor(color, options = {}) {
      if (!this.artworksStore) {
        return null;
      }
      return this.artworksStore.resolveSwatchForColor(color, options);
    },

    resolveSwatchByCode(code, options = {}) {
      if (!this.artworksStore) {
        return null;
      }
      return this.artworksStore.resolveSwatchByCode(code, options);
    },

    computeSwatchStyle(swatch) {
      if (!this.artworksStore) {
        return {};
      }
      return this.artworksStore.computeSwatchStyle(swatch);
    },

    swatchStyleByCode(code) {
      if (!this.artworksStore) {
        return {};
      }
      return this.artworksStore.getSwatchStyleByCode(code);
    },

    swatchClassByCode(code) {
      if (!this.artworksStore) {
        return { 'no-image': true };
      }
      return this.artworksStore.getSwatchClassByCode(code);
    },

    swatchStyleForColor(color) {
      if (!this.artworksStore) {
        return {};
      }
      return this.artworksStore.getSwatchStyleForColor(color);
    },

    swatchClassForColor(color) {
      if (!this.artworksStore) {
        return { 'no-image': true };
      }
      return this.artworksStore.getSwatchClassForColor(color);
    },
    // 将配方字符串拆成一行一条成分：匹配 “名称 数值单位” 组合

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
      if (this._artworkDialogGuard && typeof this._artworkDialogGuard.setSnapshot === 'function') {
        this._artworkDialogGuard.setSnapshot(this._normalizedArtworkForm());
      } else {
        this._artworkSnapshot = JSON.stringify(this._normalizedArtworkForm());
      }
      this._bindEsc(); // 复用 ESC 逻辑（同方案对话框）
    },

    onCloseArtworkDialog() {
      if (this._artworkDialogGuard && typeof this._artworkDialogGuard.clearSnapshot === 'function') {
        this._artworkDialogGuard.clearSnapshot();
      } else {
        this._artworkSnapshot = null;
      }
      if (!this.showSchemeDialog) this._unbindEsc();
    },

    _normalizedArtworkForm() {
      return { title: this.artworkForm.title || '' };
    },

    _isArtworkDirty() {
      if (this._artworkDialogGuard && typeof this._artworkDialogGuard.isDirty === 'function') {
        return this._artworkDialogGuard.isDirty(this._normalizedArtworkForm());
      }
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
      const valid = await this.$refs.artworkFormRef.validate().catch(() => false);
      if (!valid) return;
      const parsed = this._parseArtworkTitle(this.artworkForm.title);
      if (!parsed) return;
      const { code, name } = parsed;
      try {
        if (window.ArtworksApi && typeof window.ArtworksApi.createArtwork === 'function') {
          await window.ArtworksApi.createArtwork({ baseURL: this.baseURL, code, name });
        } else {
          throw new Error('ArtworksApi.createArtwork is unavailable');
        }
        msg.success('已创建新作品');
        await this.refreshAll();
        this.showArtworkDialog = false;
      } catch (error) {
        console.error(error);
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

    async deleteArtwork(art) {
      if ((art.schemes || []).length > 0) return;
      const ok = await this.$helpers.doubleDangerConfirm({
        firstMessage: `确定要删除作品 "${art?.name || ''}" 吗？`,
        secondMessage: '删除后将无法恢复，确认最终删除？',
        secondConfirmText: '永久删除'
      });
      if (!ok) return;
      try {
        if (window.ArtworksApi && typeof window.ArtworksApi.deleteArtwork === 'function') {
          await window.ArtworksApi.deleteArtwork({ baseURL: this.baseURL, artId: art.id });
        } else {
          throw new Error('ArtworksApi.deleteArtwork is unavailable');
        }
        msg.success('已删除作品');
        await this.refreshAll();
      } catch (error) {
        console.error('删除作品失败', error);
        const payload =
          window.ArtworksApi && typeof window.ArtworksApi.getErrorPayload === 'function'
            ? window.ArtworksApi.getErrorPayload(error)
            : { status: error?.response?.status, message: error?.response?.data?.error || '' };
        const status = payload.status;
        const serverMessage = payload.message || '';
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

    // Pagination methods

    goToPage(page) {
      if (this._listState && typeof this._listState.goToPage === 'function') {
        this._listState.goToPage(page);
        return;
      }
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
      if (this._listState && typeof this._listState.onItemsPerPageChange === 'function') {
        this._listState.onItemsPerPageChange();
        return;
      }
      // Reset to first page when changing items per page
      this.currentPage = 1;
      
      // Save preference
      try {
        localStorage.setItem('sw-artworks-items-per-page', this.itemsPerPage);
      } catch(e) {}
    },
    
    // Restore pagination state on mount

    restorePaginationState() {
      if (this._listState && typeof this._listState.restorePaginationState === 'function') {
        this._listState.restorePaginationState();
        return;
      }
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
      if (this._listState && typeof this._listState.updatePaginationFromConfig === 'function') {
        this._listState.updatePaginationFromConfig();
        return;
      }
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
    }
  ),
  
  watch: {
    customColors: {
      handler(list) {
        if (this.artworksStore) {
          this.artworksStore.setCustomColors(list);
        }
      },
      immediate: true
    },
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
    if (window.LegacyListState && typeof window.LegacyListState.create === 'function') {
      this._listState = window.LegacyListState.create({
        vm: this,
        pageKey: 'sw-artworks-page',
        itemsKey: 'sw-artworks-items-per-page',
        listSelector: '.artwork-bar',
        configSection: 'artworks'
      });
    }
    if (window.LegacyDialogGuard && typeof window.LegacyDialogGuard.create === 'function') {
      this._artworkDialogGuard = window.LegacyDialogGuard.create({
        vm: this,
        snapshotKey: '_artworkSnapshot',
        escHandlerKey: '_artworkEscHandler'
      });
      this._schemeDialogGuard = window.LegacyDialogGuard.create({
        vm: this,
        snapshotKey: '_schemeOriginalSnapshot',
        escHandlerKey: '_schemeEscHandler'
      });
    }

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
  },
  beforeUnmount() {
    this._unbindEsc();
    if (this._highlightTimer) {
      clearTimeout(this._highlightTimer);
      this._highlightTimer = null;
    }
  }
  };
})(window);
