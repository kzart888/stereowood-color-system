(function (window) {
  const MAX_RELATED_ASSETS = 6;
  const ALLOWED_DOC_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'txt', 'md']);
  const ALLOWED_DOC_MIME_TYPES = new Set([
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
  ]);

  function getResponseData(response) {
    if (response && Object.prototype.hasOwnProperty.call(response, 'data')) {
      return response.data;
    }
    return response;
  }

  function normalizeExtension(fileName) {
    const raw = String(fileName || '');
    const index = raw.lastIndexOf('.');
    if (index === -1) {
      return '';
    }
    return raw.slice(index + 1).toLowerCase();
  }

  function isImageMime(mimeType) {
    return String(mimeType || '').toLowerCase().startsWith('image/');
  }

  function isAllowedRelatedFile(file) {
    const mimeType = String(file?.type || file?.mimeType || '').toLowerCase();
    const extension = normalizeExtension(file?.name || file?.original_name || file?.file_path);
    if (isImageMime(mimeType)) {
      return true;
    }
    if (ALLOWED_DOC_MIME_TYPES.has(mimeType)) {
      return true;
    }
    return ALLOWED_DOC_EXTENSIONS.has(extension);
  }

  function toSizeLabel(fileSize) {
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return '未知';
    }
    if (fileSize < 1024) {
      return `${fileSize} B`;
    }
    if (fileSize < 1024 * 1024) {
      return `${Math.round(fileSize / 1024)} KB`;
    }
    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }

  function toDateLabel(value) {
    if (!value) {
      return '未知';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '未知';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  window.ArtworksSchemeDialogMethods = {
    addScheme(art) {
      this.editingArtId = art.id;
      this.schemeEditing = { art, scheme: null };
      const dialog = this.getSchemeDialogModule();
      this.schemeForm = dialog && typeof dialog.createEmptyForm === 'function'
        ? dialog.createEmptyForm()
        : {
            id: null,
            version: null,
            name: '',
            thumbnailFile: null,
            thumbnailPreview: null,
            relatedAssets: [],
            removedRelatedAssetIds: [],
            newRelatedFiles: [],
            mappings: [{ layer: 1, colorCode: '' }],
          };
      this.quickAssetUploadingSchemeId = null;
      this.showSchemeDialog = true;
    },

    editScheme(art, scheme) {
      this.editingArtId = art.id;
      this.schemeEditing = { art, scheme };
      const dialog = this.getSchemeDialogModule();
      if (dialog && typeof dialog.hydrateFormFromScheme === 'function') {
        this.schemeForm = dialog.hydrateFormFromScheme({
          scheme,
          baseURL: this.baseURL,
          helpers: this.$helpers,
        });
      } else {
        const rows = this.normalizedMappings(scheme);
        this.schemeForm = {
          id: scheme.id,
          version: Number.isInteger(scheme.version) ? scheme.version : null,
          name: scheme.name || '',
          thumbnailFile: null,
          thumbnailPreview: scheme.thumbnail_path
            ? this.$helpers.buildUploadURL(this.baseURL, scheme.thumbnail_path)
            : null,
          relatedAssets: this.getSchemeRelatedAssets(scheme),
          removedRelatedAssetIds: [],
          newRelatedFiles: [],
          mappings: rows.length ? rows : [{ layer: 1, colorCode: '' }],
        };
      }
      this.quickAssetUploadingSchemeId = null;
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
      this.clearPendingRelatedAssetPreviews();
      if (this._schemeDialogGuard && typeof this._schemeDialogGuard.clearSnapshot === 'function') {
        this._schemeDialogGuard.clearSnapshot();
      } else {
        this._schemeOriginalSnapshot = null;
      }
      this.quickAssetUploadingSchemeId = null;
      this.showAssetPreviewDialog = false;
      this.assetPreviewLoading = false;
      this.assetPreviewTitle = '相关资料预览';
      this.assetPreviewData = { asset: null, preview: { kind: 'unsupported', warning: '' }, fileUrl: null };
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
        relatedAssetIds: (this.schemeForm.relatedAssets || []).map((asset) => String(asset.id)).sort(),
        removedRelatedAssetIds: (this.schemeForm.removedRelatedAssetIds || []).map((id) => String(id)).sort(),
        pendingRelatedAssets: (this.schemeForm.newRelatedFiles || []).map((asset) => String(asset.name || '')).sort(),
        mappings: (this.schemeForm.mappings || [])
          .map((item) => ({
            layer: Number(item.layer) || 0,
            code: String(item.colorCode || '').trim(),
          }))
          .sort((left, right) => left.layer - right.layer),
      };
    },

    _isSchemeDirty() {
      if (this._schemeDialogGuard && typeof this._schemeDialogGuard.isDirty === 'function') {
        return this._schemeDialogGuard.isDirty(this._normalizedSchemeForm());
      }
      if (!this._schemeOriginalSnapshot) {
        return false;
      }
      return this._createSchemeSnapshot() !== this._schemeOriginalSnapshot;
    },

    async attemptCloseSchemeDialog() {
      if (this._isSchemeDirty()) {
        try {
          await ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存修改', {
            confirmButtonText: '丢弃修改',
            cancelButtonText: '继续编辑',
            type: 'warning',
          });
        } catch {
          return;
        }
      }
      this.showSchemeDialog = false;
    },

    _bindEsc() {
      if (this._escHandler) {
        return;
      }
      this._escHandler = (event) => {
        if (event.key !== 'Escape') {
          return;
        }
        if (this.showSchemeDialog) {
          this.attemptCloseSchemeDialog();
          return;
        }
        if (this.showArtworkDialog) {
          this.attemptCloseArtworkDialog();
        }
      };
      document.addEventListener('keydown', this._escHandler);
    },

    _unbindEsc() {
      if (!this._escHandler) {
        return;
      }
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    },

    onThumbChange(file) {
      const rawFile = file?.raw || file;
      if (!rawFile) {
        return;
      }
      this.schemeForm.thumbnailFile = rawFile;
      const reader = new FileReader();
      reader.onload = () => {
        this.schemeForm.thumbnailPreview = reader.result;
      };
      reader.readAsDataURL(rawFile);
    },

    clearThumb() {
      this.schemeForm.thumbnailFile = null;
      this.schemeForm.thumbnailPreview = null;
    },

    normalizeIncomingAsset(asset) {
      if (!asset) {
        return null;
      }
      const normalized = Object.assign({}, asset);
      const mimeType = String(normalized.mime_type || '').toLowerCase();
      const assetType = String(normalized.asset_type || '').toLowerCase();
      normalized.is_image = Boolean(normalized.is_image || assetType === 'image' || mimeType.startsWith('image/'));
      return normalized;
    },

    getSchemeRelatedAssets(scheme) {
      const source = Array.isArray(scheme?.related_assets) ? scheme.related_assets : [];
      const assets = source
        .map((item) => this.normalizeIncomingAsset(item))
        .filter(Boolean)
        .slice(0, MAX_RELATED_ASSETS);

      if (!assets.length && scheme?.initial_thumbnail_path) {
        assets.push(this.normalizeIncomingAsset({
          id: `legacy-${scheme.id || 'new'}`,
          scheme_id: scheme.id || null,
          asset_type: 'image',
          original_name: '历史初始方案',
          file_path: scheme.initial_thumbnail_path,
          thumb_path: scheme.initial_thumbnail_thumb_path || null,
          is_image: true,
        }));
      }
      return assets;
    },

    canQuickAddAsset(scheme) {
      if (!scheme || this.quickAssetUploadingSchemeId === scheme.id) {
        return false;
      }
      return this.getSchemeRelatedAssets(scheme).length < MAX_RELATED_ASSETS;
    },

    assetThumbURL(asset) {
      if (!asset) {
        return '';
      }
      const filePath = asset.thumb_path || asset.file_path;
      return filePath ? this.$helpers.buildUploadURL(this.baseURL, filePath) : '';
    },

    assetExt(asset) {
      const raw = String(asset?.original_name || asset?.file_path || '').toLowerCase();
      const extension = normalizeExtension(raw);
      if (!extension) {
        return asset?.is_image ? 'IMG' : 'DOC';
      }
      return extension.toUpperCase();
    },

    assetTypeLabel(asset) {
      if (asset?.file_type_label) {
        return asset.file_type_label;
      }
      if (asset?.mimeType && String(asset.mimeType).toLowerCase().startsWith('image/')) {
        return '图片';
      }
      const ext = this.assetExt(asset);
      if (ext === 'TXT') return 'TXT 文本';
      if (ext === 'MD') return 'Markdown 文档';
      if (ext === 'DOC') return 'Word 文档 (.doc)';
      if (ext === 'DOCX') return 'Word 文档 (.docx)';
      if (ext === 'XLS') return 'Excel 表格 (.xls)';
      if (ext === 'XLSX') return 'Excel 表格 (.xlsx)';
      return ext;
    },

    assetModifiedTimeLabel(asset) {
      const sourceModifiedAt = asset?.source_modified_at || asset?.sourceModifiedAt || asset?.lastModifiedAt;
      return toDateLabel(sourceModifiedAt);
    },

    assetSizeLabel(asset) {
      const value = Number(asset?.file_size ?? asset?.size ?? 0);
      return toSizeLabel(value);
    },

    async onQuickAddAssetChange(art, scheme, event) {
      const file = event?.target?.files?.[0];
      if (!file) {
        return;
      }
      if (!scheme?.id) {
        msg.warning('请先保存配色方案，再添加相关资料。');
        event.target.value = '';
        return;
      }
      if (!window.ArtworksApi || typeof window.ArtworksApi.addSchemeAsset !== 'function') {
        msg.error('缺少相关资料上传接口。');
        event.target.value = '';
        return;
      }
      if (!isAllowedRelatedFile(file)) {
        msg.warning('仅支持图片、Word、Excel、TXT、MD 文件。');
        event.target.value = '';
        return;
      }

      this.quickAssetUploadingSchemeId = scheme.id;
      try {
        const formData = new FormData();
        formData.append('asset', file);
        if (Number.isFinite(file.lastModified) && file.lastModified > 0) {
          formData.append('asset_last_modified', String(file.lastModified));
        }
        await window.ArtworksApi.addSchemeAsset({
          baseURL: this.baseURL,
          artId: art.id,
          schemeId: scheme.id,
          formData,
        });
        msg.success('相关资料已添加');
        await this.refreshAll();
      } catch (error) {
        const serverMessage = error?.response?.data?.error || '';
        msg.error(serverMessage || '添加相关资料失败');
      } finally {
        this.quickAssetUploadingSchemeId = null;
        event.target.value = '';
      }
    },

    onRelatedAssetFilesChange(file) {
      const rawFile = file?.raw || file;
      if (!rawFile) {
        return;
      }
      if (!isAllowedRelatedFile(rawFile)) {
        msg.warning('仅支持图片、Word、Excel、TXT、MD 文件。');
        return;
      }

      const existingCount = Array.isArray(this.schemeForm.relatedAssets) ? this.schemeForm.relatedAssets.length : 0;
      const pendingCount = Array.isArray(this.schemeForm.newRelatedFiles) ? this.schemeForm.newRelatedFiles.length : 0;
      if (existingCount + pendingCount >= MAX_RELATED_ASSETS) {
        msg.warning(`每个方案最多 ${MAX_RELATED_ASSETS} 个相关资料。`);
        return;
      }

      const extension = normalizeExtension(rawFile.name);
      const isImage = isImageMime(rawFile.type);
      const uid = String(rawFile.uid || `${Date.now()}-${Math.round(Math.random() * 1000000)}`);
      const item = {
        uid,
        file: rawFile,
        name: rawFile.name,
        mimeType: rawFile.type || '',
        size: rawFile.size || 0,
        sourceModifiedAt: Number.isFinite(rawFile.lastModified) && rawFile.lastModified > 0
          ? new Date(rawFile.lastModified).toISOString()
          : null,
        extension: extension ? extension.toUpperCase() : (isImage ? 'IMG' : 'DOC'),
        isImage,
        previewUrl: null,
      };

      if (isImage) {
        item.previewUrl = URL.createObjectURL(rawFile);
      }

      if (!Array.isArray(this.schemeForm.newRelatedFiles)) {
        this.schemeForm.newRelatedFiles = [];
      }
      this.schemeForm.newRelatedFiles.push(item);
    },

    removeExistingRelatedAsset(asset) {
      const assetId = Number(asset?.id);
      if (!assetId) {
        return;
      }
      this.schemeForm.relatedAssets = (this.schemeForm.relatedAssets || []).filter((item) => Number(item.id) !== assetId);
      if (!Array.isArray(this.schemeForm.removedRelatedAssetIds)) {
        this.schemeForm.removedRelatedAssetIds = [];
      }
      if (!this.schemeForm.removedRelatedAssetIds.includes(assetId)) {
        this.schemeForm.removedRelatedAssetIds.push(assetId);
      }
    },

    async downloadRelatedAsset(asset) {
      const assetId = Number(asset?.id);
      const schemeId = Number(this.schemeForm?.id || asset?.scheme_id);
      const artId = Number(this.editingArtId);
      if (!Number.isInteger(assetId) || assetId <= 0) {
        msg.warning('相关资料不存在，无法下载。');
        return;
      }
      if (!Number.isInteger(artId) || artId <= 0 || !Number.isInteger(schemeId) || schemeId <= 0) {
        msg.warning('缺少方案上下文，无法下载。');
        return;
      }
      if (!window.ArtworksApi || typeof window.ArtworksApi.getSchemeAssetDownloadUrl !== 'function') {
        msg.error('缺少相关资料下载接口。');
        return;
      }

      try {
        const downloadUrl = window.ArtworksApi.getSchemeAssetDownloadUrl({
          baseURL: this.baseURL,
          artId,
          schemeId,
          assetId,
        });

        const response = await fetch(downloadUrl, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          let errorMessage = '下载相关资料失败';
          try {
            const payload = await response.json();
            if (payload?.error) {
              errorMessage = payload.error;
            }
          } catch {
            // keep default message when response is not JSON
          }
          throw new Error(errorMessage);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download =
          String(asset.original_name || asset.file_path || `asset-${assetId}`).trim() || `asset-${assetId}`;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } catch (error) {
        msg.error(error?.message || '下载相关资料失败');
      }
    },

    removePendingRelatedAsset(uid) {
      const pending = Array.isArray(this.schemeForm.newRelatedFiles) ? this.schemeForm.newRelatedFiles : [];
      const target = pending.find((item) => item.uid === uid);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      this.schemeForm.newRelatedFiles = pending.filter((item) => item.uid !== uid);
    },

    clearPendingRelatedAssetPreviews() {
      const pending = Array.isArray(this.schemeForm?.newRelatedFiles) ? this.schemeForm.newRelatedFiles : [];
      pending.forEach((item) => {
        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      if (this.schemeForm) {
        this.schemeForm.newRelatedFiles = [];
      }
    },

    openPendingRelatedAsset(asset, event) {
      if (!asset) {
        return;
      }
      if (asset.isImage && asset.previewUrl) {
        this.$thumbPreview && this.$thumbPreview.show(event, asset.previewUrl);
        return;
      }
      this.showAssetPreviewDialog = true;
      this.assetPreviewLoading = false;
      this.assetPreviewTitle = '相关资料预览';
      this.assetPreviewData = {
        asset: {
          original_name: asset.name,
          mime_type: asset.mimeType,
          file_size: asset.size,
          source_modified_at: asset.sourceModifiedAt || null,
          file_type_label: this.assetTypeLabel(asset),
        },
        preview: {
          kind: 'text',
          text: '该文件尚未上传。\n请先保存方案，再点击查看完整预览。',
          truncated: false,
        },
        fileUrl: null,
      };
    },

    async openRelatedAsset(asset, event, artIdFromList = null, schemeIdFromList = null) {
      if (!asset) {
        return;
      }
      const fileUrl = asset.file_path ? this.$helpers.buildUploadURL(this.baseURL, asset.file_path) : null;
      if (asset.is_image && fileUrl) {
        this.$thumbPreview && this.$thumbPreview.show(event, fileUrl);
        return;
      }
      await this.openRelatedAssetPreview(asset, fileUrl, artIdFromList, schemeIdFromList);
    },

    async openRelatedAssetPreview(asset, fileUrl, artIdFromList = null, schemeIdFromList = null) {
      this.showAssetPreviewDialog = true;
      this.assetPreviewLoading = true;
      this.assetPreviewTitle = `相关资料预览 - ${asset?.original_name || asset?.file_path || '未命名文件'}`;
      this.assetPreviewData = {
        asset: this.normalizeIncomingAsset(asset),
        preview: { kind: 'loading' },
        fileUrl: fileUrl || null,
      };

      const assetId = Number(asset?.id);
      const schemeId = Number(schemeIdFromList || this.schemeForm?.id || asset?.scheme_id);
      const artId = Number(artIdFromList || this.editingArtId);
      if (!Number.isInteger(assetId) || !Number.isInteger(schemeId) || !Number.isInteger(artId)) {
        this.assetPreviewData.preview = {
          kind: 'unsupported',
          warning: '缺少方案上下文，无法加载预览，请使用“下载”查看。',
        };
        this.assetPreviewLoading = false;
        return;
      }

      try {
        if (!window.ArtworksApi || typeof window.ArtworksApi.getSchemeAssetPreview !== 'function') {
          throw new Error('预览接口不可用');
        }
        const response = await window.ArtworksApi.getSchemeAssetPreview({
          baseURL: this.baseURL,
          artId,
          schemeId,
          assetId,
        });
        const payload = getResponseData(response) || {};
        this.assetPreviewData = {
          asset: Object.assign({}, this.normalizeIncomingAsset(asset), payload.asset || {}),
          preview: payload.preview || { kind: 'unsupported', warning: '无法加载预览内容。' },
          fileUrl: fileUrl || null,
        };
      } catch (error) {
        this.assetPreviewData.preview = {
          kind: 'unsupported',
          warning: error?.response?.data?.error || error?.message || '加载预览失败，请使用“下载”查看。',
        };
      } finally {
        this.assetPreviewLoading = false;
      }
    },

    openAssetPreviewSourceFile() {
      const fileUrl = this.assetPreviewData?.fileUrl || null;
      if (!fileUrl) {
        msg.warning('当前资料缺少可打开的文件地址。');
        return;
      }
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    },

    async syncSchemeRelatedAssets(artId, schemeId) {
      if (!window.ArtworksApi) {
        return;
      }
      const removedIds = Array.isArray(this.schemeForm.removedRelatedAssetIds)
        ? this.schemeForm.removedRelatedAssetIds.slice()
        : [];
      for (const assetId of removedIds) {
        try {
          await window.ArtworksApi.deleteSchemeAsset({
            baseURL: this.baseURL,
            artId,
            schemeId,
            assetId,
          });
        } catch (error) {
          const status = error?.response?.status;
          if (status !== 404) {
            throw error;
          }
        }
      }

      const pending = Array.isArray(this.schemeForm.newRelatedFiles)
        ? this.schemeForm.newRelatedFiles.slice()
        : [];
      for (const item of pending) {
        const formData = new FormData();
        formData.append('asset', item.file);
        if (item.sourceModifiedAt) {
          formData.append('asset_last_modified', item.sourceModifiedAt);
        } else if (Number.isFinite(item.file?.lastModified) && item.file.lastModified > 0) {
          formData.append('asset_last_modified', String(item.file.lastModified));
        }
        await window.ArtworksApi.addSchemeAsset({
          baseURL: this.baseURL,
          artId,
          schemeId,
          formData,
        });
      }
    },

    schemePreviewSource(scheme) {
      const path = scheme?.thumbnail_thumb_path || scheme?.thumbnail_path;
      return path ? this.$helpers.buildUploadURL(this.baseURL, path) : '';
    },

    schemePreviewOriginal(scheme) {
      const path = scheme?.thumbnail_path || scheme?.thumbnail_thumb_path;
      return path ? this.$helpers.buildUploadURL(this.baseURL, path) : '';
    },

    onSchemeThumbError(event, scheme) {
      const element = event?.target;
      if (!element) {
        return;
      }
      const fallback = this.schemePreviewOriginal(scheme);
      if (fallback && element.src !== fallback) {
        element.src = fallback;
        return;
      }
      const wrapper = element.closest ? element.closest('.scheme-thumbnail') : null;
      if (wrapper) {
        wrapper.classList.add('no-image');
      }
    },

    onRelatedAssetThumbError(event, asset) {
      const element = event?.target;
      if (!element) {
        return;
      }
      const fallbackPath = asset?.file_path;
      const fallback = fallbackPath ? this.$helpers.buildUploadURL(this.baseURL, fallbackPath) : '';
      if (fallback && element.src !== fallback) {
        element.src = fallback;
        return;
      }
      const wrapper = element.closest ? element.closest('.related-asset-card') : null;
      if (wrapper) {
        wrapper.classList.add('no-image');
      }
    },

    async saveScheme() {
      const valid = await this.$refs.schemeFormRef.validate().catch(() => false);
      if (!valid || this.schemeNameDuplicate) {
        return;
      }

      const artId = this.editingArtId;
      if (!artId) {
        msg.error('缺少作品信息，无法保存方案。');
        return;
      }

      const formData = new FormData();
      formData.append('name', String(this.schemeForm.name || '').trim());
      formData.append('layers', JSON.stringify(this.buildLayerPayload()));

      if (this.schemeForm.thumbnailFile) {
        formData.append('thumbnail', this.schemeForm.thumbnailFile);
      } else if (this.schemeEditing?.scheme?.thumbnail_path && this.schemeForm.thumbnailPreview) {
        formData.append('existingThumbnailPath', this.schemeEditing.scheme.thumbnail_path);
      }

      if (Number.isInteger(this.schemeForm.version)) {
        formData.append('version', this.schemeForm.version);
      }

      this.saving = true;
      try {
        if (!window.ArtworksApi || typeof window.ArtworksApi.saveScheme !== 'function') {
          throw new Error('ArtworksApi.saveScheme is unavailable');
        }

        const isEditing = Boolean(this.schemeForm.id);
        const response = await window.ArtworksApi.saveScheme({
          baseURL: this.baseURL,
          artId,
          schemeId: this.schemeForm.id || null,
          formData,
        });
        const payload = getResponseData(response) || {};
        const targetSchemeId = this.schemeForm.id || payload.id;

        const hasRelatedAssetDiff =
          (this.schemeForm.removedRelatedAssetIds || []).length > 0 ||
          (this.schemeForm.newRelatedFiles || []).length > 0;

        if (hasRelatedAssetDiff) {
          if (!targetSchemeId) {
            throw new Error('Scheme id missing after save; cannot sync related assets.');
          }
          await this.syncSchemeRelatedAssets(artId, targetSchemeId);
        }

        msg.success(isEditing ? '配色方案已保存' : '配色方案已创建');
        await this.refreshAll();
        this.showSchemeDialog = false;
      } catch (error) {
        const conflictAdapter = window.conflictAdapter;
        if (
          conflictAdapter &&
          typeof conflictAdapter.isVersionConflict === 'function' &&
          conflictAdapter.isVersionConflict(error, 'color_scheme')
        ) {
          const conflict = conflictAdapter.extract(error, { entityType: 'color_scheme' });
          msg.warning(conflictAdapter.getMessage(conflict, '方案已被其他用户更新，请刷新后重试。'));
          if (conflict.latestData) {
            const dialog = this.getSchemeDialogModule();
            this.clearPendingRelatedAssetPreviews();
            if (dialog && typeof dialog.hydrateFormFromScheme === 'function') {
              this.schemeForm = dialog.hydrateFormFromScheme({
                scheme: conflict.latestData,
                baseURL: this.baseURL,
                helpers: this.$helpers,
              });
            }
          }
          await this.refreshAll();
          return;
        }

        const serverMessage = error?.response?.data?.error || '';
        msg.error(serverMessage || '保存方案失败');
      } finally {
        this.saving = false;
      }
    },

    async deleteScheme(art, scheme) {
      const ok = await this.$helpers.doubleDangerConfirm({
        firstMessage: `确定要删除配色方案 "${scheme?.name || ''}" 吗？`,
        secondMessage: '删除后将无法恢复，确认最终删除吗？',
        secondConfirmText: '永久删除',
      });
      if (!ok) {
        return;
      }

      try {
        if (!window.ArtworksApi || typeof window.ArtworksApi.deleteScheme !== 'function') {
          throw new Error('ArtworksApi.deleteScheme is unavailable');
        }
        await window.ArtworksApi.deleteScheme({
          baseURL: this.baseURL,
          artId: art.id,
          schemeId: scheme.id,
        });
        msg.success('配色方案已删除');
        await this.refreshAll();
      } catch (error) {
        const payload =
          window.ArtworksApi && typeof window.ArtworksApi.getErrorPayload === 'function'
            ? window.ArtworksApi.getErrorPayload(error)
            : { status: error?.response?.status, message: error?.response?.data?.error || '' };

        if (payload.status === 404) {
          msg.warning(payload.message || '配色方案不存在或已删除。');
          await this.refreshAll();
          return;
        }
        if (payload.status === 400) {
          msg.warning(payload.message || '当前配色方案不允许删除。');
          return;
        }
        if (payload.status === 409) {
          msg.warning(payload.message || '配色方案存在引用，无法删除。');
          return;
        }
        msg.error(payload.message || '删除配色方案失败');
      }
    },
  };
})(window);
