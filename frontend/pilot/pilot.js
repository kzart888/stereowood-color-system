(async function () {
  const runtimeEl = document.getElementById('runtime-status');
  const summaryEl = document.getElementById('endpoint-summary');
  const panelsEl = document.getElementById('sample-panels');

  function appendKV(listEl, key, value, isError) {
    const li = document.createElement('li');
    const keySpan = document.createElement('span');
    keySpan.className = 'key';
    keySpan.textContent = key;
    const valueSpan = document.createElement('span');
    valueSpan.className = isError ? 'value error' : 'value';
    valueSpan.textContent = value;
    li.appendChild(keySpan);
    li.appendChild(valueSpan);
    listEl.appendChild(li);
  }

  function createPanel(title, content) {
    const panel = document.createElement('div');
    panel.className = 'sample-panel';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const pre = document.createElement('pre');
    pre.textContent = content;
    panel.appendChild(h3);
    panel.appendChild(pre);
    return panel;
  }

  async function getJson(url) {
    const response = await fetch(url);
    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      data,
    };
  }

  const endpoints = [
    { key: '/health', url: '/health' },
    { key: '/api/config', url: '/api/config' },
    { key: '/api/custom-colors', url: '/api/custom-colors' },
    { key: '/api/categories', url: '/api/categories' },
    { key: '/api/suppliers', url: '/api/suppliers' },
    { key: '/api/purchase-links', url: '/api/purchase-links' },
  ];

  try {
    appendKV(runtimeEl, 'Pilot URL', window.location.href);
    appendKV(runtimeEl, 'UTC Time', new Date().toISOString());

    const results = await Promise.all(
      endpoints.map(async (endpoint) => ({
        endpoint: endpoint.key,
        result: await getJson(endpoint.url),
      })),
    );

    const configResult = results.find((item) => item.endpoint === '/api/config');
    const config = configResult && configResult.result && configResult.result.data;
    if (config && config.features) {
      appendKV(runtimeEl, 'mode', String(config.mode || 'unknown'));
      appendKV(runtimeEl, 'pilotExplorer', String(!!config.features.pilotExplorer));
    }

    results.forEach(({ endpoint, result }) => {
      const statusText = `${result.status} (${result.ok ? 'OK' : 'FAIL'})`;
      appendKV(summaryEl, endpoint, statusText, !result.ok);
    });

    results
      .filter(({ endpoint }) => endpoint.startsWith('/api/'))
      .forEach(({ endpoint, result }) => {
        const payload = result.data;
        const sample = Array.isArray(payload) ? payload.slice(0, 5) : payload;
        panelsEl.appendChild(createPanel(endpoint, JSON.stringify(sample, null, 2)));
      });
  } catch (error) {
    appendKV(summaryEl, 'pilot-loader', `FAIL: ${error.message}`, true);
  }
})();
