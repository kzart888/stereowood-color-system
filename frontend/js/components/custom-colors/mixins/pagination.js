(function(window) {
    'use strict';

    const CustomColorPaginationMixin = {
        data() {
            return {
                currentPage: 1,
                itemsPerPage: 12
            };
        },

        computed: {
            isDevelopmentMode() {
                return this.globalData &&
                       this.globalData.appConfig &&
                       this.globalData.appConfig.value &&
                       this.globalData.appConfig.value.mode === 'test';
            },

            totalPages() {
                if (this.itemsPerPage === 0) return 1;
                return Math.ceil(this.filteredColors.length / this.itemsPerPage);
            },

            paginatedColors() {
                if (this.itemsPerPage === 0) {
                    return this.filteredColors;
                }
                const start = (this.currentPage - 1) * this.itemsPerPage;
                const end = start + this.itemsPerPage;
                return this.filteredColors.slice(start, end);
            },

            startItem() {
                if (this.filteredColors.length === 0) return 0;
                if (this.itemsPerPage === 0) return 1;
                return (this.currentPage - 1) * this.itemsPerPage + 1;
            },

            endItem() {
                if (this.itemsPerPage === 0) return this.filteredColors.length;
                return Math.min(this.currentPage * this.itemsPerPage, this.filteredColors.length);
            },

            visiblePages() {
                const pages = [];
                const maxVisible = 7;

                if (this.totalPages <= maxVisible) {
                    for (let i = 1; i <= this.totalPages; i++) {
                        pages.push(i);
                    }
                } else if (this.currentPage <= 4) {
                    for (let i = 1; i <= 5; i++) pages.push(i);
                    pages.push('...');
                    pages.push(this.totalPages);
                } else if (this.currentPage >= this.totalPages - 3) {
                    pages.push(1);
                    pages.push('...');
                    for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
                        pages.push(i);
                    }
                } else {
                    pages.push(1);
                    pages.push('...');
                    for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(this.totalPages);
                }

                return pages;
            }
        },

        watch: {
            activeCategory() {
                this.currentPage = 1;
            },

            totalPages(newVal) {
                if (this.currentPage > newVal && newVal > 0) {
                    this.currentPage = newVal;
                }
            },

            'globalData.appConfig.value': {
                handler(newConfig) {
                    if (newConfig) {
                        this.updatePaginationFromConfig();
                    }
                },
                deep: true
            }
        },

        methods: {
            goToPage(page) {
                if (page === '...') return;
                if (page < 1 || page > this.totalPages) return;

                this.currentPage = page;

                this.$nextTick(() => {
                    const container = this.$el.querySelector('.color-cards-grid');
                    if (container) {
                        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });

                try {
                    localStorage.setItem('sw-colors-page', page);
                } catch (e) {
                    /* ignore persistence errors */
                }
            },

            onItemsPerPageChange() {
                this.currentPage = 1;
                try {
                    localStorage.setItem('sw-colors-items-per-page', this.itemsPerPage);
                } catch (e) {
                    /* ignore persistence errors */
                }
            },

            restorePaginationState() {
                try {
                    const savedPage = localStorage.getItem('sw-colors-page');
                    const savedItems = localStorage.getItem('sw-colors-items-per-page');

                    if (savedItems) {
                        this.itemsPerPage = parseInt(savedItems);
                    }

                    if (savedPage) {
                        const page = parseInt(savedPage);
                        if (page <= this.totalPages) {
                            this.currentPage = page;
                        }
                    }
                } catch (e) {
                    /* ignore persistence errors */
                }
            },

            updatePaginationFromConfig() {
                if (this.globalData && this.globalData.appConfig && this.globalData.appConfig.value) {
                    const config = this.globalData.appConfig.value;
                    let savedItems = null;
                    try {
                        const saved = localStorage.getItem('sw-colors-items-per-page');
                        if (saved) savedItems = parseInt(saved);
                    } catch (e) {
                        /* ignore persistence errors */
                    }

                    this.itemsPerPage = window.ConfigHelper.getItemsPerPage(
                        config,
                        'custom-colors',
                        savedItems
                    );
                }
            }
        },

        mounted() {
            this.updatePaginationFromConfig();
            this.restorePaginationState();
        }
    };

    window.CustomColorPaginationMixin = CustomColorPaginationMixin;
})(window);
