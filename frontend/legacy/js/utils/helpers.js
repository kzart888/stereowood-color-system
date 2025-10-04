// 工具函数库
// 文件路径: frontend/js/utils/helpers.js
// 提供通用工具函数
// 被各组件文件调用

const helpers = {
    /**
     * 构建上传图片的完整访问 URL
     * 兼容：
     *  - 传入已是 http(s) 绝对地址
     *  - 传入包含 uploads/ 前缀路径
     *  - 仅文件名（数据库保存的情况）
    * @param {String} baseURL 例如 window.location.origin
     * @param {String} raw 后端存储的文件名 / 路径
     */
    buildUploadURL(baseURL, raw) {
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw; // absolute URL
    const cleaned = String(raw).replace(/^\/+/, '');
    const withPrefix = cleaned.startsWith('uploads/') ? cleaned : `uploads/${cleaned}`;
    return `${baseURL || window.location.origin}/${withPrefix}`;
    },
    normalizePantoneCode(value) {
        if (value === null || value === undefined) {
            return null;
        }
        const raw = String(value).trim();
        if (!raw) {
            return null;
        }
        let code = raw.replace(/^PANTON(E)?\s+/i, '');
        code = code.replace(/\s+/g, ' ').trim();
        const suffixMatch = code.match(/^(.*?)(\s+)?([cCuU])$/);
        if (suffixMatch) {
            const base = suffixMatch[1].trim();
            const suffix = suffixMatch[3].toUpperCase();
            const baseCompact = base.replace(/\s+/g, '');
            if (/^\d+[A-Z]?$/i.test(baseCompact)) {
                return `${baseCompact.toUpperCase()}${suffix}`;
            }
            return `${base} ${suffix}`.replace(/\s+/g, ' ').trim();
        }
        return code;
    },
    /**
     * 格式化日期
     * @param {String} dateString - 日期字符串
     * @param {String} format - 格式类型: 'locale'(本地化格式) 或 'simple'(YYYY-MM-DD HH:MM)
     * @returns {String} 格式化后的日期
     */
    formatDate(dateString, format = 'simple') {
        if (!dateString) return '未知';
        
        // Handle UTC time from server - ensure proper timezone conversion
        let date = new Date(dateString);
        
        // If the date string doesn't include timezone info and looks like UTC (ends with Z or is ISO format without timezone)
        if (!dateString.includes('+') && !dateString.includes('-08:00') && !dateString.includes('GMT')) {
            // Assume it's UTC and needs conversion to local time
            if (!dateString.endsWith('Z')) {
                date = new Date(dateString + 'Z');
            }
        }
        
        if (isNaN(date.getTime())) return '未知';
        
        if (format === 'locale') {
            return date.toLocaleString('zh-CN', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        } else {
            // simple format: YYYY-MM-DD HH:MM - using local time
            const pad = (n) => (n < 10 ? '0' + n : '' + n);
            return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
    },
    
    /**
     * 格式化作品标题
     * @param {Object} artwork - 作品对象
     * @returns {String} 格式化后的标题
     */
    formatArtworkTitle(artwork) {
        if (!artwork) return '';
        const code = artwork.code || artwork.no || '';
        const name = artwork.name || artwork.title || '';
        if (code && name) return `${code}-${name}`;
        return code || name || `作品#${artwork.id}`;
    },
    
    /**
     * 滚动位置管理
     * 用于在数据更新后保持页面滚动位置
     */
    scrollPosition: 0,
    saveScrollPosition() {
        this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    },
    restoreScrollPosition() {
        // 修复：移除Vue.nextTick，改用setTimeout
        setTimeout(() => {
            window.scrollTo(0, this.scrollPosition);
        }, 0);
    },
    
    /**
     * 生成颜色编号
     * @param {Array} categories - 颜色分类列表
     * @param {Array} customColors - 现有自配颜色列表
     * @param {Number} categoryId - 分类ID
     * @returns {String} 生成的颜色编号（如：BU001）
     * 规则：找到该分类下最大编号，+1生成新编号
     */
    generateColorCode(categories, customColors, categoryId) {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return '';
        
        // 获取该分类下的所有颜色
        const categoryColors = customColors.filter(c => c.category_id === categoryId);
        
        if (categoryColors.length === 0) {
            // 该分类下没有颜色，从001开始
            return `${category.code}001`;
        }
        
        // 提取所有编号的数字部分
        const numbers = categoryColors
            .map(color => {
                const match = color.color_code.match(/\d+$/);
                return match ? parseInt(match[0]) : 0;
            })
            .filter(num => num > 0);
        
        if (numbers.length === 0) {
            return `${category.code}001`;
        }
        
        // 找最大编号并+1
        const maxNumber = Math.max(...numbers);
        const nextNumber = maxNumber + 1;
        const paddedNumber = String(nextNumber).padStart(3, '0');
        
        return `${category.code}${paddedNumber}`;
    },
    
    /**
     * 名称排序比较函数
     * @param {String} nameA - 名称A
     * @param {String} nameB - 名称B
     * @returns {Number} 比较结果（-1, 0, 1）
     * 排序规则：特殊字符 < 数字 < 英文 < 中文
     */
    compareNames(nameA, nameB) {
        // 判断字符类型
        const getCharType = (str) => {
            if (!str || str.length === 0) return 1;
            const firstChar = str[0];
            const code = firstChar.charCodeAt(0);
            
            // 判断字符类型
            if (code < 48 || (code > 57 && code < 65) || (code > 90 && code < 97) || (code > 122 && code < 0x4e00)) {
                return 1; // 特殊字符
            }
            if (code >= 48 && code <= 57) {
                return 2; // 数字
            }
            if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
                return 3; // 英文
            }
            if (code >= 0x4e00 && code <= 0x9fff) {
                return 4; // 中文
            }
            return 1;
        };
        
        const typeA = getCharType(nameA);
        const typeB = getCharType(nameB);
        
        // 不同类型按优先级排序
        if (typeA !== typeB) {
            return typeA - typeB;
        }
        
        // 同类型内部排序
        if (typeA === 4) {
            // 中文按拼音排序
            return nameA.localeCompare(nameB, 'zh-CN', { numeric: true });
        } else if (typeA === 2) {
            // 数字按数值排序
            const numA = parseInt(nameA.match(/^\d+/)[0]);
            const numB = parseInt(nameB.match(/^\d+/)[0]);
            if (numA !== numB) {
                return numA - numB;
            }
            return nameA.localeCompare(nameB);
        } else {
            // 其他按字典序
            return nameA.localeCompare(nameB);
        }
    },
    /**
     * 通用双级危险操作确认（例如删除）
     * @param {Object} opts { firstMessage, secondMessage, firstTitle, secondTitle, firstType, secondType, firstConfirmText, secondConfirmText }
     * 未提供的字段使用默认中文文案
     * @returns {Promise<Boolean>} true=双重确认完成
     */
    async doubleDangerConfirm(opts = {}) {
        const {
            firstMessage = '确定执行该操作吗？',
            secondMessage = '该操作不可撤销，确认继续？',
            firstTitle = '危险操作',
            secondTitle = '再次确认',
            firstType = 'warning',
            secondType = 'error',
            firstConfirmText = '继续',
            secondConfirmText = '确认执行'
        } = opts;
        try {
            await ElementPlus.ElMessageBox.confirm(firstMessage, firstTitle, {
                confirmButtonText: firstConfirmText,
                cancelButtonText: '取消',
                type: firstType
            });
        } catch(e) { return false; }
        try {
            await ElementPlus.ElMessageBox.confirm(secondMessage, secondTitle, {
                confirmButtonText: secondConfirmText,
                cancelButtonText: '取消',
                type: secondType
            });
        } catch(e) { return false; }
        return true;
    }
};

// 导出给其他文件使用
// 在浏览器环境中，这会创建一个全局变量 helpers
if (typeof window !== 'undefined') {
    window.helpers = helpers;
}