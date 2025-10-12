import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PerformanceMonitor,
  defaultPerformanceMonitor,
  endTimer,
  measure,
  startTimer,
} from '@/utils/performanceMonitor';

describe('PerformanceMonitor timers', () => {
  afterEach(() => {
    defaultPerformanceMonitor.clear();
  });

  it('measures synchronous function duration', () => {
    const monitor = new PerformanceMonitor({ enabled: true, logLevel: 'debug' });
    const spy = vi.spyOn(performance, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200);

    const result = monitor.measure('sync-task', () => 42);

    expect(result).toBe(42);
    expect(monitor.getMetrics('timer')).toHaveLength(1);
    spy.mockRestore();
  });

  it('measures asynchronous function duration', async () => {
    const monitor = new PerformanceMonitor({ enabled: true, logLevel: 'debug' });
    const spy = vi
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(150)
      .mockReturnValueOnce(200);

    await monitor.measureAsync('async-task', async () => {
      await Promise.resolve();
    });

    expect(monitor.getMetrics('timer')).toHaveLength(1);
    spy.mockRestore();
  });

  it('wraps API calls with timing', async () => {
    const monitor = new PerformanceMonitor({ enabled: true, logLevel: 'debug' });
    const api = vi.fn().mockResolvedValue('ok');
    const wrapped = monitor.wrapApi(api, 'fetchData');

    await wrapped();

    expect(api).toHaveBeenCalled();
    expect(monitor.getMetrics('timer')).toHaveLength(1);
  });
});

describe('defaultPerformanceMonitor helpers', () => {
  it('exposes startTimer/endTimer/measure helpers', () => {
    const spy = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(10);
    startTimer('test');
    const duration = endTimer('test');
    measure('noop', () => undefined);
    expect(duration).toBeUndefined();
    spy.mockRestore();
  });
});
