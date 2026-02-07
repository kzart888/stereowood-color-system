(function (window) {
  function parseFormulaLines(formula) {
    const str = String(formula || '').trim();
    if (!str) return [];

    const parts = str.split(/\s+/);
    const lines = [];
    let buffer = null;

    for (const token of parts) {
      const amountMatch = token.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
      if (amountMatch && buffer) {
        lines.push(`${buffer} ${amountMatch[1]}${amountMatch[2]}`);
        buffer = null;
      } else {
        if (buffer) lines.push(buffer);
        buffer = token;
      }
    }

    if (buffer) lines.push(buffer);
    return lines;
  }

  window.ArtworksFormulaView = {
    parseFormulaLines,
  };
})(window);
