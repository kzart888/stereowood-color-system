(function (window) {
  function dispatch(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  function on(eventName, handler, options) {
    window.addEventListener(eventName, handler, options);
  }

  function off(eventName, handler, options) {
    window.removeEventListener(eventName, handler, options);
  }

  window.runtimeBridge = {
    get apiGateway() {
      return window.apiGateway || null;
    },
    get helpers() {
      return window.helpers || null;
    },
    get formulaMatcher() {
      return window.FormulaMatcher || null;
    },
    get ingredientSuggester() {
      return window.IngredientSuggester || null;
    },
    get thumbPreview() {
      return window.thumbPreview || null;
    },
    get calculator() {
      return window.$formulaCalc || null;
    },
    dispatch,
    on,
    off,
  };
})(window);
