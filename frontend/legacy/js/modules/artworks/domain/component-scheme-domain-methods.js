(function (window) {
  window.ArtworksSchemeDomainMethods = {
    parseFormulaLines(formula) {
      if (window.ArtworksFormulaView && typeof window.ArtworksFormulaView.parseFormulaLines === 'function') {
        return window.ArtworksFormulaView.parseFormulaLines(formula);
      }
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

    getSchemeUtilsModule() {
      return window.ArtworkSchemeUtils || null;
    },

    getSchemeDialogModule() {
      return window.ArtworkSchemeDialog || null;
    },
    // Formula structure method removed - using shared formulaUtils.structured instead

    normalizedMappings(scheme) {
      const utils = this.getSchemeUtilsModule();
      if (utils && typeof utils.normalizeMappings === 'function') {
        return utils.normalizeMappings(scheme);
      }
      return [];
    },

    groupedByColor(scheme) {
      const utils = this.getSchemeUtilsModule();
      if (utils && typeof utils.groupByColor === 'function') {
        return utils.groupByColor(scheme);
      }
      return [];
    },

    duplicateLayerSet(scheme) {
      const utils = this.getSchemeUtilsModule();
      if (utils && typeof utils.duplicateLayerSet === 'function') {
        return utils.duplicateLayerSet(scheme);
      }
      return new Set();
    },

    groupedByColorWithFlags(scheme) {
      const utils = this.getSchemeUtilsModule();
      if (utils && typeof utils.groupedByColorWithFlags === 'function') {
        return utils.groupedByColorWithFlags(scheme);
      }
      return [];
    },

    hasScheme(schemeId) {
      schemeId = Number(schemeId);
      if (!schemeId) return false;
      return (this.artworks || []).some(a => (a.schemes||[]).some(s => s.id === schemeId));
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

    buildLayerPayload() {
      const dialog = this.getSchemeDialogModule();
      if (dialog && typeof dialog.buildLayerPayload === 'function') {
        return dialog.buildLayerPayload(this.schemeForm);
      }
      const arr = [];
      (this.schemeForm.mappings || []).forEach((m) => {
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
  };
})(window);
