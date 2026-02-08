(function (window) {
  function getResponse(error) {
    if (!error || !error.response) {
      return null;
    }
    return error.response;
  }

  function getData(error) {
    const response = getResponse(error);
    if (!response || !response.data || typeof response.data !== 'object') {
      return {};
    }
    return response.data;
  }

  function extract(error, options = {}) {
    const data = getData(error);
    const entityType = options.entityType || data.entityType || null;

    return {
      code: data.code || null,
      entityType,
      error: data.error || '',
      expectedVersion: data.expectedVersion,
      actualVersion: data.actualVersion,
      latestData: data.latestData || null,
      status: error && error.response ? error.response.status : null,
    };
  }

  function isVersionConflict(error, expectedEntityType = null) {
    const response = getResponse(error);
    const data = getData(error);

    if (!response || response.status !== 409) {
      return false;
    }
    if (data.code !== 'VERSION_CONFLICT') {
      return false;
    }
    if (!expectedEntityType) {
      return true;
    }
    return (data.entityType || null) === expectedEntityType;
  }

  function getMessage(conflict, fallback) {
    if (conflict && typeof conflict.error === 'string' && conflict.error.trim()) {
      return conflict.error;
    }
    return fallback || 'Data has changed on the server. Refresh and retry.';
  }

  window.conflictAdapter = {
    extract,
    isVersionConflict,
    getMessage,
  };
})(window);
