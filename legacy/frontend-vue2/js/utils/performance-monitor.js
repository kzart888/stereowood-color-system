// 性能监控工具
// frontend/js/utils/performance-monitor.js

(function() {
    'use strict';
    
    class PerformanceMonitor {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.logLevel = options.logLevel || 'warn'; // debug, info, warn, error
        this.metrics = new Map();
        this.timers = new Map();
        this.threshold = options.threshold || {
            api: 3000,      // API请求超过3秒警告
            render: 100,    // 渲染超过100ms警告
            script: 1000    // 脚本执行超过1秒警告
        };
        
        if (this.enabled) {
            this.init();
        }
    }

    init() {
        // 监听页面加载性能
        this.measurePageLoad();
        
        // 监听资源加载
        this.observeResources();
        
        // 监听长任务
        this.observeLongTasks();
        
        // 监听内存使用
        this.monitorMemory();
        
        // 设置定期报告
        this.setupPeriodicReport();
    }

    // 测量页面加载性能
    measurePageLoad() {
        if (window.performance && window.performance.timing) {
            window.addEventListener('load', () => {
                const timing = window.performance.timing;
                const metrics = {
                    // DNS查询时间
                    dns: timing.domainLookupEnd - timing.domainLookupStart,
                    // TCP连接时间
                    tcp: timing.connectEnd - timing.connectStart,
                    // 请求时间
                    request: timing.responseStart - timing.requestStart,
                    // 响应时间
                    response: timing.responseEnd - timing.responseStart,
                    // DOM解析时间
                    domParsing: timing.domInteractive - timing.domLoading,
                    // DOM内容加载时间
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
                    // 页面完全加载时间
                    loadComplete: timing.loadEventEnd - timing.loadEventStart,
                    // 总时间
                    total: timing.loadEventEnd - timing.fetchStart
                };
                
                this.recordMetric('page-load', metrics);
                this.log('info', 'Page Load Metrics:', metrics);
            });
        }
    }

    // 监听资源加载
    observeResources() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > this.threshold.api && 
                            entry.initiatorType === 'fetch') {
                            this.log('warn', `Slow API call: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
                        }
                        
                        this.recordMetric('resource', {
                            name: entry.name,
                            type: entry.initiatorType,
                            duration: entry.duration,
                            size: entry.transferSize || 0
                        });
                    }
                });
                
                observer.observe({ entryTypes: ['resource'] });
            } catch (e) {
                this.log('debug', 'PerformanceObserver not supported for resources');
            }
        }
    }

    // 监听长任务
    observeLongTasks() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.log('warn', `Long task detected: ${entry.duration.toFixed(2)}ms`);
                        this.recordMetric('long-task', {
                            duration: entry.duration,
                            startTime: entry.startTime
                        });
                    }
                });
                
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                this.log('debug', 'Long task monitoring not supported');
            }
        }
    }

    // 监控内存使用
    monitorMemory() {
        if (performance.memory) {
            setInterval(() => {
                const memory = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit,
                    percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
                };
                
                this.recordMetric('memory', memory);
                
                // 内存使用超过80%时警告
                if (memory.percentage > 80) {
                    this.log('warn', `High memory usage: ${memory.percentage.toFixed(2)}%`);
                }
            }, 30000); // 每30秒检查一次
        }
    }

    // 开始计时
    startTimer(name) {
        if (!this.enabled) return;
        this.timers.set(name, performance.now());
    }

    // 结束计时
    endTimer(name, threshold = null) {
        if (!this.enabled) return;
        
        const startTime = this.timers.get(name);
        if (!startTime) {
            this.log('warn', `Timer ${name} was not started`);
            return;
        }
        
        const duration = performance.now() - startTime;
        this.timers.delete(name);
        
        this.recordMetric('timer', {
            name,
            duration
        });
        
        // 检查是否超过阈值
        const limit = threshold || this.threshold.script;
        if (duration > limit) {
            this.log('warn', `${name} took ${duration.toFixed(2)}ms (threshold: ${limit}ms)`);
        } else {
            this.log('debug', `${name} completed in ${duration.toFixed(2)}ms`);
        }
        
        return duration;
    }

    // 测量函数执行时间
    measure(name, fn) {
        if (!this.enabled) return fn();
        
        this.startTimer(name);
        const result = fn();
        
        if (result instanceof Promise) {
            return result.finally(() => {
                this.endTimer(name);
            });
        } else {
            this.endTimer(name);
            return result;
        }
    }

    // 记录指标
    recordMetric(type, data) {
        if (!this.enabled) return;
        
        if (!this.metrics.has(type)) {
            this.metrics.set(type, []);
        }
        
        this.metrics.get(type).push({
            timestamp: Date.now(),
            data
        });
        
        // 限制存储的指标数量
        const metrics = this.metrics.get(type);
        if (metrics.length > 100) {
            metrics.shift();
        }
    }

    // 获取性能报告
    getReport() {
        const report = {
            timestamp: Date.now(),
            metrics: {},
            summary: {}
        };
        
        // 收集所有指标
        this.metrics.forEach((values, type) => {
            report.metrics[type] = values;
            
            // 计算汇总统计
            if (type === 'timer' || type === 'resource') {
                const durations = values.map(v => v.data.duration || 0);
                report.summary[type] = {
                    count: durations.length,
                    average: durations.reduce((a, b) => a + b, 0) / durations.length,
                    min: Math.min(...durations),
                    max: Math.max(...durations)
                };
            }
        });
        
        // 添加当前内存状态
        if (performance.memory) {
            report.summary.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
            };
        }
        
        return report;
    }

    // 设置定期报告
    setupPeriodicReport() {
        setInterval(() => {
            const report = this.getReport();
            this.log('info', 'Performance Report:', report.summary);
            
            // 可以在这里发送报告到服务器
            // this.sendReportToServer(report);
        }, 60000); // 每分钟报告一次
    }

    // 日志输出
    log(level, ...args) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        
        if (messageLevelIndex >= currentLevelIndex) {
            const prefix = `[Performance ${level.toUpperCase()}]`;
            
            switch (level) {
                case 'error':
                    console.error(prefix, ...args);
                    break;
                case 'warn':
                    console.warn(prefix, ...args);
                    break;
                case 'info':
                    console.info(prefix, ...args);
                    break;
                default:
                    console.log(prefix, ...args);
            }
        }
    }

    // 清除所有数据
    clear() {
        this.metrics.clear();
        this.timers.clear();
    }

    // 导出数据
    export() {
        return {
            metrics: Array.from(this.metrics.entries()),
            report: this.getReport()
        };
    }

    // API调用包装器
    wrapAPI(apiCall, name) {
        if (!this.enabled) return apiCall;
        
        return async (...args) => {
            this.startTimer(`API: ${name}`);
            try {
                const result = await apiCall(...args);
                this.endTimer(`API: ${name}`, this.threshold.api);
                return result;
            } catch (error) {
                this.endTimer(`API: ${name}`, this.threshold.api);
                throw error;
            }
        };
    }

    // Vue组件性能监控
    vueComponentMonitor(component) {
        if (!this.enabled) return component;
        
        const originalMounted = component.mounted;
        const originalUpdated = component.updated;
        const name = component.name || 'Unknown';
        
        component.mounted = function(...args) {
            performance.mark(`${name}-mounted-start`);
            const result = originalMounted?.apply(this, args);
            performance.mark(`${name}-mounted-end`);
            performance.measure(
                `${name} mounted`,
                `${name}-mounted-start`,
                `${name}-mounted-end`
            );
            return result;
        };
        
        component.updated = function(...args) {
            performance.mark(`${name}-updated-start`);
            const result = originalUpdated?.apply(this, args);
            performance.mark(`${name}-updated-end`);
            performance.measure(
                `${name} updated`,
                `${name}-updated-start`,
                `${name}-updated-end`
            );
            return result;
        };
        
        return component;
    }
}

    // 创建默认实例 - 调整为生产环境设置
    const performanceMonitor = new PerformanceMonitor({
        enabled: false,  // 禁用性能监控以避免控制台警告
        logLevel: 'error'  // 仅显示错误级别日志
    });

    // 导出便捷方法
    const startTimer = (name) => performanceMonitor.startTimer(name);
    const endTimer = (name, threshold) => performanceMonitor.endTimer(name, threshold);
    const measure = (name, fn) => performanceMonitor.measure(name, fn);

    // Make available globally
    if (typeof window !== 'undefined') {
        window.performanceMonitor = performanceMonitor;
        window.startTimer = startTimer;
        window.endTimer = endTimer;
        window.measure = measure;
    }
})();