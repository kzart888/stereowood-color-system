(function (window) {
  function toInt(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function getSavedInt(key) {
    try {
      return toInt(localStorage.getItem(key));
    } catch {
      return null;
    }
  }

  function setSavedValue(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // ignore storage failures
    }
  }

  function normalizeItemsPerPage(rawValue, fallback) {
    if (window.ConfigHelper && typeof window.ConfigHelper.normalizeItemsPerPage === 'function') {
      return window.ConfigHelper.normalizeItemsPerPage(rawValue, fallback);
    }
    return toInt(rawValue) ?? fallback;
  }

  function create(options = {}) {
    const vm = options.vm;
    const selectedKey = options.selectedKey || 'selectedColorId';
    const pageKey = options.pageKey;
    const itemsKey = options.itemsKey;
    const listSelector = options.listSelector || '.color-cards-grid';
    const configSection = options.configSection || 'custom-colors';

    function goToPage(page) {
      if (!vm || page === '...') return;
      const totalPages = Number(vm.totalPages) || 1;
      if (page < 1 || page > totalPages) return;

      vm.currentPage = page;
      vm.$nextTick(() => {
        const container = vm.$el && vm.$el.querySelector(listSelector);
        if (container) {
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      if (pageKey) {
        setSavedValue(pageKey, page);
      }
    }

    function onItemsPerPageChange() {
      if (!vm) return;
      vm.currentPage = 1;
      if (itemsKey) {
        setSavedValue(itemsKey, vm.itemsPerPage);
      }
    }

    function restorePaginationState() {
      if (!vm) return;

      const savedItems = itemsKey ? getSavedInt(itemsKey) : null;
      if (savedItems !== null && savedItems >= 0) {
        const normalizedItems = normalizeItemsPerPage(savedItems, vm.itemsPerPage || 24);
        vm.itemsPerPage = normalizedItems;
        if (itemsKey && normalizedItems !== savedItems) {
          setSavedValue(itemsKey, normalizedItems);
        }
      }

      const savedPage = pageKey ? getSavedInt(pageKey) : null;
      if (savedPage && savedPage > 0 && savedPage <= (Number(vm.totalPages) || 1)) {
        vm.currentPage = savedPage;
      }
    }

    function updatePaginationFromConfig() {
      if (!vm || !vm.globalData || !vm.globalData.appConfig || !vm.globalData.appConfig.value) {
        return;
      }
      if (!window.ConfigHelper || typeof window.ConfigHelper.getItemsPerPage !== 'function') {
        return;
      }

      const savedItems = itemsKey ? getSavedInt(itemsKey) : null;
      vm.itemsPerPage = window.ConfigHelper.getItemsPerPage(
        vm.globalData.appConfig.value,
        configSection,
        savedItems
      );

      if (itemsKey && savedItems !== null && vm.itemsPerPage !== savedItems) {
        setSavedValue(itemsKey, vm.itemsPerPage);
      }
    }

    function toggleSelection(id, event) {
      if (!vm) return;
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      vm[selectedKey] = vm[selectedKey] === id ? null : id;
    }

    function clearSelection() {
      if (!vm) return;
      vm[selectedKey] = null;
    }

    function handleGlobalClick(event) {
      if (!event || !event.target || typeof event.target.closest !== 'function') return;
      if (!event.target.closest('.artwork-bar')) {
        clearSelection();
      }
    }

    function handleEscKey(event) {
      if (!event || event.key !== 'Escape') return;
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.classList.contains('el-input__inner'));

      if (!isInputFocused && vm && vm[selectedKey] !== null) {
        clearSelection();
        event.preventDefault();
      }
    }

    function bindGlobalEvents() {
      document.addEventListener('click', handleGlobalClick);
      document.addEventListener('keydown', handleEscKey);
    }

    function unbindGlobalEvents() {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleEscKey);
    }

    return {
      goToPage,
      onItemsPerPageChange,
      restorePaginationState,
      updatePaginationFromConfig,
      toggleSelection,
      clearSelection,
      handleGlobalClick,
      handleEscKey,
      bindGlobalEvents,
      unbindGlobalEvents,
    };
  }

  window.LegacyListState = {
    create,
  };
})(window);
