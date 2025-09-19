const { ref, reactive } = Vue;

const DEFAULT_CONFIG = {
    mode: 'production',
    testModeItemsPerPage: 3,
    features: {}
};

export function useAppData(options = {}) {
    const registerDataset = typeof options.registerDataset === 'function' ? options.registerDataset : () => {};
    const baseURL = ref(options.baseURL || window.location.origin);
    const loading = ref(false);
    const appConfig = reactive({ ...DEFAULT_CONFIG });
    const categories = ref([]);
    const customColors = ref([]);
    const artworks = ref([]);
    const montMarteColors = ref([]);
    const suppliers = ref([]);
    const purchaseLinks = ref([]);

    let colorFormulaIndex = null;

    function broadcast(eventName, payload) {
        try {
            window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
        } catch (e) {
            // Ignore broadcasting failures to keep data loading resilient
        }
    }

    async function loadAppConfig() {
        try {
            const response = await fetch(`${baseURL.value}/api/config`);
            if (!response.ok) throw new Error('Failed to fetch config');
            const config = await response.json();
            Object.assign(appConfig, config || {});
        } catch (error) {
            console.warn('Failed to load app config, using defaults:', error);
        }
    }

    function buildColorFormulaIndex() {
        colorFormulaIndex = {};
        (customColors.value || []).forEach(color => {
            colorFormulaIndex[color.color_code] = color.formula || '';
        });
    }

    function syncFormulasIfChanged() {
        if (!window.$formulaCalc || !colorFormulaIndex) return;
        (customColors.value || []).forEach(color => {
            const code = color.color_code;
            const newFormula = color.formula || '';
            const oldFormula = colorFormulaIndex[code];
            if (oldFormula !== newFormula) {
                window.$formulaCalc.syncFormulaChange(code, newFormula);
            }
        });
        buildColorFormulaIndex();
    }

    async function loadCategories() {
        try {
            const res = await window.api.categories.getAll();
            categories.value = res.data;
            broadcast('categories-updated', categories.value);
        } catch (e) {
            console.warn('[app-data] Failed to load categories', e);
        }
    }

    async function loadCustomColors(bypassCache = false) {
        try {
            const res = await window.api.customColors.getAll({ bypassCache });
            customColors.value = res.data;
            registerDataset('customColors', customColors.value.map(color => ({
                id: color.id,
                code: color.color_code || color.code || '',
                name: color.name || ''
            })));
            if (colorFormulaIndex) {
                syncFormulasIfChanged();
            } else {
                buildColorFormulaIndex();
            }
            broadcast('colors-updated', customColors.value);
        } catch (e) {
            console.warn('[app-data] Failed to load custom colors', e);
        }
    }

    async function loadArtworks() {
        try {
            const res = await window.api.artworks.getAll();
            artworks.value = res.data;
            const artworksIndex = [];
            const schemesIndex = [];
            artworks.value.forEach(artwork => {
                const name = artwork.name || artwork.title || '';
                const code = artwork.code || artwork.no || '';
                artworksIndex.push({ id: artwork.id, name, code });
                if (Array.isArray(artwork.schemes)) {
                    artwork.schemes.forEach(scheme => {
                        schemesIndex.push({
                            id: scheme.id,
                            artworkId: artwork.id,
                            artworkName: name,
                            artworkCode: code,
                            name: scheme.name || ''
                        });
                    });
                }
            });
            registerDataset('artworks', artworksIndex);
            registerDataset('schemes', schemesIndex);
        } catch (e) {
            console.warn('[app-data] Failed to load artworks', e);
        }
    }

    async function loadMontMarteColors() {
        try {
            const res = await window.api.montMarteColors.getAll();
            montMarteColors.value = res.data;
            registerDataset('rawMaterials', montMarteColors.value.map(material => ({
                id: material.id,
                name: material.name
            })));
        } catch (e) {
            console.warn('[app-data] Failed to load raw materials', e);
        }
    }

    async function loadSuppliers() {
        try {
            const response = await axios.get(`${baseURL.value}/api/suppliers`);
            suppliers.value = response.data || [];
        } catch (e) {
            console.warn('[app-data] Failed to load suppliers', e);
        }
    }

    async function loadPurchaseLinks() {
        try {
            const response = await axios.get(`${baseURL.value}/api/purchase-links`);
            purchaseLinks.value = response.data || [];
        } catch (e) {
            console.warn('[app-data] Failed to load purchase links', e);
        }
    }

    async function initApp() {
        loading.value = true;
        try {
            await loadAppConfig();
            await Promise.all([
                loadCategories(),
                loadCustomColors(),
                loadArtworks(),
                loadMontMarteColors(),
                loadSuppliers(),
                loadPurchaseLinks()
            ]);
            if (!colorFormulaIndex) {
                buildColorFormulaIndex();
            }
        } catch (e) {
            console.warn('[app-data] Failed to initialise app', e);
        } finally {
            loading.value = false;
        }
    }

    return {
        baseURL,
        loading,
        appConfig,
        categories,
        customColors,
        artworks,
        montMarteColors,
        suppliers,
        purchaseLinks,
        initApp,
        loadAppConfig,
        loadCategories,
        loadCustomColors,
        loadArtworks,
        loadMontMarteColors,
        loadSuppliers,
        loadPurchaseLinks
    };
}
