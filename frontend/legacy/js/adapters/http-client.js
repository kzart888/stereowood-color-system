(function (window) {
  function getAxios() {
    if (!window.axios) {
      throw new Error('axios is required before http-client.js');
    }
    return window.axios;
  }

  function normalizeBase(baseURL) {
    return String(baseURL || window.location.origin || '').replace(/\/$/, '');
  }

  function request(config) {
    const nextConfig = Object.assign({}, config || {});
    const headers = Object.assign({}, nextConfig.headers || {});
    let token = window.authSessionToken || null;
    if (!token) {
      try {
        token = localStorage.getItem('sw-auth-token') || null;
      } catch {
        token = null;
      }
    }
    if (token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    nextConfig.headers = headers;
    return getAxios()(nextConfig);
  }

  function get(url, config) {
    return request(Object.assign({ method: 'get', url }, config || {}));
  }

  function post(url, data, config) {
    return request(Object.assign({ method: 'post', url, data }, config || {}));
  }

  function put(url, data, config) {
    return request(Object.assign({ method: 'put', url, data }, config || {}));
  }

  function del(url, config) {
    return request(Object.assign({ method: 'delete', url }, config || {}));
  }

  function postMultipart(url, formData) {
    return post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  function putMultipart(url, formData) {
    return put(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  window.httpClient = {
    normalizeBase,
    request,
    get,
    post,
    put,
    delete: del,
    postMultipart,
    putMultipart,
  };
})(window);
