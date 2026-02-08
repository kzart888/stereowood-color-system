import { ElMessage } from 'element-plus';
import type { MessageHandler, MessageOptions } from 'element-plus';

type MessagePayload = string | MessageOptions;

function resolveOptions(payload: MessagePayload, type: MessageOptions['type']): MessageOptions {
  if (typeof payload === 'string') {
    return { message: payload, type };
  }
  return { ...payload, type };
}

export function showSuccess(payload: MessagePayload): MessageHandler {
  return ElMessage(resolveOptions(payload, 'success'));
}

export function showError(payload: MessagePayload): MessageHandler {
  return ElMessage(resolveOptions(payload, 'error'));
}

export function showWarning(payload: MessagePayload): MessageHandler {
  return ElMessage(resolveOptions(payload, 'warning'));
}

export function showInfo(payload: MessagePayload): MessageHandler {
  return ElMessage(resolveOptions(payload, 'info'));
}

export const message = {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
};
