(function (window) {
  function getGateway() {
    const bridge = window.runtimeBridge || {};
    return bridge.apiGateway || window.apiGateway || null;
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
    if (gateway && gateway.artworks && typeof gateway.artworks.create === 'function') {
      return gateway.artworks.create(baseURL, payload);
    }
    throw new Error('Artworks gateway create() is unavailable');
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
      if (gateway && gateway.artworks && typeof gateway.artworks.updateScheme === 'function') {
        return gateway.artworks.updateScheme(baseURL, artId, schemeId, formData);
      }
      throw new Error('Artworks gateway updateScheme() is unavailable');
    }

    if (gateway && gateway.artworks && typeof gateway.artworks.addScheme === 'function') {
      return gateway.artworks.addScheme(baseURL, artId, formData);
    }
    throw new Error('Artworks gateway addScheme() is unavailable');
  }

  async function deleteScheme(options = {}) {
    const baseURL = getBaseURL(options.baseURL);
    const artId = options.artId;
    const schemeId = options.schemeId;
    if (!artId || !schemeId) {
      throw new Error('artId and schemeId are required');
    }
    const gateway = getGateway();
    if (gateway && gateway.artworks && typeof gateway.artworks.deleteScheme === 'function') {
      return gateway.artworks.deleteScheme(baseURL, artId, schemeId);
    }
    throw new Error('Artworks gateway deleteScheme() is unavailable');
  }

  async function deleteArtwork(options = {}) {
    const baseURL = getBaseURL(options.baseURL);
    const artId = options.artId;
    if (!artId) {
      throw new Error('artId is required');
    }
    const gateway = getGateway();
    if (gateway && gateway.artworks && typeof gateway.artworks.remove === 'function') {
      return gateway.artworks.remove(baseURL, artId);
    }
    throw new Error('Artworks gateway remove() is unavailable');
  }

  window.ArtworksApi = {
    createArtwork,
    saveScheme,
    deleteScheme,
    deleteArtwork,
    getErrorPayload,
  };
})(window);
