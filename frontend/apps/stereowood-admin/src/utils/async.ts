type AnyFunction<TArgs extends unknown[]> = (...args: TArgs) => void;

export interface DebouncedFunction<TArgs extends unknown[]> extends AnyFunction<TArgs> {
  cancel: () => void;
}

export function debounce<TArgs extends unknown[]>(
  func: AnyFunction<TArgs>,
  wait = 250,
): DebouncedFunction<TArgs> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: unknown, ...args: TArgs) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  } as DebouncedFunction<TArgs>;

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

export function throttle<TArgs extends unknown[]>(
  func: AnyFunction<TArgs>,
  wait = 250,
): AnyFunction<TArgs> {
  let inThrottle = false;
  let lastFunc: (() => void) | null = null;

  return function (this: unknown, ...args: TArgs) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastFunc) {
          const pending = lastFunc;
          lastFunc = null;
          pending();
        }
      }, wait);
    } else {
      lastFunc = () => {
        func.apply(this, args);
      };
    }
  };
}

export function rafThrottle<TArgs extends unknown[]>(func: AnyFunction<TArgs>): AnyFunction<TArgs> {
  let ticking = false;

  return function (this: unknown, ...args: TArgs) {
    if (ticking) {
      return;
    }
    const scheduler =
      typeof globalThis !== 'undefined' && typeof globalThis.requestAnimationFrame === 'function'
        ? globalThis.requestAnimationFrame.bind(globalThis)
        : (cb: (timestamp: number) => void) => setTimeout(() => cb(Date.now()), 16);

    scheduler(() => {
      func.apply(this, args);
      ticking = false;
    });
    ticking = true;
  };
}
