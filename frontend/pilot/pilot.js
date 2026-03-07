(async function () {
  const runtimeEl = document.getElementById('runtime-status');
  const summaryEl = document.getElementById('endpoint-summary');
  const panelsEl = document.getElementById('sample-panels');
  const authForm = document.getElementById('auth-form');
  const authStatusEl = document.getElementById('auth-status');
  const writeStatusEl = document.getElementById('write-status');
  const writeDisabledNoteEl = document.getElementById('write-disabled-note');
  const supplierForm = document.getElementById('supplier-form');
  const supplierNameEl = document.getElementById('supplier-name');
  const purchaseLinkForm = document.getElementById('purchase-link-form');
  const purchaseLinkUrlEl = document.getElementById('purchase-link-url');
  const supplierDeleteForm = document.getElementById('supplier-delete-form');
  const supplierDeleteIdEl = document.getElementById('supplier-delete-id');

  const TOKEN_KEY = 'sw-pilot-token';
  const state = {
    token: null,
    user: null,
    session: null,
    config: null,
    suppliers: [],
    purchaseLinks: [],
  };

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

  function clearEl(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function getStoredToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  }

  function setStoredToken(token) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // ignore storage failures
    }
  }

  function isPilotWriteEnabled() {
    return !!(state.config && state.config.features && state.config.features.pilotDictionaryWrite);
  }

  function setWriteStatus(text, isError) {
    writeStatusEl.textContent = text;
    writeStatusEl.classList.toggle('error', !!isError);
  }

  function renderAuthStatus() {
    if (!state.user) {
      authStatusEl.textContent = '未登录';
      authStatusEl.classList.remove('error');
      return;
    }

    const expiresAt = state.session && state.session.expires_at ? `，过期: ${state.session.expires_at}` : '';
    authStatusEl.textContent = `已登录: ${state.user.username}${expiresAt}`;
    authStatusEl.classList.remove('error');
  }

  function renderSupplierDeleteOptions() {
    clearEl(supplierDeleteIdEl);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = state.suppliers.length ? '请选择 supplier' : '暂无 supplier';
    supplierDeleteIdEl.appendChild(placeholder);

    state.suppliers.forEach((item) => {
      const option = document.createElement('option');
      option.value = String(item.id);
      option.textContent = `${item.id} - ${item.name}`;
      supplierDeleteIdEl.appendChild(option);
    });
  }

  function syncWriteFormsAvailability() {
    const canWrite = isPilotWriteEnabled() && !!state.user;
    const controls = [
      supplierNameEl,
      purchaseLinkUrlEl,
      supplierDeleteIdEl,
      ...supplierForm.querySelectorAll('button'),
      ...purchaseLinkForm.querySelectorAll('button'),
      ...supplierDeleteForm.querySelectorAll('button'),
    ];

    controls.forEach((el) => {
      el.disabled = !canWrite;
    });

    writeDisabledNoteEl.hidden = isPilotWriteEnabled();

    if (!isPilotWriteEnabled()) {
      setWriteStatus('写入开关关闭：当前仅可读。', false);
      return;
    }

    if (!state.user) {
      setWriteStatus('请先登录后再执行写入。', false);
      return;
    }

    setWriteStatus('写入已就绪。', false);
  }

  async function requestJson(url, options = {}) {
    const method = options.method || 'GET';
    const useAuth = !!options.auth;
    const headers = Object.assign({}, options.headers || {});

    if (options.body !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    if (useAuth && state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

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
      data,
      text,
      headers: response.headers,
    };
  }

  async function refreshAuthSession() {
    if (!state.token) {
      state.user = null;
      state.session = null;
      renderAuthStatus();
      syncWriteFormsAvailability();
      return;
    }

    try {
      const me = await requestJson('/api/auth/me', { auth: true });
      if (!me.ok || !me.data || !me.data.user) {
        state.token = null;
        setStoredToken(null);
        state.user = null;
        state.session = null;
      } else {
        state.user = me.data.user;
        state.session = me.data.session || null;
      }
    } catch {
      state.token = null;
      setStoredToken(null);
      state.user = null;
      state.session = null;
    }

    renderAuthStatus();
    syncWriteFormsAvailability();
  }

  async function refreshReadModels() {
    const [suppliersResp, linksResp] = await Promise.all([
      requestJson('/api/suppliers'),
      requestJson('/api/purchase-links'),
    ]);

    state.suppliers = suppliersResp.ok && Array.isArray(suppliersResp.data) ? suppliersResp.data : [];
    state.purchaseLinks = linksResp.ok && Array.isArray(linksResp.data) ? linksResp.data : [];
    renderSupplierDeleteOptions();
  }

  async function renderSummaryAndPanels() {
    clearEl(summaryEl);
    clearEl(panelsEl);

    const endpoints = [
      { key: '/health', url: '/health' },
      { key: '/api/config', url: '/api/config' },
      { key: '/api/custom-colors', url: '/api/custom-colors' },
      { key: '/api/categories', url: '/api/categories' },
      { key: '/api/suppliers', url: '/api/suppliers' },
      { key: '/api/purchase-links', url: '/api/purchase-links' },
      { key: '/api/history/feed?tab=mont-marte', url: '/api/history/feed?tab=mont-marte&page=1&pageSize=5' },
    ];

    const results = await Promise.all(
      endpoints.map(async (endpoint) => ({
        endpoint: endpoint.key,
        result: await requestJson(endpoint.url),
      })),
    );

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
  }

  async function refreshRuntime() {
    clearEl(runtimeEl);
    appendKV(runtimeEl, 'Pilot URL', window.location.href);
    appendKV(runtimeEl, 'UTC Time', new Date().toISOString());

    const configResp = await requestJson('/api/config');
    if (configResp.ok && configResp.data && typeof configResp.data === 'object') {
      state.config = configResp.data;
      appendKV(runtimeEl, 'mode', String(configResp.data.mode || 'unknown'));
      appendKV(runtimeEl, 'pilotExplorer', String(!!(configResp.data.features && configResp.data.features.pilotExplorer)));
      appendKV(runtimeEl, 'pilotDictionaryWrite', String(!!(configResp.data.features && configResp.data.features.pilotDictionaryWrite)));
      appendKV(runtimeEl, 'authEnforceWrites', String(!!(configResp.data.features && configResp.data.features.authEnforceWrites)));
      appendKV(runtimeEl, 'readOnlyMode', String(!!(configResp.data.features && configResp.data.features.readOnlyMode)));
    } else {
      appendKV(runtimeEl, 'config', `FAIL ${configResp.status}`, true);
      state.config = null;
    }

    syncWriteFormsAvailability();
  }

  async function refreshAllReadData() {
    await Promise.all([refreshRuntime(), refreshReadModels(), renderSummaryAndPanels(), refreshAuthSession()]);
  }

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = String(document.getElementById('auth-username').value || '').trim();
    const password = String(document.getElementById('auth-password').value || '');

    if (!username || !password) {
      authStatusEl.textContent = '请输入用户名和密码。';
      authStatusEl.classList.add('error');
      return;
    }

    authStatusEl.classList.remove('error');
    authStatusEl.textContent = '登录中...';

    try {
      const login = await requestJson('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      });

      if (!login.ok || !login.data || !login.data.token) {
        const reason = login.data && login.data.error ? login.data.error : `登录失败 (${login.status})`;
        authStatusEl.textContent = reason;
        authStatusEl.classList.add('error');
        return;
      }

      state.token = login.data.token;
      setStoredToken(state.token);
      state.user = login.data.user || null;
      state.session = {
        expires_at: login.data.expires_at || null,
      };
      renderAuthStatus();
      syncWriteFormsAvailability();
      setWriteStatus('登录成功，可执行试点写入。', false);
    } catch (error) {
      authStatusEl.textContent = `登录异常: ${error.message}`;
      authStatusEl.classList.add('error');
    }
  });

  document.getElementById('auth-logout').addEventListener('click', async () => {
    try {
      if (state.token) {
        await requestJson('/api/auth/logout', { method: 'POST', body: {}, auth: true });
      }
    } catch {
      // ignore logout network errors
    }

    state.token = null;
    state.user = null;
    state.session = null;
    setStoredToken(null);
    renderAuthStatus();
    syncWriteFormsAvailability();
    setWriteStatus('已登出。', false);
  });

  supplierForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = String(supplierNameEl.value || '').trim();
    if (!name) {
      setWriteStatus('请输入 supplier 名称。', true);
      return;
    }

    try {
      const response = await requestJson('/api/pilot/dictionaries/suppliers/upsert', {
        method: 'POST',
        body: { name },
        auth: true,
      });
      if (!response.ok) {
        const reason = response.data && response.data.error ? response.data.error : `请求失败 (${response.status})`;
        setWriteStatus(`Supplier upsert 失败: ${reason}`, true);
        return;
      }

      supplierNameEl.value = '';
      await refreshReadModels();
      await renderSummaryAndPanels();
      setWriteStatus('Supplier upsert 成功。', false);
    } catch (error) {
      setWriteStatus(`Supplier upsert 异常: ${error.message}`, true);
    }
  });

  purchaseLinkForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = String(purchaseLinkUrlEl.value || '').trim();
    if (!url) {
      setWriteStatus('请输入 purchase link URL。', true);
      return;
    }

    try {
      const response = await requestJson('/api/pilot/dictionaries/purchase-links/upsert', {
        method: 'POST',
        body: { url },
        auth: true,
      });
      if (!response.ok) {
        const reason = response.data && response.data.error ? response.data.error : `请求失败 (${response.status})`;
        setWriteStatus(`Purchase link upsert 失败: ${reason}`, true);
        return;
      }

      purchaseLinkUrlEl.value = '';
      await refreshReadModels();
      await renderSummaryAndPanels();
      setWriteStatus('Purchase link upsert 成功。', false);
    } catch (error) {
      setWriteStatus(`Purchase link upsert 异常: ${error.message}`, true);
    }
  });

  supplierDeleteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = String(supplierDeleteIdEl.value || '').trim();
    if (!id) {
      setWriteStatus('请选择要删除的 supplier。', true);
      return;
    }

    try {
      const response = await requestJson(`/api/pilot/dictionaries/suppliers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        auth: true,
      });

      if (!response.ok) {
        const reason = response.data && response.data.error ? response.data.error : `请求失败 (${response.status})`;
        setWriteStatus(`删除 supplier 失败: ${reason}`, true);
        return;
      }

      await refreshReadModels();
      await renderSummaryAndPanels();
      setWriteStatus('删除 supplier 成功。', false);
    } catch (error) {
      setWriteStatus(`删除 supplier 异常: ${error.message}`, true);
    }
  });

  try {
    state.token = getStoredToken();
    await refreshAllReadData();
  } catch (error) {
    appendKV(summaryEl, 'pilot-loader', `FAIL: ${error.message}`, true);
    setWriteStatus(`初始化失败: ${error.message}`, true);
  }
})();
