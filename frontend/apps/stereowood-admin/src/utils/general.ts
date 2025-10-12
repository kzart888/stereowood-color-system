import { ElMessageBox } from 'element-plus';

export interface ArtworkLike {
  id?: number | string | null;
  code?: string | null;
  no?: string | null;
  name?: string | null;
  title?: string | null;
}

export interface ColorCategoryLike {
  id: number;
  code: string;
}

export interface CustomColorLike {
  category_id?: number | null;
  color_code?: string | null;
}

export interface DoubleDangerConfirmOptions {
  firstMessage?: string;
  secondMessage?: string;
  firstTitle?: string;
  secondTitle?: string;
  firstType?: 'warning' | 'info' | 'success' | 'error';
  secondType?: 'warning' | 'info' | 'success' | 'error';
  firstConfirmText?: string;
  secondConfirmText?: string;
}

let storedScrollPosition = 0;

export function buildUploadUrl(
  baseUrl: string | null | undefined,
  raw: string | null | undefined,
): string {
  if (!raw) {
    return '';
  }
  const rawString = String(raw);
  if (/^https?:\/\//i.test(rawString)) {
    return rawString;
  }
  const cleaned = rawString.replace(/^\/+/, '');
  const withPrefix = cleaned.startsWith('uploads/') ? cleaned : `uploads/${cleaned}`;
  const origin =
    baseUrl && baseUrl.trim().length > 0
      ? baseUrl.replace(/\/+$/, '')
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';
  return origin ? `${origin}/${withPrefix}` : withPrefix;
}

export function normalizePantoneCode(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  let code = raw
    .replace(/^PANTON(E)?\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const suffixMatch = code.match(/^(.*?)(\s+)?([cCuU])$/);
  if (suffixMatch) {
    const base = suffixMatch[1].trim();
    const suffix = suffixMatch[3].toUpperCase();
    const baseCompact = base.replace(/\s+/g, '');
    if (/^\d+[A-Z]?$/i.test(baseCompact)) {
      return `${baseCompact.toUpperCase()}${suffix}`;
    }
    return `${base} ${suffix}`.replace(/\s+/g, ' ').trim();
  }
  return code;
}

export type DateFormatMode = 'simple' | 'locale';

export function formatDate(
  dateString: string | null | undefined,
  format: DateFormatMode = 'simple',
): string {
  if (!dateString) {
    return '未知';
  }

  const hasTimezoneInfo =
    dateString.includes('+') || dateString.includes('-08:00') || dateString.includes('GMT');
  const isoString = hasTimezoneInfo || dateString.endsWith('Z') ? dateString : `${dateString}Z`;

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '未知';
  }

  if (format === 'locale') {
    const timeZone =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    return date.toLocaleString('zh-CN', { timeZone });
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function formatArtworkTitle(artwork: ArtworkLike | null | undefined): string {
  if (!artwork) {
    return '';
  }
  const code = artwork.code || artwork.no || '';
  const name = artwork.name || artwork.title || '';
  if (code && name) {
    return `${code}-${name}`;
  }
  if (code) {
    return code;
  }
  if (name) {
    return name;
  }
  return artwork.id != null ? `作品#${artwork.id}` : '';
}

export function saveScrollPosition(): void {
  if (typeof window === 'undefined') {
    return;
  }
  storedScrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;
}

export function restoreScrollPosition(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const target = storedScrollPosition;
  window.setTimeout(() => {
    window.scrollTo(0, target);
  }, 0);
}

export function generateColorCode(
  categories: readonly ColorCategoryLike[] | null | undefined,
  customColors: readonly CustomColorLike[] | null | undefined,
  categoryId: number,
): string {
  if (!categories || !customColors) {
    return '';
  }
  const category = categories.find((item) => item.id === categoryId);
  if (!category || !category.code) {
    return '';
  }
  const categoryColors = customColors.filter((color) => color.category_id === categoryId);
  if (categoryColors.length === 0) {
    return `${category.code}001`;
  }

  const numbers = categoryColors
    .map((color) => {
      const code = color.color_code || '';
      const match = code.match(/\d+$/);
      return match ? Number.parseInt(match[0], 10) : 0;
    })
    .filter((value) => Number.isFinite(value) && value > 0);

  if (numbers.length === 0) {
    return `${category.code}001`;
  }

  const maxNumber = Math.max(...numbers);
  const nextNumber = maxNumber + 1;
  const paddedNumber = `${nextNumber}`.padStart(3, '0');
  return `${category.code}${paddedNumber}`;
}

function characterType(input: string): number {
  if (!input) {
    return 1;
  }
  const firstChar = input[0];
  const code = firstChar.charCodeAt(0);
  if (
    code < 48 ||
    (code > 57 && code < 65) ||
    (code > 90 && code < 97) ||
    (code > 122 && code < 0x4e00)
  ) {
    return 1;
  }
  if (code >= 48 && code <= 57) {
    return 2;
  }
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
    return 3;
  }
  if (code >= 0x4e00 && code <= 0x9fff) {
    return 4;
  }
  return 1;
}

export function compareNames(nameA: string, nameB: string): number {
  const valueA = nameA || '';
  const valueB = nameB || '';
  const typeA = characterType(valueA);
  const typeB = characterType(valueB);
  if (typeA !== typeB) {
    return typeA - typeB;
  }
  if (typeA === 4) {
    return valueA.localeCompare(valueB, 'zh-CN', { numeric: true });
  }
  if (typeA === 2) {
    const numA = Number.parseInt(valueA.match(/^\d+/)?.[0] ?? '0', 10);
    const numB = Number.parseInt(valueB.match(/^\d+/)?.[0] ?? '0', 10);
    if (numA !== numB) {
      return numA - numB;
    }
    return valueA.localeCompare(valueB);
  }
  return valueA.localeCompare(valueB);
}

export async function doubleDangerConfirm(
  options: DoubleDangerConfirmOptions = {},
): Promise<boolean> {
  const {
    firstMessage = '确定执行该操作吗？',
    secondMessage = '该操作不可撤销，确认继续？',
    firstTitle = '危险操作',
    secondTitle = '再次确认',
    firstType = 'warning',
    secondType = 'error',
    firstConfirmText = '继续',
    secondConfirmText = '确认执行',
  } = options;

  try {
    await ElMessageBox.confirm(firstMessage, firstTitle, {
      confirmButtonText: firstConfirmText,
      cancelButtonText: '取消',
      type: firstType,
    });
  } catch {
    return false;
  }

  try {
    await ElMessageBox.confirm(secondMessage, secondTitle, {
      confirmButtonText: secondConfirmText,
      cancelButtonText: '取消',
      type: secondType,
    });
  } catch {
    return false;
  }

  return true;
}
