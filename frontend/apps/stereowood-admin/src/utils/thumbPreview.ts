interface ShowThumbPreviewOptions {
  trigger: Event | Element | null;
  imageUrl: string;
  size?: number;
}

const OVERLAY_ID = 'thumbPreviewLayer';
const DEFAULT_SIZE = 320;

function resolveTriggerElement(trigger: Event | Element | null): HTMLElement | null {
  if (!trigger) {
    return null;
  }
  if (trigger instanceof Element) {
    return trigger as HTMLElement;
  }
  const event = trigger as Event;
  const current = event.currentTarget;
  if (current instanceof Element) {
    return current as HTMLElement;
  }
  return null;
}

function ensureLayer(): HTMLDivElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const existing = document.getElementById(OVERLAY_ID);
  if (existing && existing instanceof HTMLDivElement) {
    return existing;
  }
  const layer = document.createElement('div');
  layer.id = OVERLAY_ID;
  layer.className = 'thumb-preview-overlay';
  layer.style.position = 'fixed';
  layer.style.width = `${DEFAULT_SIZE}px`;
  layer.style.height = `${DEFAULT_SIZE}px`;
  layer.style.background = '#fff center/cover no-repeat';
  layer.style.boxShadow = '0 6px 18px rgba(0,0,0,0.18)';
  layer.style.border = '2px solid #fff';
  layer.style.borderRadius = '8px';
  layer.style.zIndex = '4000';
  layer.style.opacity = '0';
  layer.style.pointerEvents = 'none';
  layer.style.transition = 'opacity 0.3s ease';

  document.body.appendChild(layer);
  return layer;
}

let keyListenerBound = false;
let clickListenerBound = false;

function removeListeners() {
  if (typeof document === 'undefined') {
    return;
  }
  if (keyListenerBound) {
    document.removeEventListener('keydown', handleKeyDown);
    keyListenerBound = false;
  }
  if (clickListenerBound) {
    document.removeEventListener('click', handleDocumentClick, true);
    clickListenerBound = false;
  }
}

export function hideThumbPreview(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const layer = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (layer) {
    layer.style.opacity = '0';
    layer.style.pointerEvents = 'none';
    layer.classList.remove('show');
  }
  removeListeners();
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    hideThumbPreview();
  }
}

function handleDocumentClick() {
  hideThumbPreview();
}

function scheduleListeners() {
  if (typeof document === 'undefined') {
    return;
  }
  if (!keyListenerBound) {
    document.addEventListener('keydown', handleKeyDown);
    keyListenerBound = true;
  }
  if (!clickListenerBound) {
    document.addEventListener('click', handleDocumentClick, true);
    clickListenerBound = true;
  }
}

function computePosition(trigger: HTMLElement, size: number) {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = rect.right + 8;
  if (left + size > viewportWidth) {
    left = rect.left - size - 8;
  }
  if (left < 4) {
    left = 4;
  }

  let top = rect.top + rect.height / 2 - size / 2;
  if (top + size > viewportHeight) {
    top = viewportHeight - size - 8;
  }
  if (top < 4) {
    top = 4;
  }

  return { left, top };
}

export function showThumbPreview(options: ShowThumbPreviewOptions): void {
  if (typeof document === 'undefined') {
    return;
  }
  const layer = ensureLayer();
  if (!layer) {
    return;
  }
  const triggerElement = resolveTriggerElement(options.trigger);
  if (!triggerElement || !options.imageUrl) {
    return;
  }

  const size = options.size ?? DEFAULT_SIZE;
  layer.style.width = `${size}px`;
  layer.style.height = `${size}px`;
  layer.style.backgroundImage = `url(${options.imageUrl})`;
  layer.style.zIndex = '4000';

  const { left, top } = computePosition(triggerElement, size);
  layer.style.left = `${left}px`;
  layer.style.top = `${top}px`;

  const scheduler =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb: (timestamp: number) => void) => setTimeout(() => cb(Date.now()), 16);

  scheduler(() => {
    layer.style.opacity = '1';
    layer.style.pointerEvents = 'auto';
    layer.classList.add('show');
  });

  scheduleListeners();
}

export const thumbPreview = {
  show: showThumbPreview,
  hide: hideThumbPreview,
};
