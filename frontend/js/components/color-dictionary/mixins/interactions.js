(function(window) {
    'use strict';

    const helpers = window.ColorDictionaryHelpers || { getColorStyle: () => null };
    const CATEGORY_PRINT_ORDER = ['蓝色系', '黄色系', '红色系', '绿色系', '紫色系', '色精', '黑白灰色系', '其他'];

    const ColorDictionaryInteractionMixin = {
        methods: {
            handleColorSelect(color) {
                if (color && color.id) {
                    this.selectedColorId = color.id === this.selectedColorId ? null : color.id;
                }
            },

            handleColorHover(color) {
                this.hoveredColor = color || null;
            },

            navigateToColor() {
                if (!this.selectedColor || !this.$root || !this.$root.focusCustomColor) return;
                this.$root.focusCustomColor(this.selectedColor.color_code);
            },

            printColors() {
                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                    console.error('Popup blocked: unable to open print preview window');
                    return;
                }

                const now = new Date();
                const stamp = `${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
                const html = `
                    <!DOCTYPE html>
                    <html lang="zh-CN">
                    <head>
                        <meta charset="UTF-8">
                        <title>STEREOWOOD 自配色列表</title>
                        <style>${this.getPrintStyles(stamp)}</style>
                    </head>
                    <body>${this.generatePrintContent()}</body>
                    </html>
                `;

                printWindow.document.write(html);
                printWindow.document.close();

                setTimeout(() => {
                    try {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.onafterprint = () => printWindow.close();
                        setTimeout(() => {
                            if (!printWindow.closed) {
                                printWindow.close();
                            }
                        }, 10000);
                    } catch (error) {
                        console.error('Print error:', error);
                        if (!printWindow.closed) {
                            printWindow.close();
                        }
                    }
                }, 500);
            },

            generatePrintContent() {
                const colorsByCategory = {};
                this.enrichedColors.forEach((color) => {
                    const name = this.getCategoryName(color.category_id);
                    if (!colorsByCategory[name]) {
                        colorsByCategory[name] = [];
                    }
                    colorsByCategory[name].push(color);
                });

                const orderedCategories = CATEGORY_PRINT_ORDER.filter((name) => colorsByCategory[name]);
                Object.keys(colorsByCategory).forEach((name) => {
                    if (!orderedCategories.includes(name)) {
                        orderedCategories.push(name);
                    }
                });

                const buildColorBlock = (color) => {
                    const style = helpers.getColorStyle(color);
                    const previewStyle = style ? `style="background:${style}"` : '';
                    const previewClass = style ? '' : ' blank-color';
                    const hexText = color.hex || color.hex_color || '未填写';
                    const rgbText = color.rgb
                        ? `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`
                        : (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null)
                            ? `${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b}`
                            : '未填写';

                    return `
                        <div class="color-block">
                            <div class="color-swatch${previewClass}" ${previewStyle}>
                                ${style ? '' : '<span>无</span>'}
                            </div>
                            <div class="color-info">
                                <div class="color-code">${color.color_code || '未命名'}</div>
                                <div class="color-meta">
                                    <span>HEX: ${hexText}</span>
                                    <span>RGB: ${rgbText}</span>
                                </div>
                            </div>
                        </div>
                    `;
                };

                const sections = orderedCategories.map((categoryName) => {
                    const blocks = colorsByCategory[categoryName].map(buildColorBlock).join('');
                    return `
                        <section class="category-section">
                            <header class="category-header">${categoryName}</header>
                            <div class="category-grid">${blocks}</div>
                        </section>
                    `;
                });

                return `
                    <div class="print-container">
                        <header class="print-header">
                            <h1>STEREOWOOD 自配色列表</h1>
                        </header>
                        ${sections.join('')}
                    </div>
                `;
            },

            getPrintStyles(timestamp) {
                return `
                    :root {
                        --grid-gap: 12px;
                        --swatch-size: 48px;
                    }

                    body {
                        font-family: 'Source Han Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
                        margin: 12mm;
                        color: #000;
                        background: #fff;
                    }

                    .print-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 12px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 8px;
                    }

                    .print-header::after {
                        content: '${timestamp}';
                        font-size: 12px;
                        color: #333;
                    }

                    .category-section {
                        page-break-inside: avoid;
                        margin-bottom: 18px;
                    }

                    .category-header {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 8px;
                    }

                    .category-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                        gap: var(--grid-gap);
                    }

                    .color-block {
                        display: flex;
                        gap: 8px;
                        padding: 8px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        min-height: var(--swatch-size);
                        align-items: center;
                    }

                    .color-swatch {
                        width: var(--swatch-size);
                        height: var(--swatch-size);
                        border-radius: 4px;
                        border: 1px solid #999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        color: #555;
                        background: #f5f5f5;
                    }

                    .color-swatch.blank-color {
                        border-style: dashed;
                    }

                    .color-info {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }

                    .color-code {
                        font-weight: bold;
                        font-size: 14px;
                    }

                    .color-meta {
                        display: flex;
                        flex-direction: column;
                        font-size: 12px;
                        color: #333;
                        gap: 2px;
                    }

                    @page {
                        margin: 12mm;
                        size: A4 portrait;
                        @top-right { content: 'STEREOWOOD 自配色列表'; font-size: 10px; }
                        @bottom-left { content: '${timestamp}'; font-size: 10px; }
                        @bottom-right { content: counter(page); font-size: 10px; }
                    }

                    @media print {
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }

                        @page:first {
                            margin-top: 10mm;
                        }
                    }
                `;
            },

            restoreViewState() {
                try {
                    const savedView = localStorage.getItem('color-dict-view');
                    if (savedView && ['list', 'hsl', 'wheel'].includes(savedView)) {
                        this.viewMode = savedView;
                    }
                    const savedSort = localStorage.getItem('color-dict-sort');
                    if (savedSort && ['name', 'color'].includes(savedSort)) {
                        this.listSortMode = savedSort;
                    }
                } catch (error) {
                    console.error('Failed to restore view state:', error);
                }
            },

            setupLazyLoading() {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        const img = entry.target;
                        if (img.dataset.src && !img.src) {
                            img.src = img.dataset.src;
                            img.onload = () => img.classList.add('loaded');
                        }
                        observer.unobserve(img);
                    });
                }, { rootMargin: '50px' });

                this.$nextTick(() => {
                    const lazyImages = this.$el.querySelectorAll('img[data-src]');
                    lazyImages.forEach((img) => observer.observe(img));
                });

                this._imageObserver = observer;
            },

            setupEventHandlers() {
                this.handleKeyDown = (event) => {
                    if (event.key === 'Escape' && this.selectedColorId) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.selectedColorId = null;
                        return;
                    }

                    if (event.key === 'p' && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        this.printColors();
                        return;
                    }

                    if (event.key === '1' && !event.ctrlKey && !event.metaKey) {
                        event.preventDefault();
                        this.viewMode = 'list';
                        return;
                    }
                    if (event.key === '2' && !event.ctrlKey && !event.metaKey) {
                        event.preventDefault();
                        this.viewMode = 'hsl';
                        return;
                    }
                    if (event.key === '3' && !event.ctrlKey && !event.metaKey) {
                        event.preventDefault();
                        this.viewMode = 'wheel';
                        return;
                    }

                    if (this.viewMode !== 'list' || this.enrichedColors.length === 0) return;
                    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) return;

                    const currentIndex = this.enrichedColors.findIndex((c) => c.id === this.selectedColorId);
                    let newIndex = -1;
                    switch (event.key) {
                        case 'ArrowRight':
                            event.preventDefault();
                            newIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, this.enrichedColors.length - 1);
                            break;
                        case 'ArrowLeft':
                            event.preventDefault();
                            newIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
                            break;
                        case 'ArrowDown':
                            event.preventDefault();
                            newIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 10, this.enrichedColors.length - 1);
                            break;
                        case 'ArrowUp':
                            event.preventDefault();
                            newIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 10, 0);
                            break;
                        case 'Enter':
                            if (this.selectedColorId) {
                                event.preventDefault();
                                this.navigateToColor();
                            }
                            return;
                    }

                    if (newIndex >= 0 && newIndex < this.enrichedColors.length) {
                        this.selectedColorId = this.enrichedColors[newIndex].id;
                        this.$nextTick(() => {
                            const element = this.$el.querySelector(`.color-chip-80[data-color-id="${this.selectedColorId}"]`);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        });
                    }
                };
                window.addEventListener('keydown', this.handleKeyDown);

                this.handleClickOutside = (event) => {
                    const target = event.target;
                    if (target.classList.contains('color-dictionary-page') || target.classList.contains('view-content')) {
                        this.selectedColorId = null;
                    }
                };
                this.$el.addEventListener('click', this.handleClickOutside);
            },

            removeEventHandlers() {
                if (this.handleKeyDown) {
                    window.removeEventListener('keydown', this.handleKeyDown);
                    this.handleKeyDown = null;
                }
                if (this.handleClickOutside) {
                    this.$el.removeEventListener('click', this.handleClickOutside);
                    this.handleClickOutside = null;
                }
            }
        }
    };

    window.ColorDictionaryMixins = window.ColorDictionaryMixins || {};
    window.ColorDictionaryMixins.interactions = ColorDictionaryInteractionMixin;
})(window);
