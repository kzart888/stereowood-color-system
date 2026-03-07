(function (window) {
  function getBaseURL(baseURL) {
    return String(baseURL || window.location.origin || '').replace(/\/$/, '');
  }

  function getGateway() {
    const bridge = window.runtimeBridge || {};
    const gateway = bridge.apiGateway || window.apiGateway || null;
    if (!gateway || !gateway.montMarteColors) {
      throw new Error('montMarteColors gateway is unavailable');
    }
    return gateway.montMarteColors;
  }

  function appendIfPresent(formData, key, value) {
    if (value === null || value === undefined || value === '') return;
    formData.append(key, value);
  }

  function buildFormData(options = {}) {
    const form = options.form || {};
    const editing = options.editing || null;
    const formData = new FormData();

    formData.append('name', String(form.name || '').trim());

    if (form.category_id !== null && form.category_id !== undefined && form.category_id !== '') {
      formData.append('category_id', form.category_id);
    } else if (form.category !== null && form.category !== undefined && String(form.category).trim()) {
      formData.append('category', String(form.category).trim());
    }

    appendIfPresent(formData, 'supplier_id', form.supplier_id);
    appendIfPresent(formData, 'purchase_link_id', form.purchase_link_id);

    if (form.imageFile) {
      formData.append('image', form.imageFile);
    }

    if (!form.imageFile && form.imagePreview && editing && editing.image_path) {
      formData.append('existingImagePath', editing.image_path);
    }
    if (Number.isInteger(form.version)) {
      formData.append('version', form.version);
    }

    return formData;
  }

  async function saveColor(options = {}) {
    const baseURL = getBaseURL(options.baseURL);
    const form = options.form || {};
    const editing = options.editing || null;
    const formData = buildFormData({ form, editing });
    const gateway = getGateway();

    if (editing) {
      const id = form.id;
      if (!id) {
        throw new Error('form.id is required when editing');
      }
      return gateway.update(baseURL, id, formData);
    }

    return gateway.create(baseURL, formData);
  }

  window.MontMarteSaveWorkflow = {
    buildFormData,
    saveColor,
  };
})(window);
