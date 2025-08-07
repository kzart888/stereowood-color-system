// 工具函数库
// 文件路径: frontend/js/utils/helpers.js
// 提供通用工具函数
// 被各组件文件调用

const helpers = {
    /**
     * 格式化日期为中文格式
     * @param {String} dateString - 日期字符串
     * @returns {String} 格式化后的日期
     */
    formatDate(dateString) {
        if (!dateString) return '未知';
        return new Date(dateString).toLocaleString('zh-CN');
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
    }
};

// 导出给其他文件使用
// 在浏览器环境中，这会创建一个全局变量 helpers