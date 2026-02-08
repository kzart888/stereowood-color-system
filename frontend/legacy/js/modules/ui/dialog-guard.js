(function (window) {
  function create(options = {}) {
    const vm = options.vm;
    const snapshotKey = options.snapshotKey || '_dialogSnapshot';
    const escHandlerKey = options.escHandlerKey || '_dialogEscHandler';

    function setSnapshot(value) {
      if (!vm) return;
      vm[snapshotKey] = JSON.stringify(value || {});
    }

    function clearSnapshot() {
      if (!vm) return;
      vm[snapshotKey] = null;
    }

    function isDirty(currentValue) {
      if (!vm || !vm[snapshotKey]) return false;
      return vm[snapshotKey] !== JSON.stringify(currentValue || {});
    }

    function bindEsc(onEscape) {
      if (!vm || typeof onEscape !== 'function') return;
      unbindEsc();
      vm[escHandlerKey] = (event) => {
        if (event && event.key === 'Escape') {
          event.preventDefault();
          onEscape();
        }
      };
      document.addEventListener('keydown', vm[escHandlerKey]);
    }

    function unbindEsc() {
      if (!vm || !vm[escHandlerKey]) return;
      document.removeEventListener('keydown', vm[escHandlerKey]);
      vm[escHandlerKey] = null;
    }

    return {
      setSnapshot,
      clearSnapshot,
      isDirty,
      bindEsc,
      unbindEsc,
    };
  }

  window.LegacyDialogGuard = {
    create,
  };
})(window);
