function parseFlag(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

const state = {
  authEnforceWrites: parseFlag(process.env.AUTH_ENFORCE_WRITES, false),
  readOnlyMode: parseFlag(process.env.READ_ONLY_MODE, false),
};

function getFlags() {
  return {
    authEnforceWrites: Boolean(state.authEnforceWrites),
    readOnlyMode: Boolean(state.readOnlyMode),
  };
}

function setFlags(nextFlags = {}) {
  if (Object.prototype.hasOwnProperty.call(nextFlags, 'authEnforceWrites')) {
    state.authEnforceWrites = Boolean(nextFlags.authEnforceWrites);
  }
  if (Object.prototype.hasOwnProperty.call(nextFlags, 'readOnlyMode')) {
    state.readOnlyMode = Boolean(nextFlags.readOnlyMode);
  }
  return getFlags();
}

function isAuthEnforceWrites() {
  return Boolean(state.authEnforceWrites);
}

function isReadOnlyMode() {
  return Boolean(state.readOnlyMode);
}

module.exports = {
  parseFlag,
  getFlags,
  setFlags,
  isAuthEnforceWrites,
  isReadOnlyMode,
};

