(function (window) {
  function getGateway() {
    const bridge = window.runtimeBridge || {};
    return bridge.apiGateway || window.apiGateway || window.api || null;
  }

  function getLegacyApi() {
    return window.api || null;
  }

  function getBaseURL(baseURL) {
    return String(baseURL || window.location.origin || '').replace(/\/$/, '');
  }

  function getErrorPayload(error) {
    const status = error && error.response ? error.response.status : null;
    const message =
      (error && error.response && error.response.data && error.response.data.error) ||
      (error && error.message) ||
      '';
    return { status, message };
  }

  async function createArtwork(options = {}) {
    const baseURL = getBaseURL(options.baseURL);
    const payload = {
      code: String(options.code || '').trim(),
      name: String(options.name || '').trim(),
    };
    const gateway = getGateway();
    if (gateway && gateway === window.apiGateway && gateway.artworks && typeof gateway.artworks.create === 'function') {
      return gateway.artworks.create(baseURL, payload);
    }
    const legacyApi = getLegacyApi();
    if (legacyApi && legacyApi.artworks && typeof legacyApi.artworks.create === 'function') {
      return legacyApi.artworks.create(payload);
    }
    return axios.post(`${baseURL}/api/artworks`, payload);
  }

  async function saveScheme(options = {}) {
    const baseURL = getBaseURL(options.baseURL);
    const artId = options.artId;
    const schemeId = options.schemeId || null;
    const formData = options.formData;

    if (!artId || !formData) {
      throw new Error('artId and formData are required');
    }

    const gateway = getGateway();

    if (schemeId) {
      if (gateway && gateway === window.apiGateway && gateway.artworks && typeof gateway.artworks.updateScheme === 'function') {
        return gateway.artworks.updateScheme(baseURL, artId, schemeId, formData);
      }
      const legacyApi = getLegacyApi();
      if (legacyApi && legacyApi.artworks && typeof legacyApi.artworks.updateScheme === 'function') {
        return legacyApi.artworks.updateScheme(artId, schemeId, formData);
      }
      return axios.put(`${baseURL}/api/artworks/${artId}/schemes/${schemeId}`, formData);
    }

    if (gateway && gateway === window.apiGateway && gateway.artworks && typeof gateway.artworks.addScheme === 'function') {
      return gateway.artworks.addScheme(baseURL, artId, formData);
    }
    const legacyApi = getLegacyApi();
    if (legacyApi && legacyApi.artworks && typeof legacyApi.artworks.addScheme === 'function') {
      return legacyApi.artworks.addScheme(artId, formData);
    }
    return axios.post(`${baseURL}/api/artworks/${artId}/schemes`, formData);
  }

  async function deleteScheme(options = {}) {
    const baseURL = getBaseURL(options.baseURL);
    const artId = options.artId;
    const schemeId = options.schemeId;
    if (!artId || !schemeId) {
      throw new Error('artId and schemeId are required');
    }
    const gateway = getGateway();
    if (gateway && gateway === window.apiGateway && gateway.artworks && typeof gateway.artworks.deleteScheme === 'function') {
      return gateway.artworks.deleteScheme(baseURL, artId, schemeId);
    }
    const legacyApi = getLegacyApi();
    if (legacyApi && legacyApi.artworks && typeof legacyApi.artworks.deleteScheme === 'function') {
      return legacyApi.artworks.deleteScheme(artId, schemeId);
    }
    return axios.delete(`${baseURL}/api/artworks/${artId}/schemes/${schemeId}`);
  }

  async function deleteArtwork(options = {}) {
    const baseURL = getBaseURL(options.baseURL);
    const artId = options.artId;
    if (!artId) {
      throw new Error('artId is required');
    }
    const gateway = getGateway();
    if (gateway && gateway === window.apiGateway && gateway.artworks && typeof gateway.artworks.remove === 'function') {
      return gateway.artworks.remove(baseURL, artId);
    }
    const legacyApi = getLegacyApi();
    if (legacyApi && legacyApi.artworks && typeof legacyApi.artworks.delete === 'function') {
      return legacyApi.artworks.delete(artId);
    }
    return axios.delete(`${baseURL}/api/artworks/${artId}`);
  }

  window.ArtworksApi = {
    createArtwork,
    saveScheme,
    deleteScheme,
    deleteArtwork,
    getErrorPayload,
  };
})(window);
