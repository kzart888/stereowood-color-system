import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hideThumbPreview, showThumbPreview, thumbPreview } from '@/utils/thumbPreview';

const originalRAF = globalThis.requestAnimationFrame;

describe('thumbPreview', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as typeof globalThis.requestAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRAF;
    thumbPreview.hide();
    document.body.innerHTML = '';
  });

  it('creates overlay and positions it near trigger element', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Preview';
    document.body.appendChild(trigger);
    trigger.getBoundingClientRect = () =>
      ({
        left: 100,
        right: 140,
        top: 200,
        bottom: 240,
        width: 40,
        height: 40,
        x: 100,
        y: 200,
        toJSON() {
          return {};
        },
      }) as DOMRect;

    showThumbPreview({ trigger, imageUrl: '/img/sample.png' });

    const layer = document.getElementById('thumbPreviewLayer') as HTMLDivElement | null;
    expect(layer).not.toBeNull();
    expect(layer?.style.backgroundImage).toContain('/img/sample.png');
    expect(layer?.style.opacity).toBe('1');
    expect(layer?.classList.contains('show')).toBe(true);
  });

  it('supports event objects as trigger', () => {
    const trigger = document.createElement('div');
    document.body.appendChild(trigger);
    trigger.getBoundingClientRect = () =>
      ({
        left: 10,
        right: 30,
        top: 10,
        bottom: 30,
        width: 20,
        height: 20,
        x: 10,
        y: 10,
        toJSON() {
          return {};
        },
      }) as DOMRect;

    const event = { currentTarget: trigger } as unknown as Event;
    showThumbPreview({ trigger: event, imageUrl: '/img/preview.png', size: 200 });

    const layer = document.getElementById('thumbPreviewLayer') as HTMLDivElement | null;
    expect(layer?.style.width).toBe('200px');
    expect(layer?.style.height).toBe('200px');
  });

  it('hides overlay when hideThumbPreview is called', () => {
    const trigger = document.createElement('div');
    document.body.appendChild(trigger);
    trigger.getBoundingClientRect = () =>
      ({
        left: 50,
        right: 70,
        top: 50,
        bottom: 70,
        width: 20,
        height: 20,
        x: 50,
        y: 50,
        toJSON() {
          return {};
        },
      }) as DOMRect;

    showThumbPreview({ trigger, imageUrl: '/img/preview.png' });
    hideThumbPreview();

    const layer = document.getElementById('thumbPreviewLayer') as HTMLDivElement | null;
    expect(layer?.style.opacity).toBe('0');
    expect(layer?.style.pointerEvents).toBe('none');
    expect(layer?.classList.contains('show')).toBe(false);
  });
});
