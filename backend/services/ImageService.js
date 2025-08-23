/* =========================================================
   模块：services/ImageService.js
   职责：图片处理服务 - 压缩、裁剪、格式转换
   职能：生成缩略图和预览图，删除原图以节省存储空间
   依赖：sharp图片处理库
   说明：统一处理所有图片上传后的压缩和优化
   ========================================================= */

const sharp = require('sharp')
const path = require('path')
const fs = require('fs').promises

class ImageService {
  // 图片尺寸配置
  static sizes = {
    thumbnail: 80,    // 缩略图尺寸
    preview: 320      // 预览图尺寸
  }

  /**
   * 处理上传的图片 - 生成缩略图和预览图
   * @param {String} originalPath - 原始图片路径
   * @param {String} filename - 文件名（不含扩展名）
   * @returns {Promise<Object>} 处理结果
   */
  static async processUploadedImage(originalPath, filename) {
    try {
      const uploadDir = path.dirname(originalPath)
      const ext = path.extname(originalPath)
      const baseName = filename || path.basename(originalPath, ext)

      // 生成文件名
      const thumbnailPath = path.join(uploadDir, `${baseName}_thumb${ext}`)
      const previewPath = path.join(uploadDir, `${baseName}_preview${ext}`)

      // 读取原图信息
      const image = sharp(originalPath)
      const metadata = await image.metadata()

      // 生成缩略图 (80x80)
      await image
        .clone()
        .resize(this.sizes.thumbnail, this.sizes.thumbnail, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 })
        .toFile(thumbnailPath)

      // 生成预览图 (320x320)
      await image
        .clone()
        .resize(this.sizes.preview, this.sizes.preview, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(previewPath)

      // 删除原图
      await fs.unlink(originalPath)

      return {
        success: true,
        original: {
          width: metadata.width,
          height: metadata.height,
          size: metadata.size
        },
        files: {
          thumbnail: path.basename(thumbnailPath),
          preview: path.basename(previewPath)
        }
      }
    } catch (error) {
      console.error('图片处理失败:', error)
      throw new Error(`图片处理失败: ${error.message}`)
    }
  }

  /**
   * 批量处理现有图片（迁移用）
   * @param {String} uploadsDir - 上传目录路径
   */
  static async migrateExistingImages(uploadsDir) {
    try {
      const files = await fs.readdir(uploadsDir)
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file) && 
        !file.includes('_thumb') && 
        !file.includes('_preview')
      )

      const results = []
      
      for (const file of imageFiles) {
        try {
          const filePath = path.join(uploadsDir, file)
          const baseName = path.basename(file, path.extname(file))
          
          const result = await this.processUploadedImage(filePath, baseName)
          results.push({
            original: file,
            result
          })
          
          console.log(`已处理图片: ${file}`)
        } catch (error) {
          console.error(`处理图片 ${file} 失败:`, error)
          results.push({
            original: file,
            error: error.message
          })
        }
      }

      return results
    } catch (error) {
      console.error('批量迁移图片失败:', error)
      throw error
    }
  }

  /**
   * 删除图片文件（包括缩略图和预览图）
   * @param {String} uploadsDir - 上传目录路径
   * @param {String} imagePath - 图片路径（可能是缩略图或预览图）
   */
  static async deleteImageFiles(uploadsDir, imagePath) {
    if (!imagePath) return

    try {
      const baseName = imagePath.replace(/_thumb|_preview/, '').replace(/\.[^.]+$/, '')
      const ext = path.extname(imagePath) || '.jpg'

      // 要删除的文件列表
      const filesToDelete = [
        `${baseName}${ext}`,           // 原图（如果存在）
        `${baseName}_thumb${ext}`,     // 缩略图
        `${baseName}_preview${ext}`    // 预览图
      ]

      for (const filename of filesToDelete) {
        const fullPath = path.join(uploadsDir, filename)
        try {
          await fs.unlink(fullPath)
          console.log(`已删除图片文件: ${filename}`)
        } catch (error) {
          // 文件不存在时忽略错误
          if (error.code !== 'ENOENT') {
            console.error(`删除文件 ${filename} 失败:`, error)
          }
        }
      }
    } catch (error) {
      console.error('删除图片文件失败:', error)
    }
  }

  /**
   * 获取图片URL（根据类型返回缩略图或预览图）
   * @param {String} imagePath - 存储的图片路径
   * @param {String} type - 图片类型 'thumbnail' | 'preview'
   * @returns {String} 完整的图片路径
   */
  static getImageUrl(imagePath, type = 'thumbnail') {
    if (!imagePath) return null

    const baseName = imagePath.replace(/_thumb|_preview/, '').replace(/\.[^.]+$/, '')
    const ext = path.extname(imagePath) || '.jpg'
    
    const suffix = type === 'preview' ? '_preview' : '_thumb'
    return `${baseName}${suffix}${ext}`
  }

  /**
   * 检查图片文件是否存在
   * @param {String} uploadsDir - 上传目录路径
   * @param {String} imagePath - 图片路径
   * @returns {Promise<Boolean>} 文件是否存在
   */
  static async imageExists(uploadsDir, imagePath) {
    if (!imagePath) return false

    try {
      const fullPath = path.join(uploadsDir, imagePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }
}

module.exports = ImageService