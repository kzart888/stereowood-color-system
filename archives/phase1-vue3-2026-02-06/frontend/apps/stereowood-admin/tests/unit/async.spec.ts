import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce, rafThrottle, throttle } from '@/utils/async';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays invocation until wait period passes', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 200);

    debounced();
    debounced();
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cancels scheduled invocation', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 200);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(500);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('invokes immediately then at most once per wait interval', () => {
    const spy = vi.fn();
    const throttled = throttle(spy, 100);

    throttled('a');
    throttled('b');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('a');

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('b');
  });
});

describe('rafThrottle', () => {
  const originalRAF = globalThis.requestAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.requestAnimationFrame = originalRAF;
  });

  it('executes at most once per animation frame', () => {
    const callbacks: FrameRequestCallback[] = [];
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return 1;
    }) as typeof globalThis.requestAnimationFrame;

    const spy = vi.fn();
    const throttled = rafThrottle(spy);

    throttled('first');
    throttled('second');

    expect(callbacks.length).toBe(1);
    expect(spy).not.toHaveBeenCalled();

    callbacks[0](0);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('first');
  });
});
