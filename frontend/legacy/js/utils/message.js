// Unified message handling utility
// Reduces repetitive ElementPlus.ElMessage calls across components

(function (window) {
    const DEFAULT_OPTIONS = Object.freeze({
        duration: 2200,
        showClose: true,
        grouping: true,
        offset: 20
    });

    function normalizePayload(input) {
        if (typeof input === 'string' || typeof input === 'number') {
            return { message: String(input) };
        }
        if (input && typeof input === 'object') {
            return input;
        }
        return { message: '' };
    }

    function dispatch(type, input, options) {
        const payload = normalizePayload(input);
        return ElementPlus.ElMessage({
            ...DEFAULT_OPTIONS,
            type,
            ...payload,
            ...(options || {})
        });
    }

    const msg = {
        success(input, options) {
            return dispatch('success', input, options);
        },
        error(input, options) {
            return dispatch('error', input, options);
        },
        warning(input, options) {
            return dispatch('warning', input, options);
        },
        info(input, options) {
            return dispatch('info', input, options);
        }
    };

    // Make globally available
    window.msg = msg;
})(window);
