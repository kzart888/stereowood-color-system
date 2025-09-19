const assert = require('assert');

function reactive(obj) {
    return obj;
}

function ref(value) {
    return { value };
}

function computed(getter) {
    return {
        get value() {
            return getter();
        }
    };
}

function watch(source, cb) {
    const getter = typeof source === 'function' ? source : () => source.value;
    cb(getter(), undefined);
}

function nextTick() {
    return Promise.resolve();
}

global.window = global;
global.localStorage = {
    _data: {},
    getItem(key) { return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null; },
    setItem(key, value) { this._data[key] = String(value); },
    removeItem(key) { delete this._data[key]; }
};

global.Vue = { reactive, ref, computed, watch, nextTick };
global.ElementPlus = {
    ElMessage: { info: () => {}, success: () => {}, warning: () => {}, error: () => {} },
    ElMessageBox: { confirm: async () => {} }
};
global.helpers = {
    formatArtworkTitle: (artwork) => artwork.name || 'Artwork',
    generateColorCode: (categories, colors, categoryId) => {
        const prefix = (categories.find(c => c.id === categoryId)?.code || 'CC');
        const next = colors.filter(c => c.category_id === categoryId).length + 1;
        return `${prefix}${String(next).padStart(3, '0')}`;
    }
};
global.api = {
    customColors: {
        delete: async () => {},
        forceMerge: async () => {}
    }
};
global.ConfigHelper = {
    getItemsPerPage: (config, key, saved) => saved || (config?.defaults?.[key] || 12)
};
global.ColorConverter = {
    cmykToRgb: () => ({ r: 10, g: 10, b: 10 })
};
global.PantoneHelper = {
    getColorByName: () => ({ rgb: { r: 1, g: 2, b: 3 } })
};

require('../js/modules/custom-colors-store.js');

async function testPagination() {
    const colors = Array.from({ length: 20 }, (_, idx) => ({
        id: idx + 1,
        color_code: `BL${String(idx + 1).padStart(3, '0')}`,
        category_id: 1,
        updated_at: `2024-01-${String(idx + 1).padStart(2, '0')}`
    }));
    const globalData = {
        categories: { value: [{ id: 1, name: '蓝色', code: 'BL', display_order: 1 }] },
        customColors: { value: colors },
        artworks: { value: [] },
        baseURL: 'http://example.com',
        appConfig: { value: { defaults: { 'custom-colors': 12 } } },
        loadCustomColors: async () => {},
        loadArtworks: async () => {}
    };
    const store = window.createCustomColorsStore({
        globalData,
        getSortMode: () => 'time',
        getSearchQuery: () => '',
        getActiveTab: () => 'custom-colors'
    });
    assert.strictEqual(store.totalPages.value, 2, 'total pages should reflect dataset size');
    store.setItemsPerPage(5);
    assert.strictEqual(store.pagination.itemsPerPage, 5, 'items per page should update');
    assert.strictEqual(store.paginatedColors.value.length, 5, 'page size should update result length');
    store.goToPage(2);
    assert.strictEqual(store.pagination.currentPage, 2, 'current page should change when navigating');
    assert.strictEqual(store.startItem.value, 6, 'start item should be computed correctly');
    assert.strictEqual(store.endItem.value, 10, 'end item should be computed correctly');
}

async function testDuplicateDetection() {
    const duplicates = [
        { id: 1, color_code: 'AA001', category_id: 1, updated_at: '2023-01-01' },
        { id: 2, color_code: 'AA002', category_id: 1, updated_at: '2023-01-02' }
    ];
    global.duplicateDetector = {
        groupByRatioSignature: () => ({ sig1: duplicates }),
        parseRatio: () => ({ items: [{ name: 'Pigment A', ratio: 1 }] })
    };
    const globalData = {
        categories: { value: [{ id: 1, name: '测试', code: 'TS', display_order: 1 }] },
        customColors: { value: duplicates },
        artworks: { value: [] },
        baseURL: 'http://example.com',
        appConfig: { value: { defaults: { 'custom-colors': 12 } } },
        loadCustomColors: async () => {},
        loadArtworks: async () => {}
    };
    const store = window.createCustomColorsStore({
        globalData,
        getSortMode: () => 'time',
        getSearchQuery: () => '',
        getActiveTab: () => 'custom-colors'
    });
    store.runDuplicateCheck();
    assert.strictEqual(store.duplicateState.groups.length, 1, 'should capture duplicate group');
    assert.strictEqual(store.duplicateState.showDialog, true, 'should open duplicate dialog');
    assert.ok(store.duplicateState.selections.sig1, 'should set default selection');
}

async function testColorValueHelpers() {
    const form = reactive({
        imageFile: null,
        imagePreview: null,
        rgb_r: null,
        rgb_g: null,
        rgb_b: null,
        cmyk_c: null,
        cmyk_m: null,
        cmyk_y: null,
        cmyk_k: null,
        hex_color: null,
        pantone_coated: null,
        pantone_uncoated: null
    });
    const helpers = window.createColorValueHelpers(form);
    assert.strictEqual(helpers.hasRGBValue.value, false, 'initial RGB helper should be false');
    form.rgb_r = 10;
    form.rgb_g = 20;
    form.rgb_b = 30;
    await nextTick();
    assert.strictEqual(helpers.hasRGBValue.value, true, 'RGB helper should track assignments');
    form.hex_color = '#ffffff';
    await nextTick();
    assert.strictEqual(helpers.hasHEXValue.value, true, 'HEX helper should detect value');
}

async function run() {
    await testPagination();
    await testDuplicateDetection();
    await testColorValueHelpers();
    console.log('custom-colors-store tests passed');
}

module.exports = { run };
