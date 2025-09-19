/**
 * 文件上传中间件
 * 职责：统一配置multer文件上传
 * @module middleware/upload
 */

const multer = require('multer');
const path = require('path');

// 文件存储配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名：时间戳-随机数-原始扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 文件过滤器（只允许图片）
const fileFilter = (req, file, cb) => {
    // 允许的图片类型
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('只允许上传图片文件'));
    }
};

const DEFAULT_LIMITS = {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
};

const createUploader = (options = {}) => {
    const mergedLimits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };

    return multer({
        storage,
        limits: mergedLimits,
        fileFilter: options.fileFilter || fileFilter
    });
};

// 创建默认的multer实例
const upload = createUploader();

// 允许在保持统一存储/校验的情况下自定义限制
upload.withLimits = (limits = {}) => createUploader({ limits });

module.exports = upload;
