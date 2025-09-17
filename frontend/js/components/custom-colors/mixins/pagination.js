(function(window) {
    'use strict';

    const baseMixin = window.CommonPaginationMixin;
    const mixins = Array.isArray(baseMixin) ? baseMixin : (baseMixin ? [baseMixin] : []);

    const CustomColorPaginationMixin = {
        mixins,
        computed: {
            paginationKeyPrefix() {
                return 'sw-colors';
            },
            paginationNamespace() {
                return 'custom-colors';
            },
            paginatedColors() {
                return this.paginatedItems;
            }
        },
        methods: {
            getPaginationItems() {
                return this.filteredColors || [];
            }
        }
    };

    window.CustomColorPaginationMixin = CustomColorPaginationMixin;
})(window);
