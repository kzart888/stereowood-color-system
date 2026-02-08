(function (window) {
  const KIND_SUPPLIER = 'supplier';
  const KIND_PURCHASE_LINK = 'purchase-link';

  const CONFIG = {
    [KIND_SUPPLIER]: {
      upsertPath: '/api/suppliers/upsert',
      deletePathPrefix: '/api/suppliers/',
      payloadKey: 'name',
    },
    [KIND_PURCHASE_LINK]: {
      upsertPath: '/api/purchase-links/upsert',
      deletePathPrefix: '/api/purchase-links/',
      payloadKey: 'url',
    },
  };

  function getBaseURL(baseURL) {
    return String(baseURL || window.location.origin || '').replace(/\/$/, '');
  }

  function getConfig(kind) {
    const value = CONFIG[kind];
    if (!value) {
      throw new Error(`Unsupported dictionary kind: ${kind}`);
    }
    return value;
  }

  function normalizeInput(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  function shouldCreateFromSelection(value) {
    return typeof value === 'string';
  }

  async function upsertEntry(options = {}) {
    const kind = options.kind;
    const rawValue = options.value;
    const config = getConfig(kind);
    const normalized = normalizeInput(rawValue);
    if (!normalized) {
      return { id: null, data: null, normalizedValue: normalized };
    }

    const baseURL = getBaseURL(options.baseURL);
    const payload = { [config.payloadKey]: normalized };
    const response = await axios.post(`${baseURL}${config.upsertPath}`, payload);
    const data = response && response.data ? response.data : null;
    const id = data && Object.prototype.hasOwnProperty.call(data, 'id') ? data.id : null;

    return { id, data, normalizedValue: normalized };
  }

  async function deleteEntry(options = {}) {
    const kind = options.kind;
    const id = options.id;
    const config = getConfig(kind);
    const baseURL = getBaseURL(options.baseURL);
    return axios.delete(`${baseURL}${config.deletePathPrefix}${id}`);
  }

  function getErrorStatus(error) {
    return error && error.response ? error.response.status : null;
  }

  function getErrorMessage(error, fallbackMessage) {
    return (
      (error && error.response && error.response.data && error.response.data.error) ||
      (error && error.message) ||
      fallbackMessage ||
      ''
    );
  }

  window.MontMarteDictionaryManager = {
    KIND_SUPPLIER,
    KIND_PURCHASE_LINK,
    normalizeInput,
    shouldCreateFromSelection,
    upsertEntry,
    deleteEntry,
    getErrorStatus,
    getErrorMessage,
  };
})(window);
