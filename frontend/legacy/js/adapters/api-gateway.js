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

  function withAdminKey(adminKey, config = {}) {
    return Object.assign({}, config, {
      headers: Object.assign({}, config.headers || {}, { 'x-admin-key': adminKey }),
    });
  }

  function withOptionalAdminKey(adminKey, config = {}) {
    if (typeof adminKey === 'string' && adminKey.trim() !== '') {
      return withAdminKey(adminKey, config);
    }
    return Object.assign({}, config);
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
      listSchemeAssets: (baseURL, artworkId, schemeId) =>
        getClient().get(withBase(baseURL, `/api/artworks/${artworkId}/schemes/${schemeId}/assets`)),
      addSchemeAsset: (baseURL, artworkId, schemeId, formData) =>
        getClient().postMultipart(withBase(baseURL, `/api/artworks/${artworkId}/schemes/${schemeId}/assets`), formData),
      deleteSchemeAsset: (baseURL, artworkId, schemeId, assetId) =>
        getClient().delete(withBase(baseURL, `/api/artworks/${artworkId}/schemes/${schemeId}/assets/${assetId}`)),
      reorderSchemeAssets: (baseURL, artworkId, schemeId, orderedIds) =>
        getClient().put(withBase(baseURL, `/api/artworks/${artworkId}/schemes/${schemeId}/assets/reorder`), { orderedIds }),
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
    pilotDictionaries: {
      upsertSupplier: (baseURL, name) =>
        getClient().post(withBase(baseURL, '/api/pilot/dictionaries/suppliers/upsert'), { name }),
      deleteSupplier: (baseURL, id) =>
        getClient().delete(withBase(baseURL, `/api/pilot/dictionaries/suppliers/${id}`)),
      upsertPurchaseLink: (baseURL, url) =>
        getClient().post(withBase(baseURL, '/api/pilot/dictionaries/purchase-links/upsert'), { url }),
    },
    history: {
      feed: (baseURL, params = {}) =>
        getClient().get(withBase(baseURL, '/api/history/feed'), { params }),
      timeline: (baseURL, entityType, entityId, limit = 50) =>
        getClient().get(withBase(baseURL, `/api/history/${entityType}/${entityId}`), { params: { limit } }),
    },
    auth: {
      registerRequest: (baseURL, payload) => getClient().post(withBase(baseURL, '/api/auth/register-request'), payload),
      login: (baseURL, payload) => getClient().post(withBase(baseURL, '/api/auth/login'), payload),
      logout: (baseURL) => getClient().post(withBase(baseURL, '/api/auth/logout'), {}),
      changePassword: (baseURL, payload) =>
        getClient().post(withBase(baseURL, '/api/auth/change-password'), payload),
      me: (baseURL) => getClient().get(withBase(baseURL, '/api/auth/me')),
      listPending: (baseURL, adminKey) =>
        getClient().get(withBase(baseURL, '/api/auth/admin/pending'), withOptionalAdminKey(adminKey)),
      listAccounts: (baseURL, adminKey, params = {}) =>
        getClient().get(
          withBase(baseURL, '/api/auth/admin/accounts'),
          withOptionalAdminKey(adminKey, { params })
        ),
      createAccount: (baseURL, adminKey, payload) =>
        getClient().post(
          withBase(baseURL, '/api/auth/admin/accounts'),
          payload,
          withOptionalAdminKey(adminKey)
        ),
      approveRequest: (baseURL, adminKey, accountId) =>
        getClient().post(
          withBase(baseURL, `/api/auth/admin/requests/${accountId}/approve`),
          {},
          withOptionalAdminKey(adminKey)
        ),
      rejectRequest: (baseURL, adminKey, accountId, reason) =>
        getClient().post(
          withBase(baseURL, `/api/auth/admin/requests/${accountId}/reject`),
          { reason: reason || null },
          withOptionalAdminKey(adminKey)
        ),
      resetPassword: (baseURL, adminKey, accountId, password) =>
        getClient().post(
          withBase(baseURL, `/api/auth/admin/accounts/${accountId}/reset-password`),
          password ? { password } : {},
          withOptionalAdminKey(adminKey)
        ),
      resetPasswordBatch: (baseURL, adminKey, payload) =>
        getClient().post(
          withBase(baseURL, '/api/auth/admin/accounts/reset-password-batch'),
          payload,
          withOptionalAdminKey(adminKey)
        ),
      disableAccount: (baseURL, adminKey, accountId, reason) =>
        getClient().post(
          withBase(baseURL, `/api/auth/admin/accounts/${accountId}/disable`),
          { reason: reason || null },
          withOptionalAdminKey(adminKey)
        ),
      enableAccount: (baseURL, adminKey, accountId) =>
        getClient().post(
          withBase(baseURL, `/api/auth/admin/accounts/${accountId}/enable`),
          {},
          withOptionalAdminKey(adminKey)
        ),
      deleteAccount: (baseURL, adminKey, accountId) =>
        getClient().delete(
          withBase(baseURL, `/api/auth/admin/accounts/${accountId}`),
          withOptionalAdminKey(adminKey)
        ),
      revokeSessions: (baseURL, adminKey, accountId) =>
        getClient().post(
          withBase(baseURL, `/api/auth/admin/accounts/${accountId}/revoke-sessions`),
          {},
          withOptionalAdminKey(adminKey)
        ),
      promoteAdmin: (baseURL, adminKey, accountId) =>
        getClient().post(
          withBase(baseURL, `/api/auth/admin/accounts/${accountId}/promote-admin`),
          {},
          withOptionalAdminKey(adminKey)
        ),
      demoteAdmin: (baseURL, adminKey, accountId) =>
        getClient().post(
          withBase(baseURL, `/api/auth/admin/accounts/${accountId}/demote-admin`),
          {},
          withOptionalAdminKey(adminKey)
        ),
      getRuntimeFlags: (baseURL, adminKey) =>
        getClient().get(withBase(baseURL, '/api/auth/admin/runtime-flags'), withOptionalAdminKey(adminKey)),
      setRuntimeFlags: (baseURL, adminKey, payload) =>
        getClient().post(
          withBase(baseURL, '/api/auth/admin/runtime-flags'),
          payload,
          withOptionalAdminKey(adminKey)
        ),
    },
  };

  window.apiGateway = apiGateway;
})(window);
