(function (window) {
  window.ArtworksSchemeDialogMethods = {
    addScheme(art) {
      this.editingArtId = art.id;
      this.schemeEditing = { art, scheme: null };
      const dialog = this.getSchemeDialogModule();
      if (dialog && typeof dialog.createEmptyForm === 'function') {
        this.schemeForm = dialog.createEmptyForm();
        this.schemeForm.id = null;
      } else {
        this.schemeForm = {
          id: null,
          version: null,
          name: '',
          thumbnailFile: null,
          thumbnailPreview: null,
          initialThumbnailFile: null,
          initialThumbnailPreview: null,
          existingInitialThumbnailPath: null,
          mappings: [{ layer: 1, colorCode: '' }]
        };
      }
      this.showSchemeDialog = true;
    },

    // 子bar“修改”

    editScheme(art, scheme) {
      this.editingArtId = art.id;
      this.schemeEditing = { art, scheme };
      const dialog = this.getSchemeDialogModule();
      if (dialog && typeof dialog.hydrateFormFromScheme === 'function') {
        this.schemeForm = dialog.hydrateFormFromScheme({
          scheme,
          baseURL: this.baseURL,
          helpers: this.$helpers
        });
        if (!Number.isInteger(this.schemeForm.version) && Number.isInteger(scheme.version)) {
          this.schemeForm.version = scheme.version;
        }
      } else {
        const rows = this.normalizedMappings(scheme);
        this.schemeForm = {
          id: scheme.id,
          version: Number.isInteger(scheme.version) ? scheme.version : null,
          name: scheme.name || '',
          thumbnailFile: null,
          thumbnailPreview: scheme.thumbnail_path ? this.$helpers.buildUploadURL(this.baseURL, scheme.thumbnail_path) : null,
          initialThumbnailFile: null,
          initialThumbnailPreview: scheme.initial_thumbnail_path ? this.$helpers.buildUploadURL(this.baseURL, scheme.initial_thumbnail_path) : null,
          existingInitialThumbnailPath: scheme.initial_thumbnail_path,
          mappings: rows.length ? rows : [{ layer: 1, colorCode: '' }]
        };
      }
      this.showSchemeDialog = true;
    },

    showHistory() {
      msg.info('历史功能暂未实现');
    },

    onOpenDialog() {
      if (this._schemeDialogGuard && typeof this._schemeDialogGuard.setSnapshot === 'function') {
        this._schemeDialogGuard.setSnapshot(this._normalizedSchemeForm());
      } else {
        this._schemeOriginalSnapshot = this._createSchemeSnapshot();
      }
      this._bindEsc();
    },

    onCloseDialog() {
      if (this._schemeDialogGuard && typeof this._schemeDialogGuard.clearSnapshot === 'function') {
        this._schemeDialogGuard.clearSnapshot();
      } else {
        this._schemeOriginalSnapshot = null;
      }
      this._unbindEsc();
    },

    _createSchemeSnapshot() {
      const dialog = this.getSchemeDialogModule();
      if (dialog && typeof dialog.createSnapshot === 'function') {
        return dialog.createSnapshot(this.schemeForm);
      }
      return JSON.stringify(this._normalizedSchemeForm());
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
      if (this._schemeDialogGuard && typeof this._schemeDialogGuard.isDirty === 'function') {
        return this._schemeDialogGuard.isDirty(this._normalizedSchemeForm());
      }
      if (!this._schemeOriginalSnapshot) return false;
      return this._createSchemeSnapshot() !== this._schemeOriginalSnapshot;
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

    async saveScheme() {
      const valid = await this.$refs.schemeFormRef.validate().catch(() => false);
      if (!valid) return;
      if (this.schemeNameDuplicate) return;
      const artId = this.editingArtId;
      if (!artId) return;

      const fd = new FormData();
      fd.append('name', this.schemeForm.name.trim());
      fd.append('layers', JSON.stringify(this.buildLayerPayload()));
      if (this.schemeForm.thumbnailFile) {
        fd.append('thumbnail', this.schemeForm.thumbnailFile);
      }
      if (!this.schemeForm.thumbnailFile && this.schemeEditing?.scheme?.thumbnail_path) {
        fd.append('existingThumbnailPath', this.schemeEditing.scheme.thumbnail_path);
      }
      if (this.schemeForm.initialThumbnailFile) {
        fd.append('initialThumbnail', this.schemeForm.initialThumbnailFile);
      }
      if (!this.schemeForm.initialThumbnailFile && this.schemeForm.existingInitialThumbnailPath) {
        fd.append('existingInitialThumbnailPath', this.schemeForm.existingInitialThumbnailPath);
      }
      if (Number.isInteger(this.schemeForm.version)) {
        fd.append('version', this.schemeForm.version);
      }

      this.saving = true;
      try {
        if (window.ArtworksApi && typeof window.ArtworksApi.saveScheme === 'function') {
          await window.ArtworksApi.saveScheme({
            baseURL: this.baseURL,
            artId,
            schemeId: this.schemeForm.id || null,
            formData: fd
          });
        } else {
          throw new Error('ArtworksApi.saveScheme is unavailable');
        }
        msg.success(this.schemeForm.id ? '已保存方案修改' : '已新增配色方案');
        await this.refreshAll();
        this.showSchemeDialog = false;
      } catch (error) {
        console.error('保存配色方案失败', error);
        const conflictAdapter = window.conflictAdapter;
        if (conflictAdapter && conflictAdapter.isVersionConflict && conflictAdapter.isVersionConflict(error, 'color_scheme')) {
          const conflict = conflictAdapter.extract(error, { entityType: 'color_scheme' });
          msg.warning(conflictAdapter.getMessage(conflict, '方案已被其他操作更新，请刷新后重试。'));
          if (conflict.latestData) {
            const dialog = this.getSchemeDialogModule();
            if (dialog && typeof dialog.hydrateFormFromScheme === 'function') {
              this.schemeForm = dialog.hydrateFormFromScheme({
                scheme: conflict.latestData,
                baseURL: this.baseURL,
                helpers: this.$helpers
              });
            } else {
              const rows = this.normalizedMappings(conflict.latestData);
              this.schemeForm = {
                id: conflict.latestData.id,
                version: Number.isInteger(conflict.latestData.version) ? conflict.latestData.version : conflict.actualVersion || null,
                name: conflict.latestData.name || conflict.latestData.scheme_name || '',
                thumbnailFile: null,
                thumbnailPreview: conflict.latestData.thumbnail_path
                  ? this.$helpers.buildUploadURL(this.baseURL, conflict.latestData.thumbnail_path)
                  : null,
                initialThumbnailFile: null,
                initialThumbnailPreview: conflict.latestData.initial_thumbnail_path
                  ? this.$helpers.buildUploadURL(this.baseURL, conflict.latestData.initial_thumbnail_path)
                  : null,
                existingInitialThumbnailPath: conflict.latestData.initial_thumbnail_path || null,
                mappings: rows.length ? rows : [{ layer: 1, colorCode: '' }]
              };
            }
          }
          await this.refreshAll();
          return;
        }
        const serverMessage = error?.response?.data?.error || '';
        msg.error(serverMessage || '保存失败');
      } finally {
        this.saving = false;
      }
    },

    async deleteScheme(art, scheme) {
      const ok = await this.$helpers.doubleDangerConfirm({
        firstMessage: `确定要删除配色方案 "${scheme?.name || ''}" 吗？`,
        secondMessage: '删除后将无法恢复，确认最终删除？',
        secondConfirmText: '永久删除'
      });
      if (!ok) return;
      try {
        if (window.ArtworksApi && typeof window.ArtworksApi.deleteScheme === 'function') {
          await window.ArtworksApi.deleteScheme({ baseURL: this.baseURL, artId: art.id, schemeId: scheme.id });
        } else {
          throw new Error('ArtworksApi.deleteScheme is unavailable');
        }
        msg.success('已删除配色方案');
        await this.refreshAll();
      } catch (error) {
        console.error('删除配色方案失败', error);
        const payload =
          window.ArtworksApi && typeof window.ArtworksApi.getErrorPayload === 'function'
            ? window.ArtworksApi.getErrorPayload(error)
            : { status: error?.response?.status, message: error?.response?.data?.error || '' };
        const status = payload.status;
        const serverMessage = payload.message || '';
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
  };
})(window);
