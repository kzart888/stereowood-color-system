/* =========================================================
   模块：services/ArtworkService.js
   职责：作品配色管理的业务逻辑层
   职能：作品CRUD、配色方案管理、层级映射处理
   依赖：db/index.js
   说明：将路由中的业务逻辑抽离，使路由专注于参数验证和响应格式化
   ========================================================= */

const { db } = require('../db/index')
const path = require('path')
const fs = require('fs')

class ArtworkService {
  /**
   * 获取所有作品及其配色方案
   */
  static async getAllArtworks() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM artworks ORDER BY code', [], (err, artworks) => {
        if (err) return reject(err)

        // 获取所有配色方案
        db.all(
          `SELECT cs.*, a.code as artwork_code 
           FROM color_schemes cs 
           LEFT JOIN artworks a ON cs.artwork_id = a.id`,
          [],
          (err2, schemes) => {
            if (err2) return reject(err2)

            const schemeIds = schemes.map(s => s.id)
            if (schemeIds.length === 0) {
              const result = artworks.map(art => ({ ...art, schemes: [] }))
              return resolve(result)
            }

            // 获取所有层级映射
            const placeholders = schemeIds.map(() => '?').join(',')
            db.all(
              `SELECT sl.scheme_id, sl.layer_number AS layer, COALESCE(cc.color_code,'') AS colorCode
               FROM scheme_layers sl
               LEFT JOIN custom_colors cc ON cc.id = sl.custom_color_id
               WHERE sl.scheme_id IN (${placeholders})
               ORDER BY sl.scheme_id ASC, sl.layer_number ASC`,
              schemeIds,
              (err3, layerRows) => {
                if (err3) return reject(err3)

                // 按方案ID分组层级数据
                const layersByScheme = new Map()
                layerRows.forEach(r => {
                  if (!layersByScheme.has(r.scheme_id)) {
                    layersByScheme.set(r.scheme_id, [])
                  }
                  layersByScheme.get(r.scheme_id).push({
                    layer: Number(r.layer),
                    colorCode: r.colorCode || ''
                  })
                })

                // 组装最终结果
                const result = artworks.map(art => {
                  const relatedSchemes = schemes.filter(s => s.artwork_id === art.id)
                  return {
                    ...art,
                    schemes: relatedSchemes.map(s => ({
                      id: s.id,
                      scheme_name: s.scheme_name,
                      name: s.scheme_name, // 别名兼容
                      thumbnail_path: s.thumbnail_path,
                      updated_at: s.updated_at,
                      layers: layersByScheme.get(s.id) || []
                    }))
                  }
                })

                resolve(result)
              }
            )
          }
        )
      })
    })
  }

  /**
   * 根据ID获取作品详情（包含配色方案）
   */
  static async getArtworkById(artworkId) {
    return new Promise((resolve, reject) => {
      // 获取作品基本信息
      db.get('SELECT * FROM artworks WHERE id = ?', [artworkId], (err, artwork) => {
        if (err) return reject(err)
        if (!artwork) return resolve(null)

        // 获取该作品的所有配色方案
        db.all(
          `SELECT * FROM color_schemes WHERE artwork_id = ? ORDER BY id`,
          [artworkId],
          (err, schemes) => {
            if (err) return reject(err)

            // 获取每个配色方案的层数据
            const schemePromises = schemes.map(scheme => {
              return new Promise((resolveScheme) => {
                db.all(
                  `SELECT 
                      sl.layer_number,
                      sl.custom_color_id,
                      cc.color_code,
                      cc.formula
                   FROM scheme_layers sl
                   LEFT JOIN custom_colors cc ON sl.custom_color_id = cc.id
                   WHERE sl.scheme_id = ?
                   ORDER BY sl.layer_number`,
                  [scheme.id],
                  (err, layers) => {
                    if (err) {
                      console.error('获取层数据失败:', err)
                      scheme.layers = []
                    } else {
                      scheme.layers = layers
                    }
                    resolveScheme(scheme)
                  }
                )
              })
            })

            Promise.all(schemePromises).then(schemesWithLayers => {
              artwork.schemes = schemesWithLayers
              resolve(artwork)
            })
          }
        )
      })
    })
  }

  /**
   * 创建新作品
   */
  static async createArtwork(artworkData) {
    const { code, name } = artworkData

    // 验证参数
    if (!code || !name) {
      throw new Error('作品编号和名称不能为空')
    }

    // 验证编号格式
    if (!/^[A-Z0-9]{3,5}$/.test(code)) {
      throw new Error('作品编号格式不合法')
    }

    // 验证名称格式
    if (!/^[A-Za-z0-9\u4e00-\u9fa5 ]+$/.test(name) || name.includes('-')) {
      throw new Error('作品名称格式不合法')
    }

    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO artworks (code, name) VALUES (?, ?)',
        [code, name],
        function (err) {
          if (err) {
            if (err.message && /UNIQUE/i.test(err.message)) {
              reject(new Error('该作品编号已存在'))
            } else {
              reject(err)
            }
          } else {
            resolve({
              id: this.lastID,
              code,
              name
            })
          }
        }
      )
    })
  }

  /**
   * 删除作品（需检查是否有配色方案）
   */
  static async deleteArtwork(artworkId) {
    // 检查是否有配色方案
    const schemeCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) AS cnt FROM color_schemes WHERE artwork_id = ?',
        [artworkId],
        (err, row) => {
          if (err) reject(err)
          else resolve(row ? row.cnt : 0)
        }
      )
    })

    if (schemeCount > 0) {
      throw new Error('该作品下仍有配色方案，无法删除')
    }

    return new Promise((resolve, reject) => {
      db.run('DELETE FROM artworks WHERE id = ?', [artworkId], function (err) {
        if (err) reject(err)
        else if (this.changes === 0) reject(new Error('作品不存在'))
        else resolve({ success: true })
      })
    })
  }

  /**
   * 添加配色方案
   */
  static async addScheme(artworkId, schemeData) {
    const { name, layers = [], thumbnail_path } = schemeData

    if (!name || !name.trim()) {
      throw new Error('方案名称不能为空')
    }

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN')

        // 插入配色方案
        db.run(
          `INSERT INTO color_schemes(artwork_id, scheme_name, thumbnail_path) VALUES (?, ?, ?)`,
          [artworkId, name.trim(), thumbnail_path],
          function (err) {
            if (err) {
              db.run('ROLLBACK')
              return reject(err)
            }

            const schemeId = this.lastID

            // 批量插入层映射
            if (layers.length > 0) {
              const insertLayer = db.prepare(
                `INSERT INTO scheme_layers(scheme_id, layer_number, custom_color_id)
                 VALUES (?, ?, (SELECT id FROM custom_colors WHERE color_code = ?))`
              )

              layers.forEach(mapping => {
                const layer = Number(mapping.layer)
                const code = String(mapping.colorCode || '').trim()
                if (Number.isFinite(layer) && layer > 0) {
                  insertLayer.run([schemeId, layer, code])
                }
              })

              insertLayer.finalize((finErr) => {
                if (finErr) {
                  db.run('ROLLBACK')
                  return reject(finErr)
                }

                // 更新方案的更新时间并提交
                db.run(
                  `UPDATE color_schemes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                  [schemeId],
                  () => {
                    db.run('COMMIT', () => resolve({ id: schemeId }))
                  }
                )
              })
            } else {
              // 没有层映射，直接提交
              db.run('COMMIT', () => resolve({ id: schemeId }))
            }
          }
        )
      })
    })
  }

  /**
   * 更新配色方案
   */
  static async updateScheme(artworkId, schemeId, schemeData) {
    const { name, layers = [], thumbnail_path, existingThumbnailPath } = schemeData

    if (!name || !name.trim()) {
      throw new Error('方案名称不能为空')
    }

    // 查询现有方案信息
    const existingScheme = await new Promise((resolve, reject) => {
      db.get(
        `SELECT thumbnail_path FROM color_schemes WHERE id = ? AND artwork_id = ?`,
        [schemeId, artworkId],
        (err, row) => {
          if (err) reject(err)
          else resolve(row)
        }
      )
    })

    if (!existingScheme) {
      throw new Error('配色方案不存在')
    }

    const finalThumbnail = thumbnail_path || existingThumbnailPath || existingScheme.thumbnail_path || null

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN')

        // 更新配色方案基本信息
        db.run(
          `UPDATE color_schemes 
           SET scheme_name = ?, thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND artwork_id = ?`,
          [name.trim(), finalThumbnail, schemeId, artworkId],
          (updateErr) => {
            if (updateErr) {
              db.run('ROLLBACK')
              return reject(updateErr)
            }

            // 删除现有层映射
            db.run(
              `DELETE FROM scheme_layers WHERE scheme_id = ?`,
              [schemeId],
              (deleteErr) => {
                if (deleteErr) {
                  db.run('ROLLBACK')
                  return reject(deleteErr)
                }

                // 重新插入层映射
                if (layers.length > 0) {
                  const insertLayer = db.prepare(
                    `INSERT INTO scheme_layers(scheme_id, layer_number, custom_color_id)
                     VALUES (?, ?, (SELECT id FROM custom_colors WHERE color_code = ?))`
                  )

                  layers.forEach(mapping => {
                    const layer = Number(mapping.layer)
                    const code = String(mapping.colorCode || '').trim()
                    if (Number.isFinite(layer) && layer > 0) {
                      insertLayer.run([schemeId, layer, code])
                    }
                  })

                  insertLayer.finalize((finErr) => {
                    if (finErr) {
                      db.run('ROLLBACK')
                      return reject(finErr)
                    }

                    db.run('COMMIT', () => {
                      // 如有新缩略图，删除旧文件
                      if (thumbnail_path && existingScheme.thumbnail_path && 
                          existingScheme.thumbnail_path !== finalThumbnail) {
                        const oldPath = path.join(__dirname, '..', 'uploads', existingScheme.thumbnail_path)
                        fs.unlink(oldPath, () => {}) // 静默删除
                      }
                      resolve({ success: true })
                    })
                  })
                } else {
                  // 没有层映射，直接提交
                  db.run('COMMIT', () => resolve({ success: true }))
                }
              }
            )
          }
        )
      })
    })
  }

  /**
   * 删除配色方案
   */
  static async deleteScheme(artworkId, schemeId) {
    // 获取方案信息（包含缩略图路径）
    const scheme = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM color_schemes WHERE id = ? AND artwork_id = ?',
        [schemeId, artworkId],
        (err, row) => {
          if (err) reject(err)
          else resolve(row)
        }
      )
    })

    if (!scheme) {
      throw new Error('配色方案不存在')
    }

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN')

        // 删除层映射
        db.run('DELETE FROM scheme_layers WHERE scheme_id = ?', [schemeId], (e1) => {
          if (e1) {
            db.run('ROLLBACK')
            return reject(e1)
          }

          // 删除配色方案
          db.run('DELETE FROM color_schemes WHERE id = ?', [schemeId], (e2) => {
            if (e2) {
              db.run('ROLLBACK')
              return reject(e2)
            }

            db.run('COMMIT', () => {
              // 删除缩略图文件
              if (scheme.thumbnail_path) {
                const filePath = path.join(__dirname, '..', 'uploads', scheme.thumbnail_path)
                fs.unlink(filePath, () => {}) // 静默删除
              }
              resolve({ success: true })
            })
          })
        })
      })
    })
  }

  /**
   * 获取作品编号列表（用于调试）
   */
  static async getArtworkCodes() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, code, name FROM artworks ORDER BY code',
        [],
        (err, rows) => {
          if (err) reject(err)
          else resolve(rows)
        }
      )
    })
  }

  /**
   * 检查方案名称是否重复
   */
  static async checkSchemeNameDuplicate(artworkId, schemeName, excludeSchemeId = null) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT COUNT(*) as count FROM color_schemes WHERE artwork_id = ? AND scheme_name = ?'
      let params = [artworkId, schemeName]

      if (excludeSchemeId) {
        sql += ' AND id != ?'
        params.push(excludeSchemeId)
      }

      db.get(sql, params, (err, result) => {
        if (err) reject(err)
        else resolve((result?.count || 0) > 0)
      })
    })
  }

  /**
   * 获取指定方案的层级统计信息
   */
  static async getSchemeLayerStats(schemeId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
            sl.layer_number,
            COUNT(*) as count,
            GROUP_CONCAT(cc.color_code) as color_codes
         FROM scheme_layers sl
         LEFT JOIN custom_colors cc ON sl.custom_color_id = cc.id
         WHERE sl.scheme_id = ?
         GROUP BY sl.layer_number
         ORDER BY sl.layer_number`,
        [schemeId],
        (err, rows) => {
          if (err) reject(err)
          else resolve(rows || [])
        }
      )
    })
  }
}

module.exports = ArtworkService