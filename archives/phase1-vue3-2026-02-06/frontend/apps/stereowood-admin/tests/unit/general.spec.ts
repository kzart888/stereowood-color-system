import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('element-plus', () => ({
  ElMessageBox: {
    confirm: vi.fn(),
  },
}));

import {
  buildUploadUrl,
  compareNames,
  doubleDangerConfirm,
  formatArtworkTitle,
  formatDate,
  generateColorCode,
  normalizePantoneCode,
  restoreScrollPosition,
  saveScrollPosition,
} from '@/utils/general';
import { ElMessageBox } from 'element-plus';

describe('buildUploadUrl', () => {
  it('returns absolute url unchanged', () => {
    expect(buildUploadUrl('http://example.com', 'https://cdn.example.com/image.jpg')).toBe(
      'https://cdn.example.com/image.jpg',
    );
  });

  it('prefixes relative paths with uploads and base url', () => {
    expect(buildUploadUrl('https://example.com', 'color.png')).toBe(
      'https://example.com/uploads/color.png',
    );
    expect(buildUploadUrl('https://example.com', 'uploads/color.png')).toBe(
      'https://example.com/uploads/color.png',
    );
  });
});

describe('normalizePantoneCode', () => {
  it('normalizes pantone codes with suffix', () => {
    expect(normalizePantoneCode('PANTONE 123 c')).toBe('123C');
    expect(normalizePantoneCode('Pantone 7420 u')).toBe('7420U');
  });

  it('returns null for empty input', () => {
    expect(normalizePantoneCode('   ')).toBeNull();
    expect(normalizePantoneCode(null)).toBeNull();
  });
});

describe('formatDate', () => {
  it('returns fallback for invalid values', () => {
    expect(formatDate(undefined)).toBe('未知');
    expect(formatDate('invalid-date')).toBe('未知');
  });

  it('formats ISO string using simple mode', () => {
    const result = formatDate('2024-01-15T08:30:00Z');
    expect(result).toContain('2024-01-15');
  });
});

describe('formatArtworkTitle', () => {
  it('builds title from code and name', () => {
    expect(formatArtworkTitle({ code: 'AW001', name: 'Sunset' })).toBe('AW001-Sunset');
  });

  it('falls back to id if necessary', () => {
    expect(formatArtworkTitle({ id: 42 })).toBe('作品#42');
  });
});

describe('scroll position helpers', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('saves and restores scroll position', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'pageYOffset', { value: 150, writable: true });
    saveScrollPosition();
    Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });

    restoreScrollPosition();
    await vi.runAllTimersAsync();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 150);
    vi.useRealTimers();
  });
});

describe('generateColorCode', () => {
  const categories = [
    { id: 1, code: 'BU' },
    { id: 2, code: 'RD' },
  ];

  const customColors = [
    { category_id: 1, color_code: 'BU001' },
    { category_id: 1, color_code: 'BU002' },
    { category_id: 2, color_code: 'RD005' },
  ];

  it('returns next numeric suffix within category', () => {
    expect(generateColorCode(categories, customColors, 1)).toBe('BU003');
  });

  it('returns default when no colors exist', () => {
    expect(generateColorCode(categories, customColors, 3)).toBe('');
    expect(generateColorCode(categories, customColors, 2)).toBe('RD006');
  });
});

describe('compareNames', () => {
  it('sorts according to character precedence', () => {
    const values = ['中文', 'Alpha', '#special', '123', 'beta'];
    const sorted = [...values].sort(compareNames);
    expect(sorted).toEqual(['#special', '123', 'Alpha', 'beta', '中文']);
  });
});

describe('doubleDangerConfirm', () => {
  const confirmMock = ElMessageBox.confirm as unknown as Mock;

  beforeEach(() => {
    confirmMock.mockReset();
  });

  it('resolves true when both confirmations pass', async () => {
    confirmMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);

    const result = await doubleDangerConfirm();

    expect(result).toBe(true);
    expect(confirmMock).toHaveBeenNthCalledWith(
      1,
      '确定执行该操作吗？',
      '危险操作',
      expect.objectContaining({
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'warning',
      }),
    );
    expect(confirmMock).toHaveBeenNthCalledWith(
      2,
      '该操作不可撤销，确认继续？',
      '再次确认',
      expect.objectContaining({
        confirmButtonText: '确认执行',
        cancelButtonText: '取消',
        type: 'error',
      }),
    );
  });

  it('returns false when first confirmation is cancelled', async () => {
    confirmMock.mockRejectedValueOnce(new Error('cancel'));
    const result = await doubleDangerConfirm();

    expect(result).toBe(false);
    expect(confirmMock).toHaveBeenCalledTimes(1);
  });

  it('returns false when second confirmation is cancelled', async () => {
    confirmMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('cancel'));
    const result = await doubleDangerConfirm();

    expect(result).toBe(false);
    expect(confirmMock).toHaveBeenCalledTimes(2);
  });
});
