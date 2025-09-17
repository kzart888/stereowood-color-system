(function(window) {
    'use strict';

    const CustomColorSelectionMixin = {
        data() {
            return {
                selectedColorId: null,
                highlightCode: null,
                _colorItemRefs: new Map()
            };
        },

        methods: {
            toggleColorSelection(colorId, event) {
                if (event && event.stopPropagation) {
                    event.stopPropagation();
                }

                if (this.selectedColorId === colorId) {
                    this.selectedColorId = null;
                } else {
                    this.selectedColorId = colorId;
                }
            },

            clearSelection() {
                this.selectedColorId = null;
            },

            handleGlobalClick(event) {
                if (!event.target.closest('.artwork-bar')) {
                    this.clearSelection();
                }
            },

            handleEscKey(event) {
                if (event.key !== 'Escape') return;

                const activeElement = document.activeElement;
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.tagName === 'SELECT' ||
                    activeElement.classList.contains('el-input__inner')
                );

                if (!isInputFocused && this.selectedColorId !== null) {
                    this.clearSelection();
                    event.preventDefault();
                }
            },

            setColorItemRef(color) {
                return (el) => {
                    if (el) this._colorItemRefs.set(color.color_code, el);
                    else this._colorItemRefs.delete(color.color_code);
                };
            },

            focusCustomColor(code) {
                if (this.activeCategory !== 'all') this.activeCategory = 'all';

                const targetIndex = this.filteredColors.findIndex(c => c.color_code === code);
                if (targetIndex === -1) return;

                const targetPage = this.itemsPerPage === 0 ? 1 : Math.floor(targetIndex / this.itemsPerPage) + 1;
                if (targetPage !== this.currentPage) {
                    this.currentPage = targetPage;
                }

                this.$nextTick(() => {
                    const el = this._colorItemRefs.get(code);
                    if (el && el.scrollIntoView) {
                        const rect = el.getBoundingClientRect();
                        const current = window.pageYOffset || document.documentElement.scrollTop;
                        const targetScroll = current + rect.top - 100;
                        window.scrollTo({
                            top: Math.max(0, targetScroll),
                            behavior: 'instant'
                        });
                        this.highlightCode = code;
                        setTimeout(() => { this.highlightCode = null; }, 2000);
                    }
                });
            }
        },

        mounted() {
            document.addEventListener('click', this.handleGlobalClick);
            document.addEventListener('keydown', this.handleEscKey);
        },

        beforeUnmount() {
            document.removeEventListener('click', this.handleGlobalClick);
            document.removeEventListener('keydown', this.handleEscKey);
        }
    };

    window.CustomColorSelectionMixin = CustomColorSelectionMixin;
})(window);
