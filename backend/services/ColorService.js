/* =========================================================
   模块：services/ColorService.js
   职责：自配颜色管理的业务逻辑层
   职能：CRUD操作、查重检测、强制合并、历史记录管理
   依赖：db/index.js
   说明：将路由中的业务逻辑抽离，使路由专注于参数验证和响应格式化
   ========================================================= */

const { db } = require('../db/index')
const path = require('path')
const fs = require('fs')

class ColorService {
  /**
   * 获取所有自配颜色（包含分类信息）
   */
  static async getAllColors() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT cc.*, cat.name as category_name, cat.code as category_code
        FROM custom_colors cc
        LEFT JOIN color_categories cat ON cc.category_id = cat.id
        ORDER BY cc.color_code
      `
      db.all(sql, [], (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }

  /**
   * 根据ID获取单个自配颜色
   */
  static async getColorById(colorId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT cc.*, cat.name as category_name, cat.code as category_code
        FROM custom_colors cc
        LEFT JOIN color_categories cat ON cc.category_id = cat.id
        WHERE cc.id = ?
      `
      db.get(sql, [colorId], (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  }

  /**
   * 创建新的自配颜色
   */
  static async createColor(colorData) {
    const { category_id, color_code, image_path, formula, applicable_layers } = colorData
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO custom_colors (category_id, color_code, image_path, formula, applicable_layers)
         VALUES (?, ?, ?, ?, ?)`,
        [category_id, color_code, image_path, formula, applicable_layers],
        function (err) {
          if (err) reject(err)
          else {
            resolve({
              id: this.lastID,
              category_id,
              color_code,
              image_path,
              formula,
              applicable_layers
            })
          }
        }
      )
    })
  }

  /**
   * 更新自配颜色
   */
  static async updateColor(colorId, colorData) {
    const { category_id, color_code, image_path, formula, applicable_layers } = colorData
    
    // 先获取旧数据
    const oldData = await this.getColorById(colorId)
    if (!oldData) {
      throw new Error('自配颜色不存在')
    }

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE custom_colors SET 
            category_id = ?, 
            color_code = ?, 
            image_path = ?, 
            formula = ?, 
            applicable_layers = ?, 
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [category_id, color_code, image_path, formula, applicable_layers, colorId],
        function (err) {
          if (err) reject(err)
          else {
            // 如果图片路径发生变化，删除旧图片
            if (image_path !== oldData.image_path && oldData.image_path) {
              const oldImagePath = path.join(__dirname, '..', 'uploads', oldData.image_path)
              fs.unlink(oldImagePath, () => {}) // 静默删除，不影响主流程
            }
            resolve({ id: colorId, ...colorData })
          }
        }
      )
    })
  }

  /**
   * 删除自配颜色（包含引用检查和历史记录保存）
   */
  static async deleteColor(colorId) {
    // 获取颜色信息
    const color = await this.getColorById(colorId)
    if (!color) {
      throw new Error('颜色不存在')
    }

    // 检查是否被配色方案引用
    const isReferenced = await this.checkColorReferences(colorId)
    if (isReferenced.count > 0) {
      throw new Error('此颜色已被配色方案使用，无法删除')
    }

    // 保存到历史记录
    await this.saveToHistory(colorId, color)

    // 删除颜色记录
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM custom_colors WHERE id = ?', [colorId], function (err) {
        if (err) reject(err)
        else if (this.changes === 0) reject(new Error('颜色不存在'))
        else {
          // 删除图片文件
          if (color.image_path) {
            const imagePath = path.join(__dirname, '..', 'uploads', color.image_path)
            fs.unlink(imagePath, (err) => {
              if (err) console.error('删除图片文件失败:', err)
              else console.log('旧图片已删除:', color.image_path)
            })
          }
          resolve({
            success: true,
            message: '自配颜色删除成功',
            deletedColor: color.color_code
          })
        }
      })
    })
  }

  /**
   * 检查颜色是否被引用
   */
  static async checkColorReferences(colorId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM scheme_layers WHERE custom_color_id = ?`,
        [colorId],
        (err, result) => {
          if (err) reject(err)
          else resolve(result || { count: 0 })
        }
      )
    })
  }

  /**
   * 保存颜色到历史记录
   */
  static async saveToHistory(colorId, colorData) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO custom_colors_history 
            (custom_color_id, color_code, image_path, formula, applicable_layers) 
         VALUES (?, ?, ?, ?, ?)`,
        [colorId, colorData.color_code, colorData.image_path, colorData.formula, colorData.applicable_layers],
        (err) => {
          if (err) {
            console.error('保存历史记录失败:', err)
            // 历史记录保存失败不影响主操作
          }
          resolve()
        }
      )
    })
  }

  /**
   * 获取颜色历史记录
   */
  static async getColorHistory(colorId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM custom_colors_history WHERE custom_color_id = ? ORDER BY archived_at DESC',
        [colorId],
        (err, rows) => {
          if (err) reject(err)
          else resolve(rows)
        }
      )
    })
  }

  /**
   * 强制合并重复颜色（更新引用后删除重复项）
   */
  static async forceMerge(mergeData) {
    const { keepId, removeIds, signature } = mergeData
    
    if (!keepId || !Array.isArray(removeIds) || !removeIds.length) {
      throw new Error('合并参数不完整')
    }

    // 验证保留记录存在
    const keepRecord = await this.getColorById(keepId)
    if (!keepRecord) {
      throw new Error('保留记录不存在')
    }

    // 获取要删除的记录
    const removeRecords = await Promise.all(
      removeIds.map(id => this.getColorById(id))
    )
    
    if (removeRecords.some(r => !r)) {
      throw new Error('部分删除记录不存在')
    }

    // 验证签名一致性（如果提供了签名）
    if (signature) {
      // 这里可以添加签名验证逻辑
      console.log('签名验证:', signature)
    }

    return new Promise((resolve, reject) => {
      const placeholders = removeIds.map(() => '?').join(',')
      
      // 统计被影响的引用数量
      db.get(
        `SELECT COUNT(*) AS cnt FROM scheme_layers WHERE custom_color_id IN (${placeholders})`,
        removeIds,
        (err, countResult) => {
          if (err) return reject(err)
          
          const affectedReferences = countResult ? Number(countResult.cnt) || 0 : 0
          
          db.serialize(() => {
            db.run('BEGIN')
            
            // 1. 更新所有引用到保留记录
            db.run(
              `UPDATE scheme_layers SET custom_color_id = ? WHERE custom_color_id IN (${placeholders})`,
              [keepId, ...removeIds],
              function (updateErr) {
                if (updateErr) {
                  db.run('ROLLBACK')
                  return reject(updateErr)
                }
                
                // 2. 保存要删除的记录到历史表
                const historyStmt = db.prepare(
                  `INSERT INTO custom_colors_history (custom_color_id, color_code, image_path, formula, applicable_layers) 
                   VALUES (?, ?, ?, ?, ?)`
                )
                
                removeRecords.forEach(record => {
                  historyStmt.run([
                    record.id,
                    record.color_code,
                    record.image_path,
                    record.formula,
                    record.applicable_layers
                  ])
                })
                
                historyStmt.finalize(histErr => {
                  if (histErr) {
                    db.run('ROLLBACK')
                    return reject(histErr)
                  }
                  
                  // 3. 删除重复记录
                  db.run(
                    `DELETE FROM custom_colors WHERE id IN (${placeholders})`,
                    removeIds,
                    function (deleteErr) {
                      if (deleteErr) {
                        db.run('ROLLBACK')
                        return reject(deleteErr)
                      }
                      
                      // 4. 更新相关配色方案的更新时间
                      db.run(
                        `UPDATE color_schemes SET updated_at = CURRENT_TIMESTAMP 
                         WHERE id IN (SELECT DISTINCT scheme_id FROM scheme_layers WHERE custom_color_id = ?)`,
                        [keepId],
                        (schemeErr) => {
                          if (schemeErr) {
                            db.run('ROLLBACK')
                            return reject(schemeErr)
                          }
                          
                          // 提交事务
                          db.run('COMMIT', (commitErr) => {
                            if (commitErr) return reject(commitErr)
                            
                            resolve({
                              success: true,
                              updatedLayers: affectedReferences,
                              deleted: removeIds.length
                            })
                          })
                        }
                      )
                    }
                  )
                })
              }
            )
          })
        }
      )
    })
  }

  /**
   * 根据配方内容查找潜在重复项
   */
  static async findDuplicatesByFormula(formula) {
    return new Promise((resolve, reject) => {
      // 这里可以实现基于配方的模糊匹配查找
      // 目前返回空数组，具体的重复检测逻辑在前端实现
      resolve([])
    })
  }

  /**
   * 批量删除颜色
   */
  static async deleteColors(colorIds) {
    if (!Array.isArray(colorIds) || !colorIds.length) {
      throw new Error('颜色ID列表不能为空')
    }

    const results = []
    
    for (const colorId of colorIds) {
      try {
        const result = await this.deleteColor(colorId)
        results.push({ id: colorId, success: true, result })
      } catch (error) {
        results.push({ id: colorId, success: false, error: error.message })
      }
    }
    
    return results
  }
}

module.exports = ColorService