// Unified message handling utility
// Reduces repetitive ElementPlus.ElMessage calls across components

const msg = {
    success: (text) => ElementPlus.ElMessage.success(text),
    error: (text) => ElementPlus.ElMessage.error(text),
    warning: (text) => ElementPlus.ElMessage.warning(text),
    info: (text) => ElementPlus.ElMessage.info(text)
};

// Make globally available
window.msg = msg;