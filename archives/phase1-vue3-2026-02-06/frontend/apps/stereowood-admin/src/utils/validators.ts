export type ElementPlusValidatorCallback = (error?: Error) => void;

export type ElementPlusValidator = (
  rule: unknown,
  value: string | null | undefined,
  callback: ElementPlusValidatorCallback,
) => void;

export interface CustomColorSummary {
  id?: number | string | null;
  color_code?: string | null;
}

export interface MontMarteColorSummary {
  id?: number | string | null;
  name: string;
}

export function createColorCodeValidator(
  customColors: readonly CustomColorSummary[] | null | undefined,
  currentId: number | string | null = null,
): ElementPlusValidator {
  const list = customColors ?? [];
  return (_rule, value, callback) => {
    if (!value) {
      callback();
      return;
    }
    const exists = list.some((color) => {
      if (!color) {
        return false;
      }
      const sameRecord = currentId !== null && currentId !== undefined && color.id === currentId;
      return color.color_code === value && !sameRecord;
    });
    if (exists) {
      callback(new Error('该颜色编号已存在！'));
      return;
    }
    const pattern = /^[A-Z]{2}\d{3}$/;
    if (!pattern.test(value)) {
      callback(new Error('颜色编号格式应为：两个大写字母+三位数字，如BU001'));
      return;
    }
    callback();
  };
}

export function createColorNameValidator(
  montMarteColors: readonly MontMarteColorSummary[] | null | undefined,
  currentId: number | string | null = null,
): ElementPlusValidator {
  const list = montMarteColors ?? [];
  return (_rule, value, callback) => {
    if (!value) {
      callback();
      return;
    }
    const lowerValue = value.toLowerCase();
    const exists = list.some((color) => {
      if (!color) {
        return false;
      }
      const sameRecord = currentId !== null && currentId !== undefined && color.id === currentId;
      return color.name.toLowerCase() === lowerValue && !sameRecord;
    });
    if (exists) {
      callback(new Error('列表中已经存在该颜色！'));
      return;
    }
    callback();
  };
}
