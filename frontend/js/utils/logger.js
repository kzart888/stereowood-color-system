(function (global) {
  const consoleRef = global.console || {};
  const noop = function () {};

  const write = function (method, namespace, args) {
    const prefix = namespace ? `[${namespace}]` : '';
    const payload = prefix ? [prefix].concat(args) : args;
    const target = consoleRef[method] || consoleRef.log || noop;
    try {
      target.apply(consoleRef, payload);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(prefix, args);
    }
  };

  const createLogger = function (namespace) {
    const ns = namespace || '';
    return {
      debug: function () {
        write('debug', ns, Array.from(arguments));
      },
      info: function () {
        write('info', ns, Array.from(arguments));
      },
      warn: function () {
        write('warn', ns, Array.from(arguments));
      },
      error: function () {
        write('error', ns, Array.from(arguments));
      }
    };
  };

  const defaultLogger = createLogger('Stereowood');

  global.createLogger = createLogger;
  global.logger = defaultLogger;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      createLogger
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
