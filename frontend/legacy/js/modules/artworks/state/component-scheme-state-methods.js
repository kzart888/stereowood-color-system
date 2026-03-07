(function (window) {
  window.ArtworksSchemeStateMethods = {
    setSchemeRef(scheme) {
      return (el) => {
        if (el) this._schemeRefs.set(scheme.id, el); else this._schemeRefs.delete(scheme.id);
      };
    },

    addRow(index) {
      const dialog = this.getSchemeDialogModule();
      if (dialog && typeof dialog.addRow === 'function') {
        const options = (typeof index === 'number' && Number.isFinite(index)) ? { index } : {};
        dialog.addRow(this.schemeForm, options);
      } else {
        const maxLayer = Math.max(0, ...(this.schemeForm.mappings || []).map((x) => Number(x.layer) || 0));
        this.schemeForm.mappings.push({ layer: maxLayer + 1, colorCode: '' });
      }
    },

    duplicateRow(idx) {
      const dialog = this.getSchemeDialogModule();
      if (dialog && typeof dialog.duplicateRow === 'function') {
        dialog.duplicateRow(this.schemeForm, idx);
      } else {
        const row = this.schemeForm.mappings[idx];
        this.schemeForm.mappings.splice(idx + 1, 0, { layer: row.layer, colorCode: row.colorCode });
      }
    },

    removeRow(idx) {
      const dialog = this.getSchemeDialogModule();
      if (dialog && typeof dialog.removeRow === 'function') {
        dialog.removeRow(this.schemeForm, idx);
      } else {
        this.schemeForm.mappings.splice(idx, 1);
        if (this.schemeForm.mappings.length === 0) {
          this.schemeForm.mappings.push({ layer: 1, colorCode: '' });
        }
      }
    },

    // 序列化层映射，保留重复层，按层排序
  };
})(window);
