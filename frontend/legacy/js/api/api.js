(function (window) {
  function getGateway() {
    if (window.apiGateway) {
      return window.apiGateway;
    }
    throw new Error('apiGateway is required before api.js');
  }

  function getBaseURL() {
    return String(window.location.origin || '').replace(/\/$/, '');
  }

  const compatApi = {
    categories: {
      getAll: () => getGateway().categories.getAll(getBaseURL()),
      create: (data) => getGateway().categories.create(getBaseURL(), data),
      update: (id, data) => getGateway().categories.update(getBaseURL(), id, data),
      delete: (id) => getGateway().categories.remove(getBaseURL(), id),
      reorder: (updates) => getGateway().categories.reorder(getBaseURL(), updates),
    },
    montMarteCategories: {
      getAll: () => getGateway().montMarteCategories.getAll(getBaseURL()),
      create: (data) => getGateway().montMarteCategories.create(getBaseURL(), data),
      update: (id, data) => getGateway().montMarteCategories.update(getBaseURL(), id, data),
      delete: (id) => getGateway().montMarteCategories.remove(getBaseURL(), id),
      reorder: (updates) => getGateway().montMarteCategories.reorder(getBaseURL(), updates),
    },
    customColors: {
      getAll: (options = {}) => getGateway().customColors.getAll(getBaseURL(), options),
      create: (formData) => getGateway().customColors.create(getBaseURL(), formData),
      update: (id, formData) => getGateway().customColors.update(getBaseURL(), id, formData),
      delete: (id) => getGateway().customColors.remove(getBaseURL(), id),
      getHistory: (id) => getGateway().customColors.getHistory(getBaseURL(), id),
      forceMerge: (payload) => getGateway().customColors.forceMerge(getBaseURL(), payload),
    },
    artworks: {
      getAll: () => getGateway().artworks.getAll(getBaseURL()),
      get: (id) => getGateway().artworks.get(getBaseURL(), id),
      create: (data) => getGateway().artworks.create(getBaseURL(), data),
      update: (id, data) => getGateway().artworks.update(getBaseURL(), id, data),
      delete: (id) => getGateway().artworks.remove(getBaseURL(), id),
      addScheme: (artworkId, formData) => getGateway().artworks.addScheme(getBaseURL(), artworkId, formData),
      updateScheme: (artworkId, schemeId, formData) =>
        getGateway().artworks.updateScheme(getBaseURL(), artworkId, schemeId, formData),
      deleteScheme: (artworkId, schemeId) =>
        getGateway().artworks.deleteScheme(getBaseURL(), artworkId, schemeId),
      listSchemeAssets: (artworkId, schemeId) =>
        getGateway().artworks.listSchemeAssets(getBaseURL(), artworkId, schemeId),
      addSchemeAsset: (artworkId, schemeId, formData) =>
        getGateway().artworks.addSchemeAsset(getBaseURL(), artworkId, schemeId, formData),
      deleteSchemeAsset: (artworkId, schemeId, assetId) =>
        getGateway().artworks.deleteSchemeAsset(getBaseURL(), artworkId, schemeId, assetId),
      reorderSchemeAssets: (artworkId, schemeId, orderedIds) =>
        getGateway().artworks.reorderSchemeAssets(getBaseURL(), artworkId, schemeId, orderedIds),
    },
    montMarteColors: {
      getAll: () => getGateway().montMarteColors.getAll(getBaseURL()),
      create: (formData) => getGateway().montMarteColors.create(getBaseURL(), formData),
      update: (id, formData) => getGateway().montMarteColors.update(getBaseURL(), id, formData),
      delete: (id) => getGateway().montMarteColors.remove(getBaseURL(), id),
    },
    dictionaries: {
      listSuppliers: () => getGateway().dictionaries.listSuppliers(getBaseURL()),
      upsertSupplier: (name) => getGateway().dictionaries.upsertSupplier(getBaseURL(), name),
      deleteSupplier: (id) => getGateway().dictionaries.deleteSupplier(getBaseURL(), id),
      listPurchaseLinks: () => getGateway().dictionaries.listPurchaseLinks(getBaseURL()),
      upsertPurchaseLink: (url) => getGateway().dictionaries.upsertPurchaseLink(getBaseURL(), url),
    },
    pilotDictionaries: {
      upsertSupplier: (name) => getGateway().pilotDictionaries.upsertSupplier(getBaseURL(), name),
      deleteSupplier: (id) => getGateway().pilotDictionaries.deleteSupplier(getBaseURL(), id),
      upsertPurchaseLink: (url) => getGateway().pilotDictionaries.upsertPurchaseLink(getBaseURL(), url),
    },
    history: {
      feed: (params = {}) => getGateway().history.feed(getBaseURL(), params),
      timeline: (entityType, entityId, limit = 50) =>
        getGateway().history.timeline(getBaseURL(), entityType, entityId, limit),
    },
    auth: {
      registerRequest: (payload) => getGateway().auth.registerRequest(getBaseURL(), payload),
      login: (payload) => getGateway().auth.login(getBaseURL(), payload),
      logout: () => getGateway().auth.logout(getBaseURL()),
      changePassword: (payload) => getGateway().auth.changePassword(getBaseURL(), payload),
      me: () => getGateway().auth.me(getBaseURL()),
      listPending: (adminKey = '') => getGateway().auth.listPending(getBaseURL(), adminKey),
      listAccounts: (adminKey = '', params = {}) => getGateway().auth.listAccounts(getBaseURL(), adminKey, params),
      createAccount: (adminKey = '', payload) => getGateway().auth.createAccount(getBaseURL(), adminKey, payload),
      approveRequest: (adminKey = '', accountId) => getGateway().auth.approveRequest(getBaseURL(), adminKey, accountId),
      rejectRequest: (adminKey = '', accountId, reason) =>
        getGateway().auth.rejectRequest(getBaseURL(), adminKey, accountId, reason),
      resetPassword: (adminKey = '', accountId, password) =>
        getGateway().auth.resetPassword(getBaseURL(), adminKey, accountId, password),
      resetPasswordBatch: (adminKey = '', payload) =>
        getGateway().auth.resetPasswordBatch(getBaseURL(), adminKey, payload),
      disableAccount: (adminKey = '', accountId, reason) =>
        getGateway().auth.disableAccount(getBaseURL(), adminKey, accountId, reason),
      enableAccount: (adminKey = '', accountId) => getGateway().auth.enableAccount(getBaseURL(), adminKey, accountId),
      deleteAccount: (adminKey = '', accountId) => getGateway().auth.deleteAccount(getBaseURL(), adminKey, accountId),
      revokeSessions: (adminKey = '', accountId) => getGateway().auth.revokeSessions(getBaseURL(), adminKey, accountId),
      promoteAdmin: (adminKey = '', accountId) => getGateway().auth.promoteAdmin(getBaseURL(), adminKey, accountId),
      demoteAdmin: (adminKey = '', accountId) => getGateway().auth.demoteAdmin(getBaseURL(), adminKey, accountId),
      getRuntimeFlags: (adminKey = '') => getGateway().auth.getRuntimeFlags(getBaseURL(), adminKey),
      setRuntimeFlags: (adminKey = '', payload) => getGateway().auth.setRuntimeFlags(getBaseURL(), adminKey, payload),
    },
    config: {
      get: () => getGateway().config.get(getBaseURL()),
    },
  };

  window.api = compatApi;
  window.legacyApi = compatApi;
})(window);
