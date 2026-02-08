(function (window) {
  function getClient() {
    if (!window.httpClient) {
      throw new Error('httpClient is required before api-gateway.js');
    }
    return window.httpClient;
  }

  function getBaseURL(baseURL) {
    return getClient().normalizeBase(baseURL || window.location.origin);
  }

  function withBase(baseURL, path) {
    return `${getBaseURL(baseURL)}${path}`;
  }

  function withCacheBypass(params, bypassCache) {
    if (!bypassCache) {
      return params || undefined;
    }
    return Object.assign({}, params || {}, { _: Date.now() });
  }

  const apiGateway = {
    config: {
      get: (baseURL) => getClient().get(withBase(baseURL, '/api/config')),
    },
    categories: {
      getAll: (baseURL) => getClient().get(withBase(baseURL, '/api/categories')),
      create: (baseURL, data) => getClient().post(withBase(baseURL, '/api/categories'), data),
      update: (baseURL, id, data) => getClient().put(withBase(baseURL, `/api/categories/${id}`), data),
      remove: (baseURL, id) => getClient().delete(withBase(baseURL, `/api/categories/${id}`)),
      reorder: (baseURL, updates) => getClient().put(withBase(baseURL, '/api/categories/reorder'), updates),
    },
    montMarteCategories: {
      getAll: (baseURL) => getClient().get(withBase(baseURL, '/api/mont-marte-categories')),
      create: (baseURL, data) => getClient().post(withBase(baseURL, '/api/mont-marte-categories'), data),
      update: (baseURL, id, data) =>
        getClient().put(withBase(baseURL, `/api/mont-marte-categories/${id}`), data),
      remove: (baseURL, id) => getClient().delete(withBase(baseURL, `/api/mont-marte-categories/${id}`)),
      reorder: (baseURL, updates) =>
        getClient().put(withBase(baseURL, '/api/mont-marte-categories/reorder'), updates),
    },
    customColors: {
      getAll: (baseURL, options = {}) => {
        const params = withCacheBypass(options.params, options.bypassCache);
        const config = Object.assign({}, options);
        delete config.params;
        delete config.bypassCache;
        if (params) {
          config.params = params;
        }
        return getClient().get(withBase(baseURL, '/api/custom-colors'), config);
      },
      create: (baseURL, formData) => getClient().postMultipart(withBase(baseURL, '/api/custom-colors'), formData),
      update: (baseURL, id, formData) =>
        getClient().putMultipart(withBase(baseURL, `/api/custom-colors/${id}`), formData),
      remove: (baseURL, id) => getClient().delete(withBase(baseURL, `/api/custom-colors/${id}`)),
      getHistory: (baseURL, id) => getClient().get(withBase(baseURL, `/api/custom-colors/${id}/history`)),
      forceMerge: (baseURL, payload) => getClient().post(withBase(baseURL, '/api/custom-colors/force-merge'), payload),
    },
    artworks: {
      getAll: (baseURL) => getClient().get(withBase(baseURL, '/api/artworks')),
      get: (baseURL, id) => getClient().get(withBase(baseURL, `/api/artworks/${id}`)),
      create: (baseURL, data) => getClient().post(withBase(baseURL, '/api/artworks'), data),
      update: (baseURL, id, data) => getClient().put(withBase(baseURL, `/api/artworks/${id}`), data),
      remove: (baseURL, id) => getClient().delete(withBase(baseURL, `/api/artworks/${id}`)),
      addScheme: (baseURL, artworkId, formData) =>
        getClient().postMultipart(withBase(baseURL, `/api/artworks/${artworkId}/schemes`), formData),
      updateScheme: (baseURL, artworkId, schemeId, formData) =>
        getClient().putMultipart(withBase(baseURL, `/api/artworks/${artworkId}/schemes/${schemeId}`), formData),
      deleteScheme: (baseURL, artworkId, schemeId) =>
        getClient().delete(withBase(baseURL, `/api/artworks/${artworkId}/schemes/${schemeId}`)),
    },
    montMarteColors: {
      getAll: (baseURL) => getClient().get(withBase(baseURL, '/api/mont-marte-colors')),
      create: (baseURL, formData) =>
        getClient().postMultipart(withBase(baseURL, '/api/mont-marte-colors'), formData),
      update: (baseURL, id, formData) =>
        getClient().putMultipart(withBase(baseURL, `/api/mont-marte-colors/${id}`), formData),
      remove: (baseURL, id) => getClient().delete(withBase(baseURL, `/api/mont-marte-colors/${id}`)),
    },
    dictionaries: {
      listSuppliers: (baseURL) => getClient().get(withBase(baseURL, '/api/suppliers')),
      upsertSupplier: (baseURL, name) => getClient().post(withBase(baseURL, '/api/suppliers/upsert'), { name }),
      deleteSupplier: (baseURL, id) => getClient().delete(withBase(baseURL, `/api/suppliers/${id}`)),
      listPurchaseLinks: (baseURL) => getClient().get(withBase(baseURL, '/api/purchase-links')),
      upsertPurchaseLink: (baseURL, url) =>
        getClient().post(withBase(baseURL, '/api/purchase-links/upsert'), { url }),
    },
  };

  window.apiGateway = apiGateway;
})(window);
