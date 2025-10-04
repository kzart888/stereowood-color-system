(function (window) {
  function normalizeMappings(scheme) {
    if (!scheme) {
      return [];
    }
    let rows = [];
    if (Array.isArray(scheme.layers)) {
      rows = scheme.layers.map((x) => ({
        layer: Number(x.layer),
        colorCode: x.colorCode || x.code || x.custom_color_code || ''
      }));
    } else if (scheme.layers && typeof scheme.layers === 'object') {
      rows = Object.keys(scheme.layers).map((key) => ({
        layer: Number(key),
        colorCode: scheme.layers[key]
      }));
    }
    return rows
      .filter((item) => Number.isFinite(item.layer))
      .sort((a, b) => a.layer - b.layer);
  }

  function groupByColor(scheme) {
    const mappings = normalizeMappings(scheme);
    const grouped = new Map();
    const emptyLayers = [];
    mappings.forEach((mapping) => {
      const code = mapping.colorCode;
      if (!code) {
        emptyLayers.push(mapping.layer);
        return;
      }
      if (!grouped.has(code)) {
        grouped.set(code, []);
      }
      grouped.get(code).push(mapping.layer);
    });
    const results = Array.from(grouped.entries()).map(([code, layers]) => ({
      code,
      layers: layers.sort((a, b) => a - b),
      isEmptyGroup: false
    }));
    if (emptyLayers.length) {
      results.push({
        code: '',
        layers: emptyLayers.sort((a, b) => a - b),
        isEmptyGroup: true
      });
    }
    results.sort((a, b) => {
      if (a.isEmptyGroup && b.isEmptyGroup) {
        return 0;
      }
      if (a.isEmptyGroup) {
        return 1;
      }
      if (b.isEmptyGroup) {
        return -1;
      }
      return a.code.localeCompare(b.code);
    });
    return results;
  }

  function duplicateLayerSet(scheme) {
    const duplicates = new Set();
    const seen = new Map();
    const mappings = normalizeMappings(scheme);
    mappings.forEach((mapping) => {
      const count = (seen.get(mapping.layer) || 0) + 1;
      seen.set(mapping.layer, count);
      if (count > 1) {
        duplicates.add(mapping.layer);
      }
    });
    return duplicates;
  }

  function groupedByColorWithFlags(scheme) {
    const groups = groupByColor(scheme);
    const duplicates = duplicateLayerSet(scheme);
    return groups.map((group) => ({
      ...group,
      hasDup: (group.layers || []).some((layer) => duplicates.has(layer))
    }));
  }

  function buildLayerPayload(mappings = []) {
    const payload = [];
    (Array.isArray(mappings) ? mappings : []).forEach((mapping) => {
      const layer = Number(mapping.layer);
      const colorCode = String(mapping.colorCode || '').trim();
      if (Number.isFinite(layer) && layer > 0) {
        payload.push({ layer, colorCode });
      }
    });
    return payload.sort((a, b) => a.layer - b.layer);
  }

  window.ArtworkSchemeUtils = {
    normalizeMappings,
    groupByColor,
    groupedByColorWithFlags,
    duplicateLayerSet,
    buildLayerPayload
  };
})(window);
