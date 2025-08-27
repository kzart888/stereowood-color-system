// API工具函数
// frontend/js/api/utils.js

export class APIUtils {
    constructor() {
        this.defaultHeaders = {
            'Accept': 'application/json'
        };
    }

    // 通用请求方法（带重试机制）
    async request(method, url, options = {}) {
        const {
            data,
            headers = {},
            timeout = 30000,
            retries = 3,
            retryDelay = 1000,
            onProgress,
            signal
        } = options;

        const config = {
            method,
            url,
            headers: { ...this.defaultHeaders, ...headers },
            timeout,
            signal
        };

        // 处理数据
        if (data) {
            if (data instanceof FormData) {
                config.data = data;
            } else if (headers['Content-Type'] === 'multipart/form-data') {
                config.data = data;
            } else {
                config.data = data;
                config.headers['Content-Type'] = 'application/json';
            }
        }

        // 进度回调
        if (onProgress) {
            config.onUploadProgress = onProgress;
        }

        // 执行请求（带重试）
        let lastError;
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await axios(config);
                return response;
            } catch (error) {
                lastError = error;
                
                // 不重试的错误类型
                if (this.shouldNotRetry(error)) {
                    throw error;
                }
                
                // 等待后重试
                if (i < retries) {
                    await this.delay(retryDelay * Math.pow(2, i)); // 指数退避
                }
            }
        }

        throw lastError;
    }

    // 判断是否不应该重试
    shouldNotRetry(error) {
        // 客户端错误（4xx）不重试
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
            return true;
        }
        
        // 取消的请求不重试
        if (axios.isCancel(error)) {
            return true;
        }
        
        return false;
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 构建查询字符串
    buildQueryString(params) {
        if (!params || Object.keys(params).length === 0) {
            return '';
        }
        
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, value);
            }
        });
        
        const queryString = searchParams.toString();
        return queryString ? `?${queryString}` : '';
    }

    // 防抖函数
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    throttle(func, limit = 100) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 批量请求处理
    async batchRequest(requests, options = {}) {
        const {
            concurrency = 5,
            onProgress,
            stopOnError = false
        } = options;

        const results = [];
        const errors = [];
        let completed = 0;

        // 分批处理
        for (let i = 0; i < requests.length; i += concurrency) {
            const batch = requests.slice(i, i + concurrency);
            
            const batchPromises = batch.map(async (request, index) => {
                try {
                    const result = await request();
                    results[i + index] = result;
                    completed++;
                    
                    if (onProgress) {
                        onProgress({
                            completed,
                            total: requests.length,
                            percentage: Math.round((completed / requests.length) * 100)
                        });
                    }
                    
                    return result;
                } catch (error) {
                    errors[i + index] = error;
                    
                    if (stopOnError) {
                        throw error;
                    }
                    
                    return null;
                }
            });

            await Promise.all(batchPromises);
        }

        return { results, errors };
    }

    // 创建可取消的请求
    createCancelToken() {
        const source = axios.CancelToken.source();
        return {
            token: source.token,
            cancel: source.cancel
        };
    }

    // 检测网络状态
    isOnline() {
        return navigator.onLine;
    }

    // 监听网络状态变化
    onNetworkChange(callback) {
        window.addEventListener('online', () => callback(true));
        window.addEventListener('offline', () => callback(false));
        
        // 返回清理函数
        return () => {
            window.removeEventListener('online', callback);
            window.removeEventListener('offline', callback);
        };
    }

    // 格式化错误消息
    formatError(error) {
        if (error.response) {
            // 服务器响应错误
            return {
                type: 'server',
                status: error.response.status,
                message: error.response.data?.message || '服务器错误',
                data: error.response.data
            };
        } else if (error.request) {
            // 网络错误
            return {
                type: 'network',
                message: '网络连接失败',
                original: error.message
            };
        } else {
            // 其他错误
            return {
                type: 'unknown',
                message: error.message || '未知错误',
                original: error
            };
        }
    }
}

export default APIUtils;