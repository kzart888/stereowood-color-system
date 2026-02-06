import { describe, expect, it } from 'vitest';
import {
  createColorCodeValidator,
  createColorNameValidator,
  type ElementPlusValidator,
} from '@/utils/validators';

function executeValidator(validator: ElementPlusValidator, value: string | null) {
  return new Promise<Error | null>((resolve) => {
    validator({}, value, (error) => {
      resolve(error ?? null);
    });
  });
}

describe('createColorCodeValidator', () => {
  it('passes when no value is provided', async () => {
    const validator = createColorCodeValidator([]);
    const error = await executeValidator(validator, '');
    expect(error).toBeNull();
  });

  it('fails when code already exists for another record', async () => {
    const validator = createColorCodeValidator([{ id: 1, color_code: 'BU001' }], 2);
    const error = await executeValidator(validator, 'BU001');
    expect(error?.message).toBe('该颜色编号已存在！');
  });

  it('skips uniqueness check for current record', async () => {
    const validator = createColorCodeValidator([{ id: 1, color_code: 'BU001' }], 1);
    const error = await executeValidator(validator, 'BU001');
    expect(error).toBeNull();
  });

  it('validates formatting requirements', async () => {
    const validator = createColorCodeValidator([]);
    const error = await executeValidator(validator, 'invalid');
    expect(error?.message).toContain('颜色编号格式');
  });
});

describe('createColorNameValidator', () => {
  it('passes for unique names', async () => {
    const validator = createColorNameValidator([{ id: 1, name: 'Ultramarine' }]);
    const error = await executeValidator(validator, 'Cobalt Blue');
    expect(error).toBeNull();
  });

  it('flags duplicates ignoring case', async () => {
    const validator = createColorNameValidator([{ id: 1, name: 'Titanium White' }], 2);
    const error = await executeValidator(validator, 'titanium white');
    expect(error?.message).toBe('列表中已经存在该颜色！');
  });

  it('ignores same record when editing', async () => {
    const validator = createColorNameValidator([{ id: 5, name: 'Lamp Black' }], 5);
    const error = await executeValidator(validator, 'LAMp black');
    expect(error).toBeNull();
  });
});
