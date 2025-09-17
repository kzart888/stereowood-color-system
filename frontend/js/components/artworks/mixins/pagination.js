(function (global) {
  const paginationMixin = {
    data() {
      return {
        currentPage: 1,
        itemsPerPage: 12
      };
    },
    computed: {
      totalPages() {
        if (!Array.isArray(this.artworks) || this.artworks.length === 0) {
          return 1;
        }
        if (this.itemsPerPage === 0) {
          return 1;
        }
        return Math.ceil(this.artworks.length / this.itemsPerPage);
      },
      paginatedArtworks() {
        if (!Array.isArray(this.artworks)) {
          return [];
        }
        if (this.itemsPerPage === 0) {
          return this.artworks;
        }
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.artworks.slice(start, end);
      },
      startItem() {
        if (!Array.isArray(this.artworks) || this.artworks.length === 0) {
          return 0;
        }
        if (this.itemsPerPage === 0) {
          return 1;
        }
        return (this.currentPage - 1) * this.itemsPerPage + 1;
      },
      endItem() {
        if (!Array.isArray(this.artworks) || this.artworks.length === 0) {
          return 0;
        }
        if (this.itemsPerPage === 0) {
          return this.artworks.length;
        }
        return Math.min(this.currentPage * this.itemsPerPage, this.artworks.length);
      },
      visiblePages() {
        const pages = [];
        const maxVisible = 7;
        if (this.totalPages <= maxVisible) {
          for (let i = 1; i <= this.totalPages; i += 1) {
            pages.push(i);
          }
          return pages;
        }
        if (this.currentPage <= 4) {
          for (let i = 1; i <= 5; i += 1) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(this.totalPages);
          return pages;
        }
        if (this.currentPage >= this.totalPages - 3) {
          pages.push(1);
          pages.push('...');
          for (let i = this.totalPages - 4; i <= this.totalPages; i += 1) {
            pages.push(i);
          }
          return pages;
        }
        pages.push(1);
        pages.push('...');
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i += 1) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(this.totalPages);
        return pages;
      }
    },
    methods: {
      goToPage(page) {
        if (page === '...') {
          return;
        }
        const target = Number(page) || 1;
        if (target < 1 || target > this.totalPages) {
          return;
        }
        this.currentPage = target;
        this.$nextTick(() => {
          const container = this.$el && this.$el.querySelector
            ? this.$el.querySelector('.artwork-bar')
            : null;
          if (container && container.scrollIntoView) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
        this.savePaginationState();
      },
      onItemsPerPageChange(value) {
        if (typeof value !== 'undefined') {
          const parsed = Number(value);
          this.itemsPerPage = Number.isNaN(parsed) ? this.itemsPerPage : parsed;
        }
        this.currentPage = 1;
        this.savePaginationState();
      },
      savePaginationState() {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('sw-artworks-page', String(this.currentPage));
            localStorage.setItem('sw-artworks-items-per-page', String(this.itemsPerPage));
          }
        } catch (e) {
          /* noop */
        }
      },
      restorePaginationState() {
        try {
          if (typeof localStorage === 'undefined') {
            return;
          }
          const savedPage = localStorage.getItem('sw-artworks-page');
          const savedItems = localStorage.getItem('sw-artworks-items-per-page');
          if (savedItems !== null) {
            const parsedItems = parseInt(savedItems, 10);
            if (!Number.isNaN(parsedItems)) {
              this.itemsPerPage = parsedItems;
            }
          }
          if (savedPage !== null) {
            const parsedPage = parseInt(savedPage, 10);
            if (!Number.isNaN(parsedPage) && parsedPage >= 1 && parsedPage <= this.totalPages) {
              this.currentPage = parsedPage;
            }
          }
        } catch (e) {
          /* noop */
        }
      },
      updatePaginationFromConfig() {
        if (!this.globalData || !this.globalData.appConfig || !this.globalData.appConfig.value) {
          return;
        }
        const config = this.globalData.appConfig.value;
        let savedItems = null;
        try {
          if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('sw-artworks-items-per-page');
            if (saved) {
              const parsed = parseInt(saved, 10);
              if (!Number.isNaN(parsed)) {
                savedItems = parsed;
              }
            }
          }
        } catch (e) {
          /* noop */
        }
        if (global.ConfigHelper && typeof global.ConfigHelper.getItemsPerPage === 'function') {
          this.itemsPerPage = global.ConfigHelper.getItemsPerPage(config, 'artworks', savedItems);
        }
      }
    },
    watch: {
      totalPages(newVal) {
        if (newVal > 0 && this.currentPage > newVal) {
          this.currentPage = newVal;
        }
      },
      'globalData.appConfig.value': {
        deep: true,
        handler(newConfig) {
          if (newConfig) {
            this.updatePaginationFromConfig();
          }
        }
      }
    }
  };

  global.ArtworksPaginationMixin = paginationMixin;
})(typeof window !== 'undefined' ? window : globalThis);
