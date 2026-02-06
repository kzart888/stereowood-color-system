type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface BrowserPerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface PerformanceThresholds {
  api: number;
  render: number;
  script: number;
}

export interface PerformanceMonitorOptions {
  enabled?: boolean;
  logLevel?: LogLevel;
  threshold?: Partial<PerformanceThresholds>;
  periodicReportIntervalMs?: number;
  memorySampleIntervalMs?: number;
}

export interface MetricEntry<T> {
  timestamp: number;
  data: T;
}

export interface TimerMetric {
  name: string;
  duration: number;
}

export interface ResourceMetric {
  name: string;
  type: string;
  duration: number;
  size: number;
}

export type MetricType = 'page-load' | 'resource' | 'long-task' | 'memory' | 'timer';

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  api: 3000,
  render: 100,
  script: 1000,
};

const DEFAULT_PERIODIC_REPORT_INTERVAL = 60_000;
const DEFAULT_MEMORY_SAMPLE_INTERVAL = 30_000;
const MAX_METRIC_ENTRIES = 100;

function currentTime() {
  return Date.now();
}

function supportsPerformanceAPI() {
  return typeof performance !== 'undefined';
}

function supportsPerformanceObserver() {
  return typeof PerformanceObserver !== 'undefined';
}

function toLogMethod(level: LogLevel): typeof console.log {
  switch (level) {
    case 'error':
      return console.error.bind(console);
    case 'warn':
      return console.warn.bind(console);
    case 'info':
      return console.info.bind(console);
    default:
      return console.log.bind(console);
  }
}

export class PerformanceMonitor {
  private enabled: boolean;
  private logLevel: LogLevel;
  private thresholds: PerformanceThresholds;
  private metrics: Map<MetricType, MetricEntry<unknown>[]>;
  private timers: Map<string, number>;
  private periodicReportHandle: ReturnType<typeof setInterval> | null = null;
  private memorySampleHandle: ReturnType<typeof setInterval> | null = null;
  private resourceObserver: PerformanceObserver | null = null;
  private longTaskObserver: PerformanceObserver | null = null;
  private periodicReportInterval: number;
  private memorySampleInterval: number;

  constructor(options: PerformanceMonitorOptions = {}) {
    this.enabled = options.enabled !== false;
    this.logLevel = options.logLevel ?? 'warn';
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...(options.threshold ?? {}) };
    this.metrics = new Map();
    this.timers = new Map();
    this.periodicReportInterval =
      options.periodicReportIntervalMs ?? DEFAULT_PERIODIC_REPORT_INTERVAL;
    this.memorySampleInterval = options.memorySampleIntervalMs ?? DEFAULT_MEMORY_SAMPLE_INTERVAL;

    if (this.enabled) {
      this.initialise();
    }
  }

  private initialise() {
    this.observePageLoad();
    this.observeResources();
    this.observeLongTasks();
    this.monitorMemory();
    this.schedulePeriodicReport();
  }

  enable() {
    if (this.enabled) {
      return;
    }
    this.enabled = true;
    this.initialise();
  }

  disable() {
    if (!this.enabled) {
      return;
    }
    this.enabled = false;
    this.teardownObservers();
    this.clearIntervals();
    this.metrics.clear();
    this.timers.clear();
  }

  private teardownObservers() {
    this.resourceObserver?.disconnect();
    this.resourceObserver = null;
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;
  }

  private clearIntervals() {
    if (this.periodicReportHandle) {
      clearInterval(this.periodicReportHandle);
      this.periodicReportHandle = null;
    }
    if (this.memorySampleHandle) {
      clearInterval(this.memorySampleHandle);
      this.memorySampleHandle = null;
    }
  }

  private observePageLoad() {
    if (!supportsPerformanceAPI() || !('timing' in performance)) {
      return;
    }
    window.addEventListener('load', () => {
      const timing = (performance as Performance).timing;
      const metrics = {
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        domParsing: timing.domInteractive - timing.domLoading,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadComplete: timing.loadEventEnd - timing.loadEventStart,
        total: timing.loadEventEnd - timing.fetchStart,
      };
      this.recordMetric('page-load', metrics);
      this.log('info', 'Page Load Metrics:', metrics);
    });
  }

  private observeResources() {
    if (!supportsPerformanceObserver()) {
      return;
    }
    try {
      this.resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (
            'initiatorType' in entry &&
            entry.initiatorType === 'fetch' &&
            entry.duration > this.thresholds.api
          ) {
            this.log('warn', `Slow API call: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          }
          const metric: ResourceMetric = {
            name: entry.name,
            type: 'initiatorType' in entry ? String(entry.initiatorType ?? 'unknown') : 'unknown',
            duration: entry.duration,
            size: 'transferSize' in entry ? Number(entry.transferSize ?? 0) : 0,
          };
          this.recordMetric('resource', metric);
        });
      });
      this.resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      this.log('debug', 'Resource performance observation not supported', error);
    }
  }

  private observeLongTasks() {
    if (!supportsPerformanceObserver()) {
      return;
    }
    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.log('warn', `Long task detected: ${entry.duration.toFixed(2)}ms`);
          this.recordMetric('long-task', {
            duration: entry.duration,
            startTime: entry.startTime,
          });
        });
      });
      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      this.log('debug', 'Long task observation not supported', error);
    }
  }

  private monitorMemory() {
    if (
      !supportsPerformanceAPI() ||
      !('memory' in performance) ||
      !(performance as Performance & { memory: BrowserPerformanceMemory }).memory
    ) {
      return;
    }
    const sample = () => {
      const memory = (performance as Performance & { memory: BrowserPerformanceMemory }).memory;
      const data = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
      this.recordMetric('memory', data);
      if (data.percentage > 80) {
        this.log('warn', `High memory usage: ${data.percentage.toFixed(2)}%`);
      }
    };
    sample();
    this.memorySampleHandle = setInterval(sample, this.memorySampleInterval);
  }

  private schedulePeriodicReport() {
    const generateReport = () => {
      const report = this.getReport();
      this.log('info', 'Performance report summary', report.summary);
    };
    this.periodicReportHandle = setInterval(generateReport, this.periodicReportInterval);
  }

  startTimer(name: string) {
    if (!this.enabled || !supportsPerformanceAPI() || !performance.now) {
      return;
    }
    this.timers.set(name, performance.now());
  }

  endTimer(name: string, threshold?: number): number | undefined {
    if (!this.enabled || !supportsPerformanceAPI() || !performance.now) {
      return undefined;
    }
    const start = this.timers.get(name);
    if (start == null) {
      this.log('warn', `Timer ${name} was not started`);
      return undefined;
    }
    const duration = performance.now() - start;
    this.timers.delete(name);

    this.recordMetric('timer', { name, duration } satisfies TimerMetric);

    const limit = threshold ?? this.thresholds.script;
    if (duration > limit) {
      this.log('warn', `${name} took ${duration.toFixed(2)}ms (threshold: ${limit}ms)`);
    } else {
      this.log('debug', `${name} completed in ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>, threshold?: number): Promise<T> {
    this.startTimer(name);
    try {
      return await fn();
    } finally {
      this.endTimer(name, threshold);
    }
  }

  measure<T>(name: string, fn: () => T, threshold?: number): T {
    this.startTimer(name);
    try {
      return fn();
    } finally {
      this.endTimer(name, threshold);
    }
  }

  recordMetric<T>(type: MetricType, data: T) {
    if (!this.enabled) {
      return;
    }
    const entries = this.metrics.get(type) ?? [];
    entries.push({ timestamp: currentTime(), data });
    if (entries.length > MAX_METRIC_ENTRIES) {
      entries.shift();
    }
    this.metrics.set(type, entries);
  }

  getMetrics<T = unknown>(type: MetricType): MetricEntry<T>[] {
    return [...(this.metrics.get(type) ?? [])] as MetricEntry<T>[];
  }

  getReport() {
    const summary: Record<string, unknown> = {};
    this.metrics.forEach((entries, type) => {
      if (type === 'timer' || type === 'resource') {
        const durations = entries.map<number>((entry) => {
          const payload = entry.data as TimerMetric | ResourceMetric;
          return 'duration' in payload ? payload.duration : 0;
        });
        if (durations.length) {
          summary[type] = {
            count: durations.length,
            average: durations.reduce((a, b) => a + b, 0) / durations.length,
            min: Math.min(...durations),
            max: Math.max(...durations),
          };
        }
      }
    });
    if (
      supportsPerformanceAPI() &&
      'memory' in performance &&
      (performance as Performance & { memory?: BrowserPerformanceMemory }).memory
    ) {
      const memory = (performance as Performance & { memory: BrowserPerformanceMemory }).memory;
      summary.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return {
      timestamp: currentTime(),
      metrics: Array.from(this.metrics.entries()),
      summary,
    };
  }

  clear() {
    this.metrics.clear();
    this.timers.clear();
  }

  wrapApi<TArgs extends unknown[], TResult>(
    apiCall: (...args: TArgs) => Promise<TResult>,
    name: string,
  ): (...args: TArgs) => Promise<TResult> {
    if (!this.enabled) {
      return apiCall;
    }
    return async (...args: TArgs) => {
      this.startTimer(`API: ${name}`);
      try {
        const result = await apiCall(...args);
        this.endTimer(`API: ${name}`, this.thresholds.api);
        return result;
      } catch (error) {
        this.endTimer(`API: ${name}`, this.thresholds.api);
        throw error;
      }
    };
  }

  createVueLifecycleMonitor<
    T extends { mounted?: () => void; updated?: () => void; name?: string },
  >(component: T): T {
    if (!this.enabled || !supportsPerformanceAPI() || !performance.mark || !performance.measure) {
      return component;
    }
    const monitoredComponent = { ...component };
    const name = component.name ?? 'Component';

    const wrapLifecycle = (hookName: 'mounted' | 'updated') => {
      const original = component[hookName];
      monitoredComponent[hookName] = function (...args: unknown[]) {
        const start = `${name}-${hookName}-start`;
        const end = `${name}-${hookName}-end`;
        performance.mark(start);
        const result =
          typeof original === 'function'
            ? (original as (...innerArgs: unknown[]) => unknown).apply(this, args)
            : undefined;
        performance.mark(end);
        performance.measure(`${name} ${hookName}`, start, end);
        return result;
      };
    };

    wrapLifecycle('mounted');
    wrapLifecycle('updated');
    return monitoredComponent;
  }

  private log(level: LogLevel, ...args: unknown[]) {
    const levelRank: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    if (levelRank[level] < levelRank[this.logLevel]) {
      return;
    }
    const method = toLogMethod(level);
    method(`[Performance ${level.toUpperCase()}]`, ...args);
  }
}

export const defaultPerformanceMonitor = new PerformanceMonitor({
  enabled: false,
  logLevel: 'error',
});

export const startTimer = (name: string) => defaultPerformanceMonitor.startTimer(name);
export const endTimer = (name: string, threshold?: number) =>
  defaultPerformanceMonitor.endTimer(name, threshold);
export const measure = <T>(name: string, fn: () => T, threshold?: number) =>
  defaultPerformanceMonitor.measure(name, fn, threshold);
