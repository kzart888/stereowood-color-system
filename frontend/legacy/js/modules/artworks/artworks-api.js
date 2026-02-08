(function (window) {
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

    if (schemeId) {
      if (window.api && window.api.artworks && typeof window.api.artworks.updateScheme === 'function') {
        return window.api.artworks.updateScheme(artId, schemeId, formData);
      }
      return axios.put(`${baseURL}/api/artworks/${artId}/schemes/${schemeId}`, formData);
    }

    if (window.api && window.api.artworks && typeof window.api.artworks.addScheme === 'function') {
      return window.api.artworks.addScheme(artId, formData);
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
    return axios.delete(`${baseURL}/api/artworks/${artId}/schemes/${schemeId}`);
  }

  async function deleteArtwork(options = {}) {
    const baseURL = getBaseURL(options.baseURL);
    const artId = options.artId;
    if (!artId) {
      throw new Error('artId is required');
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
