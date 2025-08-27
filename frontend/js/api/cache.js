// API缓存管理
// frontend/js/api/cache.js

export class APICache {
    constructor(ttl = 5 * 60 * 1000) {
        this.ttl = ttl; // 默认5分钟
        this.cache = new Map();
        this.timers = new Map();
    }

    // 获取缓存
    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        // 检查是否过期
        if (Date.now() > cached.expiry) {
            this.delete(key);
            return null;
        }
        
        return cached.data;
    }

    // 设置缓存
    set(key, data, customTTL = null) {
        const ttl = customTTL || this.ttl;
        const expiry = Date.now() + ttl;
        
        // 清除现有定时器
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }
        
        // 设置新缓存
        this.cache.set(key, { data, expiry });
        
        // 设置自动清理定时器
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl);
        
        this.timers.set(key, timer);
    }

    // 删除缓存
    delete(key) {
        this.cache.delete(key);
        
        // 清除定时器
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
    }

    // 清除匹配模式的缓存
    clearPattern(pattern) {
        const keys = Array.from(this.cache.keys());
        keys.forEach(key => {
            if (key.includes(pattern)) {
                this.delete(key);
            }
        });
    }

    // 清除所有缓存
    clear() {
        // 清除所有定时器
        this.timers.forEach(timer => clearTimeout(timer));
        
        // 清空缓存
        this.cache.clear();
        this.timers.clear();
    }

    // 获取缓存统计
    getStats() {
        const entries = Array.from(this.cache.entries());
        const now = Date.now();
        
        return {
            total: entries.length,
            size: this.estimateSize(),
            items: entries.map(([key, value]) => ({
                key,
                ttl: Math.max(0, value.expiry - now),
                size: JSON.stringify(value.data).length
            }))
        };
    }

    // 估算缓存大小
    estimateSize() {
        let size = 0;
        this.cache.forEach(value => {
            size += JSON.stringify(value.data).length;
        });
        return size;
    }

    // 预热缓存
    async warm(keys, fetcher) {
        const promises = keys.map(async key => {
            try {
                const data = await fetcher(key);
                this.set(key, data);
            } catch (error) {
                console.error(`Failed to warm cache for ${key}:`, error);
            }
        });
        
        await Promise.all(promises);
    }
}

// 请求去重管理器
export class RequestDeduplicator {
    constructor() {
        this.pending = new Map();
    }

    // 执行请求（避免重复）
    async execute(key, requestFn) {
        // 如果有相同的请求正在进行，返回现有的Promise
        if (this.pending.has(key)) {
            return this.pending.get(key);
        }
        
        // 创建新的请求Promise
        const promise = requestFn()
            .finally(() => {
                // 请求完成后清除
                this.pending.delete(key);
            });
        
        this.pending.set(key, promise);
        return promise;
    }

    // 取消待处理的请求
    cancel(key) {
        this.pending.delete(key);
    }

    // 清除所有待处理的请求
    clear() {
        this.pending.clear();
    }
}

export default APICache;