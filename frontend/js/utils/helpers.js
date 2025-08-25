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
    /**
     * 格式化日期
     * @param {String} dateString - 日期字符串
     * @param {String} format - 格式类型: 'locale'(本地化格式) 或 'simple'(YYYY-MM-DD HH:MM)
     * @returns {String} 格式化后的日期
     */
    formatDate(dateString, format = 'simple') {
        if (!dateString) return '未知';
        
        // 确保正确解析时间字符串，处理时区问题
        let date;
        if (dateString.includes('T') || dateString.includes('Z')) {
            // ISO格式或带时区的格式
            date = new Date(dateString);
        } else {
            // SQLite的CURRENT_TIMESTAMP可能返回UTC时间，需要手动转换为本地时间
            date = new Date(dateString + ' UTC'); // 明确指定为UTC时间，然后转换为本地时间
        }
        
        if (isNaN(date.getTime())) return '未知';
        
        if (format === 'locale') {
            return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        } else {
            // simple format: YYYY-MM-DD HH:MM:SS (显示本地时间)
            const pad = (n) => (n < 10 ? '0' + n : '' + n);
            return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
     * @returns {Promise<String>} 生成的颜色编号（如：BU001）
     * 规则：优先使用规则引擎生成，回退到传统方式
     */
    async generateColorCode(categories, customColors, categoryId) {
        try {
            // 准备现有编号列表
            const existingCodes = customColors.map(c => c.color_code).filter(Boolean);
            
            // 调用后端规则引擎API生成编号
            const response = await fetch('/api/classification-rules/generate-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryId: categoryId,
                    existingCodes: existingCodes
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.colorCode;
            } else {
                // 如果API调用失败，使用传统方式作为后备
                console.warn('规则引擎API调用失败，使用传统方式生成编号');
                return this._generateColorCodeTraditional(categories, customColors, categoryId);
            }
        } catch (error) {
            console.warn('调用规则引擎失败:', error.message, '，使用传统方式生成编号');
            return this._generateColorCodeTraditional(categories, customColors, categoryId);
        }
    },
    
    /**
     * 传统方式生成颜色编号（后备方案）
     * @private
     */
    _generateColorCodeTraditional(categories, customColors, categoryId) {
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
     * 自动分类颜色（基于规则引擎）
     * @param {String} colorName - 颜色名称
     * @param {String} colorCode - 颜色编号（可选）
     * @returns {Promise<Object>} { categoryId, confidence, method, ruleName }
     */
    async autoClassifyColor(colorName, colorCode = null) {
        try {
            const response = await fetch('/api/classification-rules/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    colorName: colorName,
                    colorCode: colorCode
                })
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                console.warn('自动分类API调用失败');
                return { categoryId: null, confidence: 0, method: 'api_failed' };
            }
        } catch (error) {
            console.warn('自动分类调用失败:', error.message);
            return { categoryId: null, confidence: 0, method: 'error' };
        }
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