/**
 * 错误处理中间件
 * 职责：统一处理应用错误
 * @module middleware/error
 */

/**
 * 404错误处理
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({ 
        error: '请求的资源不存在',
        path: req.originalUrl
    });
}

/**
 * 全局错误处理
 */
function errorHandler(err, req, res, next) {
    // 记录错误日志
    console.error('错误详情:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body
    });
    
    // 处理不同类型的错误
    if (err.name === 'ValidationError') {
        return res.status(400).json({ 
            error: '数据验证失败',
            details: err.message
        });
    }
    
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: '文件大小超过限制'
            });
        }
        return res.status(400).json({ 
            error: '文件上传失败',
            details: err.message
        });
    }
    
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ 
            error: '数据完整性约束错误',
            details: '可能存在重复数据或外键约束失败'
        });
    }
    
    // 默认500错误
    res.status(err.status || 500).json({ 
        error: err.message || '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

module.exports = {
    notFoundHandler,
    errorHandler
};