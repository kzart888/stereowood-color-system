/* =========================================================
   Module: backend/services/classification-engine.js
   Responsibility: 配置化分类规则引擎核心服务
   Imports/Relations: Uses db from db/index
   Origin: Created for rule-based classification system (2025-08)
   Contract: Provides classification and code generation services
   Notes: 替代硬编码分类逻辑，实现可配置的规则系统
   Related: Replaces hardcoded logic in helpers.js and custom-colors.js
   ========================================================= */

const { db } = require('../db/index');

/**
 * 分类规则引擎类
 */
class ClassificationEngine {
  
  /**
   * 根据颜色名称自动分类
   * @param {string} colorName - 颜色名称
   * @param {string} colorCode - 颜色编号（可选，用于辅助判断）
   * @returns {Promise<Object>} { categoryId, confidence, ruleId, method }
   */
  async autoClassifyByName(colorName, colorCode = null) {
    return new Promise((resolve, reject) => {
      // 获取所有启用的自动分类规则，按优先级排序
      const sql = `
        SELECT cr.*, cc.code as category_code, cc.name as category_name
        FROM category_rules cr
        JOIN color_categories cc ON cr.target_category_id = cc.id
        WHERE cr.rule_type = 'auto_classification' 
          AND cr.is_active = true
        ORDER BY cr.priority ASC, cr.created_at ASC
      `;
      
      db.all(sql, async (err, rules) => {
        if (err) return reject(err);
        
        try {
          // 按优先级尝试每个规则
          for (const rule of rules) {
            const result = await this._testRule(rule, colorName, colorCode);
            if (result.matches) {
              return resolve({
                categoryId: rule.target_category_id,
                confidence: result.confidence,
                ruleId: rule.id,
                method: 'rule_engine',
                ruleName: rule.rule_name,
                categoryCode: rule.category_code,
                categoryName: rule.category_name
              });
            }
          }
          
          // 没有规则匹配，返回默认结果
          resolve({
            categoryId: null,
            confidence: 0,
            ruleId: null,
            method: 'no_match',
            ruleName: null,
            categoryCode: null,
            categoryName: null
          });
          
        } catch (testError) {
          reject(testError);
        }
      });
    });
  }
  
  /**
   * 生成颜色编号
   * @param {number} categoryId - 分类ID
   * @param {Array} existingCodes - 现有编号列表
   * @returns {Promise<string>} 生成的颜色编号
   */
  async generateColorCode(categoryId, existingCodes = []) {
    return new Promise((resolve, reject) => {
      // 获取该分类的编号生成规则
      const sql = `
        SELECT cr.*, cc.code as category_code
        FROM category_rules cr
        JOIN color_categories cc ON cr.target_category_id = cc.id
        WHERE cr.rule_type = 'color_code_generation' 
          AND cr.target_category_id = ?
          AND cr.is_active = true
        ORDER BY cr.priority ASC
        LIMIT 1
      `;
      
      db.get(sql, [categoryId], (err, rule) => {
        if (err) return reject(err);
        
        if (!rule) {
          // 没有配置规则，使用传统方式（分类代码+数字）
          return this._generateTraditionalCode(categoryId, existingCodes, resolve, reject);
        }
        
        try {
          const generatedCode = this._generateCodeByRule(rule, existingCodes);
          resolve(generatedCode);
        } catch (genError) {
          reject(genError);
        }
      });
    });
  }
  
  /**
   * 记录分类决策日志
   * @param {number} colorId - 颜色ID
   * @param {number} originalCategoryId - 原分类ID
   * @param {number} newCategoryId - 新分类ID
   * @param {string} method - 分类方法
   * @param {number} ruleId - 规则ID（可选）
   * @param {number} confidence - 置信度（可选）
   * @param {string} colorName - 颜色名称
   * @param {string} colorCode - 颜色编号
   */
  async logClassification(colorId, originalCategoryId, newCategoryId, method, ruleId = null, confidence = null, colorName = '', colorCode = '') {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO color_classification_logs 
        (color_id, original_category_id, new_category_id, classification_method, rule_id, confidence_score, color_name, color_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [colorId, originalCategoryId, newCategoryId, method, ruleId, confidence, colorName, colorCode], function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });
  }
  
  /**
   * 获取分类历史和统计
   * @param {number} limit - 限制条数
   * @returns {Promise<Array>} 分类日志列表
   */
  async getClassificationHistory(limit = 100) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          ccl.*,
          cc1.name as original_category_name,
          cc1.code as original_category_code,
          cc2.name as new_category_name,
          cc2.code as new_category_code,
          cr.rule_name
        FROM color_classification_logs ccl
        LEFT JOIN color_categories cc1 ON ccl.original_category_id = cc1.id
        LEFT JOIN color_categories cc2 ON ccl.new_category_id = cc2.id
        LEFT JOIN category_rules cr ON ccl.rule_id = cr.id
        ORDER BY ccl.created_at DESC
        LIMIT ?
      `;
      
      db.all(sql, [limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
  
  /**
   * 测试规则是否匹配
   * @private
   */
  async _testRule(rule, colorName, colorCode) {
    switch (rule.source_type) {
      case 'category_code':
        return this._testCategoryCodeRule(rule, colorName, colorCode);
      case 'color_name_pattern':
        return this._testNamePatternRule(rule, colorName);
      case 'manual':
        return { matches: false, confidence: 0 }; // 手动规则不参与自动分类
      default:
        return { matches: false, confidence: 0 };
    }
  }
  
  /**
   * 测试分类代码规则
   * @private
   */
  _testCategoryCodeRule(rule, colorName, colorCode) {
    const pattern = rule.pattern || rule.category_code;
    if (!pattern) return { matches: false, confidence: 0 };
    
    // 检查颜色名称开头是否匹配分类代码
    const upperColorName = colorName.toUpperCase();
    const upperPattern = pattern.toUpperCase();
    
    if (upperColorName.startsWith(upperPattern)) {
      return { matches: true, confidence: 0.9 };
    }
    
    // 检查编号开头是否匹配
    if (colorCode) {
      const upperColorCode = colorCode.toUpperCase();
      if (upperColorCode.startsWith(upperPattern)) {
        return { matches: true, confidence: 0.8 };
      }
    }
    
    return { matches: false, confidence: 0 };
  }
  
  /**
   * 测试名称模式规则
   * @private
   */
  _testNamePatternRule(rule, colorName) {
    if (!rule.pattern) return { matches: false, confidence: 0 };
    
    try {
      const regex = new RegExp(rule.pattern, 'i'); // 不区分大小写
      const matches = regex.test(colorName);
      return { 
        matches, 
        confidence: matches ? 0.7 : 0 // 模式匹配的置信度稍低
      };
    } catch (regexError) {
      console.warn(`规则 ${rule.rule_name} 的正则表达式无效:`, regexError.message);
      return { matches: false, confidence: 0 };
    }
  }
  
  /**
   * 使用传统方式生成编号
   * @private
   */
  _generateTraditionalCode(categoryId, existingCodes, resolve, reject) {
    // 获取分类信息
    db.get('SELECT code FROM color_categories WHERE id = ?', [categoryId], (err, category) => {
      if (err) return reject(err);
      if (!category) return reject(new Error('分类不存在'));
      
      const prefix = category.code;
      
      // 提取现有编号的数字部分
      const numbers = existingCodes
        .filter(code => code && code.toUpperCase().startsWith(prefix.toUpperCase()))
        .map(code => {
          const match = code.match(/\d+$/);
          return match ? parseInt(match[0]) : 0;
        })
        .filter(num => num > 0);
      
      // 生成下一个编号
      const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      const paddedNumber = String(nextNumber).padStart(3, '0');
      const newCode = `${prefix}${paddedNumber}`;
      
      resolve(newCode);
    });
  }
  
  /**
   * 根据规则生成编号
   * @private
   */
  _generateCodeByRule(rule, existingCodes) {
    // 目前保持与传统方式相同，未来可扩展更复杂的生成规则
    const prefix = rule.category_code;
    
    // 提取现有编号的数字部分
    const numbers = existingCodes
      .filter(code => code && code.toUpperCase().startsWith(prefix.toUpperCase()))
      .map(code => {
        const match = code.match(/\d+$/);
        return match ? parseInt(match[0]) : 0;
      })
      .filter(num => num > 0);
    
    // 生成下一个编号
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const paddedNumber = String(nextNumber).padStart(3, '0');
    
    if (rule.pattern) {
      // 如果有自定义模式，使用模式生成
      return rule.pattern.replace('{prefix}', prefix).replace('{number}', paddedNumber);
    } else {
      // 使用默认模式
      return `${prefix}${paddedNumber}`;
    }
  }
}

// 导出单例
module.exports = new ClassificationEngine();