import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('element-plus', () => ({
  ElMessage: vi.fn(),
}));

import { ElMessage } from 'element-plus';
import { message, showError, showInfo, showSuccess, showWarning } from '@/utils/message';

const elMessageMock = ElMessage as unknown as Mock;

describe('message helpers', () => {
  beforeEach(() => {
    elMessageMock.mockReset();
  });

  it('calls ElMessage with success type', () => {
    showSuccess('Saved');
    expect(elMessageMock).toHaveBeenCalledWith({ message: 'Saved', type: 'success' });
  });

  it('supports options payloads', () => {
    showError({ message: 'Failed', duration: 0 });
    expect(elMessageMock).toHaveBeenCalledWith({ message: 'Failed', duration: 0, type: 'error' });
  });

  it('exposes grouped helpers', () => {
    message.warning('Heads up');
    message.info({ message: 'Info', duration: 500 });

    expect(elMessageMock).toHaveBeenNthCalledWith(1, { message: 'Heads up', type: 'warning' });
    expect(elMessageMock).toHaveBeenNthCalledWith(2, {
      message: 'Info',
      duration: 500,
      type: 'info',
    });
  });

  it('provides dedicated functions for each level', () => {
    showWarning('warn');
    showInfo('info');

    expect(elMessageMock).toHaveBeenNthCalledWith(1, { message: 'warn', type: 'warning' });
    expect(elMessageMock).toHaveBeenNthCalledWith(2, { message: 'info', type: 'info' });
  });
});
