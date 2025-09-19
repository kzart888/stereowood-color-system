const { ref, reactive } = Vue;

export function useGlobalSearch() {
    const globalSearchQuery = ref('');
    const globalSearchResults = ref([]);
    const showSearchDropdown = ref(false);
    const searchIndex = reactive({
        customColors: [],
        artworks: [],
        schemes: [],
        rawMaterials: []
    });
    const indexReady = reactive({
        customColors: false,
        artworks: false,
        rawMaterials: false
    });
    let searchDebounceTimer = null;

    function registerDataset(type, items) {
        if (!type || !Array.isArray(items)) return;
        if (type === 'customColors') {
            searchIndex.customColors = items.slice();
            indexReady.customColors = true;
        } else if (type === 'artworks') {
            searchIndex.artworks = items.slice();
            indexReady.artworks = true;
        } else if (type === 'schemes') {
            searchIndex.schemes = items.slice();
        } else if (type === 'rawMaterials') {
            searchIndex.rawMaterials = items.slice();
            indexReady.rawMaterials = true;
        }
    }

    function openSearchDropdown() {
        showSearchDropdown.value = true;
    }

    function closeSearchDropdown() {
        showSearchDropdown.value = false;
    }

    function buildSearchResults() {
        const qRaw = (globalSearchQuery.value || '').trim();
        if (!qRaw) {
            globalSearchResults.value = [];
            showSearchDropdown.value = false;
            searchDebounceTimer = null;
            return;
        }
        const qLower = qRaw.toLowerCase();
        const tokens = qLower.split(/\s+/).filter(Boolean);
        const multi = tokens.length > 1;
        const results = [];
        const push = item => results.push(item);

        searchIndex.customColors.forEach(color => {
            const code = (color.code || '').toLowerCase();
            const name = (color.name || '').toLowerCase();
            const haystack = [code, name];
            const match = multi
                ? tokens.every(token => haystack.some(hay => hay && hay.includes(token)))
                : haystack.some(hay => hay && hay.includes(qLower));
            if (match) {
                push({
                    type: 'customColor',
                    id: color.id,
                    code: color.code,
                    display: color.code || color.name,
                    group: '自配色',
                    pathLabel: `自配色管理 -> ${(color.code || '')}${color.name ? ' ' + color.name : ''}`
                });
            }
        });

        const artworkMatches = [];
        const schemeMatches = [];

        searchIndex.artworks.forEach(artwork => {
            const name = (artwork.name || '').toLowerCase();
            const code = (artwork.code || '').toLowerCase();
            const combo = code && name ? `${code}-${name}` : (code || name);
            const haystack = [name, code, combo];
            const match = multi
                ? tokens.every(token => haystack.some(hay => hay && hay.includes(token)))
                : haystack.some(hay => hay && hay.includes(qLower));
            if (match) {
                artworkMatches.push({
                    type: 'artwork',
                    id: artwork.id,
                    display: (artwork.code ? `${artwork.code}-` : '') + (artwork.name || ''),
                    group: '作品',
                    pathLabel: `作品配色管理 -> ${(artwork.code ? `${artwork.code}-` : '') + (artwork.name || '')}`
                });
            }
        });

        searchIndex.schemes.forEach(scheme => {
            const schemeName = (scheme.name || '').toLowerCase();
            const artworkName = (scheme.artworkName || '').toLowerCase();
            const artworkCode = (scheme.artworkCode || '').toLowerCase();
            const combo = artworkCode && artworkName ? `${artworkCode}-${artworkName}` : (artworkCode || artworkName);
            const haystack = [schemeName, artworkName, artworkCode, combo];
            const match = multi
                ? tokens.every(token => haystack.some(hay => hay && hay.includes(token)))
                : haystack.some(hay => hay && hay.includes(qLower));
            if (match) {
                schemeMatches.push({
                    type: 'scheme',
                    id: scheme.id,
                    parentId: scheme.artworkId,
                    artworkName: scheme.artworkName,
                    artworkCode: scheme.artworkCode,
                    display: scheme.name,
                    group: '配色方案',
                    pathLabel: `作品配色管理 -> ${(scheme.artworkCode ? `${scheme.artworkCode}-` : '') + scheme.artworkName}-[${scheme.name}]`
                });
            }
        });

        if (multi && schemeMatches.length) {
            results.push(...schemeMatches);
        } else {
            results.push(...artworkMatches, ...schemeMatches);
        }

        searchIndex.rawMaterials.forEach(material => {
            const name = (material.name || '').toLowerCase();
            const match = multi
                ? tokens.every(token => name && name.includes(token))
                : (name && name.includes(qLower));
            if (match) {
                push({
                    type: 'rawMaterial',
                    id: material.id,
                    display: material.name,
                    group: '原料',
                    pathLabel: `颜色原料管理 -> ${material.name}`
                });
            }
        });

        const groupOrder = { '自配色': 1, '作品': 2, '配色方案': 3, '原料': 4 };
        results.sort((a, b) => {
            const ga = groupOrder[a.group] || 99;
            const gb = groupOrder[b.group] || 99;
            if (ga !== gb) return ga - gb;
            return (a.display || '').localeCompare(b.display || '', 'zh-CN');
        });

        const limited = results.slice(0, 60);
        globalSearchResults.value = limited;
        showSearchDropdown.value = !!limited.length;
        searchDebounceTimer = null;
    }

    function handleGlobalSearchInput(value) {
        globalSearchQuery.value = value;
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => buildSearchResults(), 200);
        if (value && !showSearchDropdown.value) showSearchDropdown.value = true;
        if (!value) globalSearchResults.value = [];
    }

    return {
        globalSearchQuery,
        globalSearchResults,
        showSearchDropdown,
        indexReady,
        registerDataset,
        handleGlobalSearchInput,
        openSearchDropdown,
        closeSearchDropdown,
        buildSearchResults
    };
}
