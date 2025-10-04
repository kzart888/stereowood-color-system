(function (window) {
  const DEFAULT_MAPPING = { layer: 1, colorCode: '' };

  function cloneMapping(mapping = {}) {
    return {
      layer: Number(mapping.layer) || 1,
      colorCode: String(mapping.colorCode || mapping.code || '').trim()
    };
  }

  function ensureMappings(form) {
    if (!form.mappings || !Array.isArray(form.mappings) || form.mappings.length === 0) {
      form.mappings = [cloneMapping(DEFAULT_MAPPING)];
    }
  }

  function fallbackBuildURL(baseURL, path) {
    if (!path) {
      return '';
    }
    const base = (baseURL || window.location.origin || '').replace(/\/$/, '');
    const normalized = String(path).replace(/^\/+/, '');
    const withPrefix = normalized.startsWith('uploads/') ? normalized : `uploads/${normalized}`;
    return `${base}/${withPrefix}`;
  }

  function buildUploadURL(baseURL, helpers) {
    if (helpers && typeof helpers.buildUploadURL === 'function') {
      return (path) => helpers.buildUploadURL(baseURL, path);
    }
    return (path) => fallbackBuildURL(baseURL, path);
  }

  function createEmptyForm() {
    return {
      id: null,
      name: '',
      thumbnailFile: null,
      thumbnailPreview: null,
      initialThumbnailFile: null,
      initialThumbnailPreview: null,
      existingInitialThumbnailPath: null,
      mappings: [cloneMapping(DEFAULT_MAPPING)]
    };
  }

  function hydrateFormFromScheme(options = {}) {
    const { scheme, baseURL = window.location.origin, helpers } = options;
    const form = createEmptyForm();
    if (!scheme) {
      return form;
    }
    const uploadURL = buildUploadURL(baseURL, helpers);
    form.id = scheme.id || null;
    form.name = scheme.name || scheme.scheme_name || '';
    if (scheme.thumbnail_path) {
      form.thumbnailPreview = uploadURL(scheme.thumbnail_path);
    }
    if (scheme.initial_thumbnail_path) {
      form.initialThumbnailPreview = uploadURL(scheme.initial_thumbnail_path);
      form.existingInitialThumbnailPath = scheme.initial_thumbnail_path;
    }
    if (window.ArtworkSchemeUtils && typeof window.ArtworkSchemeUtils.normalizeMappings === 'function') {
      const normalized = window.ArtworkSchemeUtils.normalizeMappings(scheme);
      if (normalized.length) {
        form.mappings = normalized.map(cloneMapping);
      }
    }
    ensureMappings(form);
    return form;
  }

  function createSnapshot(form) {
    if (!form) {
      return '{}';
    }
    const normalizedMappings = (form.mappings || [])
      .map((mapping) => ({
        layer: Number(mapping.layer) || 0,
        colorCode: String(mapping.colorCode || '').trim()
      }))
      .filter((mapping) => Number.isFinite(mapping.layer) && mapping.layer > 0)
      .sort((a, b) => a.layer - b.layer);
    return JSON.stringify({
      id: form.id || null,
      name: (form.name || '').trim(),
      thumbnail: form.thumbnailPreview ? '1' : '',
      initialThumbnail: form.initialThumbnailPreview ? '1' : '',
      mappings: normalizedMappings
    });
  }

  function isDirty(form, snapshot) {
    if (!snapshot) {
      return false;
    }
    return createSnapshot(form) !== snapshot;
  }

  function addRow(form, options = {}) {
    ensureMappings(form);
    const row = cloneMapping(options.mapping || DEFAULT_MAPPING);
    if (options.index === undefined || options.index === null || options.index < 0) {
      form.mappings.push(row);
    } else {
      form.mappings.splice(options.index + 1, 0, row);
    }
  }

  function duplicateRow(form, index) {
    ensureMappings(form);
    const source = form.mappings[index];
    const row = cloneMapping(source || DEFAULT_MAPPING);
    form.mappings.splice(index + 1, 0, row);
  }

  function removeRow(form, index) {
    ensureMappings(form);
    if (form.mappings.length <= 1) {
      form.mappings[0] = cloneMapping(DEFAULT_MAPPING);
      return;
    }
    form.mappings.splice(index, 1);
    ensureMappings(form);
  }

  function setMapping(form, index, data = {}) {
    ensureMappings(form);
    const target = form.mappings[index];
    if (!target) {
      return;
    }
    if (data.layer !== undefined) {
      target.layer = Number(data.layer) || 1;
    }
    if (data.colorCode !== undefined) {
      target.colorCode = String(data.colorCode || '').trim();
    }
  }

  function getMappings(form) {
    ensureMappings(form);
    return form.mappings.map(cloneMapping);
  }

  function buildLayerPayload(form) {
    const mappings = getMappings(form);
    if (window.ArtworkSchemeUtils && typeof window.ArtworkSchemeUtils.buildLayerPayload === 'function') {
      return window.ArtworkSchemeUtils.buildLayerPayload(mappings);
    }
    return mappings
      .filter((mapping) => Number.isFinite(mapping.layer) && mapping.layer > 0)
      .map((mapping) => ({
        layer: Number(mapping.layer),
        colorCode: String(mapping.colorCode || '').trim()
      }))
      .sort((a, b) => a.layer - b.layer);
  }

  window.ArtworkSchemeDialog = {
    createEmptyForm,
    hydrateFormFromScheme,
    createSnapshot,
    isDirty,
    addRow,
    duplicateRow,
    removeRow,
    setMapping,
    getMappings,
    buildLayerPayload
  };
})(window);
