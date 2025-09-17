(function(window) {
    'use strict';

    const DEFAULT_OPTION_VALUES = [12, 24, 48, 0];

    function isArray(value) {
        return Array.isArray(value);
    }

    const CommonPaginationMixin = {
        data() {
            return {
                currentPage: 1,
                itemsPerPage: 12
            };
        },

        computed: {
            isDevelopmentMode() {
                const appConfig = this.globalData && this.globalData.appConfig ? this.globalData.appConfig.value : null;
                if (appConfig && appConfig.mode === 'test') {
                    return true;
                }

                if (typeof this.getIsDevelopmentMode === 'function') {
                    return !!this.getIsDevelopmentMode();
                }

                return false;
            },

            paginationKeyPrefix() {
                if (typeof this.getPaginationKeyPrefix === 'function') {
                    return this.getPaginationKeyPrefix();
                }

                if (this.paginationKeyPrefix) {
                    return this.paginationKeyPrefix;
                }

                return 'sw-pagination';
            },

            paginationNamespace() {
                if (typeof this.getPaginationNamespace === 'function') {
                    return this.getPaginationNamespace();
                }

                if (this.paginationNamespace) {
                    return this.paginationNamespace;
                }

                return 'default';
            },

            paginationItems() {
                const resolved = this.resolvePaginationItems();
                return isArray(resolved) ? resolved : [];
            },

            totalPages() {
                if (this.itemsPerPage === 0) {
                    return 1;
                }

                return Math.ceil(this.paginationItems.length / this.itemsPerPage);
            },

            paginatedItems() {
                if (this.itemsPerPage === 0) {
                    return this.paginationItems;
                }

                const start = (this.currentPage - 1) * this.itemsPerPage;
                const end = start + this.itemsPerPage;
                return this.paginationItems.slice(start, end);
            },

            startItem() {
                if (this.paginationItems.length === 0) {
                    return 0;
                }

                if (this.itemsPerPage === 0) {
                    return 1;
                }

                return (this.currentPage - 1) * this.itemsPerPage + 1;
            },

            endItem() {
                if (this.itemsPerPage === 0) {
                    return this.paginationItems.length;
                }

                return Math.min(this.currentPage * this.itemsPerPage, this.paginationItems.length);
            },

            visiblePages() {
                const pages = [];
                const maxVisible = 7;
                const total = this.totalPages;

                if (total <= maxVisible) {
                    for (let i = 1; i <= total; i++) {
                        pages.push(i);
                    }
                    return pages;
                }

                if (this.currentPage <= 4) {
                    for (let i = 1; i <= 5; i++) pages.push(i);
                    pages.push('...');
                    pages.push(total);
                } else if (this.currentPage >= total - 3) {
                    pages.push(1);
                    pages.push('...');
                    for (let i = total - 4; i <= total; i++) {
                        pages.push(i);
                    }
                } else {
                    pages.push(1);
                    pages.push('...');
                    for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(total);
                }

                return pages;
            },

            paginationOptionValues() {
                if (typeof this.getPaginationOptionValues === 'function') {
                    const values = this.getPaginationOptionValues();
                    if (isArray(values) && values.length) {
                        return values;
                    }
                }

                if (isArray(this.itemsPerPageOptionsOverride) && this.itemsPerPageOptionsOverride.length) {
                    return this.itemsPerPageOptionsOverride;
                }

                return DEFAULT_OPTION_VALUES;
            },

            itemsPerPageOptions() {
                const values = this.paginationOptionValues.slice();

                if (this.isDevelopmentMode && !values.includes(2)) {
                    values.unshift(2);
                }

                return values.map((value) => ({
                    value,
                    label: value === 0 ? '全部' : `${value} 项`
                }));
            }
        },

        watch: {
            activeCategory() {
                if (typeof this.currentPage === 'number') {
                    this.currentPage = 1;
                }
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
            resolvePaginationItems() {
                if (typeof this.getPaginationItems === 'function') {
                    return this.getPaginationItems();
                }

                if (isArray(this.filteredItems)) {
                    return this.filteredItems;
                }

                if (isArray(this.filteredColors)) {
                    return this.filteredColors;
                }

                if (isArray(this.items)) {
                    return this.items;
                }

                return [];
            },

            goToPage(page) {
                if (page === '...') return;

                if (page < 1 || page > this.totalPages) return;

                this.currentPage = page;

                this.$nextTick(() => {
                    const container = this.$el && this.$el.querySelector ? this.$el.querySelector('.color-cards-grid') : null;
                    if (container && container.scrollIntoView) {
                        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });

                try {
                    localStorage.setItem(`${this.paginationKeyPrefix}-page`, page);
                } catch (e) {
                    /* ignore persistence errors */
                }
            },

            handleItemsPerPageChange(value) {
                this.itemsPerPage = value;
                this.onItemsPerPageChange();
            },

            onItemsPerPageChange() {
                this.currentPage = 1;
                try {
                    localStorage.setItem(`${this.paginationKeyPrefix}-items-per-page`, this.itemsPerPage);
                } catch (e) {
                    /* ignore persistence errors */
                }
            },

            restorePaginationState() {
                try {
                    const savedItems = localStorage.getItem(`${this.paginationKeyPrefix}-items-per-page`);
                    if (savedItems) {
                        const parsedItems = parseInt(savedItems, 10);
                        if (!Number.isNaN(parsedItems)) {
                            this.itemsPerPage = parsedItems;
                        }
                    }

                    const savedPage = localStorage.getItem(`${this.paginationKeyPrefix}-page`);
                    if (savedPage) {
                        const parsedPage = parseInt(savedPage, 10);
                        if (!Number.isNaN(parsedPage) && parsedPage >= 1 && parsedPage <= this.totalPages) {
                            this.currentPage = parsedPage;
                        }
                    }
                } catch (e) {
                    /* ignore persistence errors */
                }
            },

            updatePaginationFromConfig() {
                const appConfig = this.globalData && this.globalData.appConfig ? this.globalData.appConfig.value : null;
                if (!appConfig || !window.ConfigHelper || typeof window.ConfigHelper.getItemsPerPage !== 'function') {
                    return;
                }

                let savedItems = null;
                try {
                    const saved = localStorage.getItem(`${this.paginationKeyPrefix}-items-per-page`);
                    if (saved) {
                        const parsed = parseInt(saved, 10);
                        if (!Number.isNaN(parsed)) {
                            savedItems = parsed;
                        }
                    }
                } catch (e) {
                    /* ignore persistence errors */
                }

                const resolved = window.ConfigHelper.getItemsPerPage(
                    appConfig,
                    this.paginationNamespace,
                    savedItems
                );

                const parsedResolved = parseInt(resolved, 10);
                if (!Number.isNaN(parsedResolved)) {
                    this.itemsPerPage = parsedResolved;
                }
            }
        },

        mounted() {
            this.updatePaginationFromConfig();
            this.restorePaginationState();
        }
    };

    window.CommonPaginationMixin = CommonPaginationMixin;
})(window);
