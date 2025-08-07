// 表单验证函数库
// 文件路径: frontend/js/utils/validators.js
// 提供各种表单字段的验证规则
// 被组件文件调用，用于Element Plus的表单验证

const validators = {
    /**
     * 验证颜色编号格式
     * @param {Array} customColors - 现有的自配颜色列表
     * @param {Number|null} currentId - 当前编辑的颜色ID（编辑时排除自身）
     * @returns {Function} Element Plus表单验证器函数
     * 验证规则：
     * 1. 检查编号是否重复
     * 2. 检查格式是否为：两个大写字母+三位数字（如：BU001）
     */
    validateColorCode(customColors, currentId = null) {
        return (rule, value, callback) => {
            if (value) {
                // 检查是否已存在（编辑时排除自身）
                const exists = customColors.some(color => 
                    color.color_code === value && 
                    color.id !== currentId
                );
                if (exists) {
                    callback(new Error('该颜色编号已存在！'));
                } else {
                    // 检查格式：两个大写字母+三位数字
                    const pattern = /^[A-Z]{2}\d{3}$/;
                    if (!pattern.test(value)) {
                        callback(new Error('颜色编号格式应为：两个大写字母+三位数字，如BU001'));
                    } else {
                        callback();
                    }
                }
            } else {
                callback();
            }
        };
    },
    
    /**
     * 验证颜色名称（用于蒙马特颜色/原料库）
     * @param {Array} montMarteColors - 现有的蒙马特颜色列表
     * @param {Number|null} currentId - 当前编辑的颜色ID（编辑时排除自身）
     * @returns {Function} Element Plus表单验证器函数
     * 验证规则：检查名称是否重复（不区分大小写）
     */
    validateColorName(montMarteColors, currentId = null) {
        return (rule, value, callback) => {
            if (value) {
                // 不区分大小写检查重复
                const exists = montMarteColors.some(color => 
                    color.name.toLowerCase() === value.toLowerCase() && 
                    color.id !== currentId
                );
                if (exists) {
                    callback(new Error('列表中已经存在该颜色！'));
                } else {
                    callback();
                }
            } else {
                callback();
            }
        };
    }
};

// 导出给其他文件使用
// 在浏览器环境中，这会创建一个全局变量 validators