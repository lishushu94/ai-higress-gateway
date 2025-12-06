/**
 * 错误处理工具类
 * 
 * 提供错误标准化、分类和转换功能
 */

import { AxiosError } from 'axios';
import { StandardError, ErrorCategory, ErrorSeverity } from './types';
import { ERROR_MAP, STATUS_CODE_MAP, categorizeByStatus, severityByStatus } from './error-map';

export class ErrorHandler {
  /**
   * 将任意错误转换为标准错误对象
   * 
   * @param error - 原始错误对象
   * @returns 标准化的错误对象
   */
  static normalize(error: unknown): StandardError {
    // 已经是标准错误
    if (this.isStandardError(error)) {
      return error as StandardError;
    }

    // Axios 错误
    if (this.isAxiosError(error)) {
      return this.fromAxiosError(error);
    }

    // 普通 Error 对象
    if (error instanceof Error) {
      return this.fromError(error);
    }

    // 未知错误
    return this.fromUnknown(error);
  }

  /**
   * 从 Axios 错误创建标准错误
   */
  private static fromAxiosError(error: AxiosError): StandardError {
    const response = error.response;
    const data = response?.data as any;

    // 后端返回的标准错误格式 (符合 backend/app/errors.py 的 ErrorResponse)
    if (data?.error && data?.message && typeof data?.code === 'number') {
      const errorType = data.error;
      const mapping = ERROR_MAP[errorType];
      
      if (mapping) {
        return {
          error: errorType,
          message: data.message,
          code: data.code,
          details: data.details,
          category: mapping.category,
          severity: mapping.severity,
          i18nKey: mapping.i18nKey,
          retryable: mapping.retryable,
          actionable: mapping.actionable
        };
      }
    }

    // 根据状态码推断错误类型
    const statusCode = response?.status || 0;
    const errorType = STATUS_CODE_MAP[statusCode] || 'unknown_error';
    const mapping = ERROR_MAP[errorType];

    // 尝试从响应中提取错误消息
    let message = error.message || '请求失败';
    if (data?.detail) {
      message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } else if (data?.message) {
      message = data.message;
    }

    return {
      error: errorType,
      message,
      code: statusCode,
      details: data,
      category: mapping?.category || categorizeByStatus(statusCode),
      severity: mapping?.severity || severityByStatus(statusCode),
      i18nKey: mapping?.i18nKey,
      retryable: mapping?.retryable ?? (statusCode >= 500 || statusCode === 408 || statusCode === 429),
      actionable: mapping?.actionable ?? (statusCode >= 400 && statusCode < 500)
    };
  }

  /**
   * 从普通 Error 创建标准错误
   */
  private static fromError(error: Error): StandardError {
    // 检查是否是网络错误
    const isNetworkError = error.message.toLowerCase().includes('network') ||
                          error.message.toLowerCase().includes('fetch');

    return {
      error: isNetworkError ? 'network_error' : 'client_error',
      message: error.message,
      code: 0,
      category: isNetworkError ? ErrorCategory.NETWORK : ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      i18nKey: isNetworkError ? 'errors.network_error' : 'errors.client_error',
      retryable: isNetworkError,
      actionable: true
    };
  }

  /**
   * 从未知错误创建标准错误
   */
  private static fromUnknown(error: unknown): StandardError {
    return {
      error: 'unknown_error',
      message: String(error),
      code: 0,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      i18nKey: 'errors.unknown_error',
      retryable: false,
      actionable: false
    };
  }

  /**
   * 获取用户友好的错误消息
   * 
   * @param error - 标准错误对象
   * @param t - 国际化翻译函数
   * @returns 用户友好的错误消息
   */
  static getUserMessage(error: StandardError, t: (key: string) => string): string {
    // 优先使用国际化消息
    if (error.i18nKey) {
      const translated = t(error.i18nKey);
      // 如果翻译成功（返回值不等于 key），使用翻译结果
      if (translated !== error.i18nKey) {
        return translated;
      }
    }

    // 使用预设的用户消息
    if (error.userMessage) {
      return error.userMessage;
    }

    // 根据错误类别返回通用消息
    const categoryKey = `errors.${error.category}_generic`;
    const categoryMessage = t(categoryKey);
    if (categoryMessage !== categoryKey) {
      return categoryMessage;
    }

    // 最后的兜底：使用原始消息或通用错误消息
    return error.message || t('errors.generic');
  }

  /**
   * 获取错误提示文本（用于 toast description）
   * 
   * @param error - 标准错误对象
   * @param t - 国际化翻译函数
   * @returns 错误提示文本，如果没有则返回 undefined
   */
  static getHintMessage(error: StandardError, t: (key: string) => string): string | undefined {
    // 从 details 中获取提示
    if (error.details?.hint) {
      const hintKey = error.details.hint;
      const translated = t(hintKey);
      if (translated !== hintKey) {
        return translated;
      }
    }

    // 根据错误类型提供默认提示
    if (error.retryable) {
      return t('errors.hint_retry');
    }

    if (error.actionable && error.category === ErrorCategory.VALIDATION) {
      return t('errors.hint_check_input');
    }

    if (error.category === ErrorCategory.PERMISSION) {
      return t('errors.hint_permission');
    }

    return undefined;
  }

  /**
   * 类型守卫：检查是否为标准错误
   */
  private static isStandardError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      'message' in error &&
      'code' in error &&
      'category' in error &&
      'severity' in error
    );
  }

  /**
   * 类型守卫：检查是否为 Axios 错误
   */
  private static isAxiosError(error: unknown): error is AxiosError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as any).isAxiosError === true
    );
  }

  /**
   * 判断错误是否可重试
   */
  static isRetryable(error: StandardError): boolean {
    return error.retryable === true;
  }

  /**
   * 判断错误是否需要用户操作
   */
  static isActionable(error: StandardError): boolean {
    return error.actionable === true;
  }

  /**
   * 判断是否为认证错误
   */
  static isAuthError(error: StandardError): boolean {
    return error.category === ErrorCategory.AUTH;
  }

  /**
   * 判断是否为权限错误
   */
  static isPermissionError(error: StandardError): boolean {
    return error.category === ErrorCategory.PERMISSION;
  }

  /**
   * 判断是否为网络错误
   */
  static isNetworkError(error: StandardError): boolean {
    return error.category === ErrorCategory.NETWORK;
  }

  /**
   * 判断是否为服务器错误
   */
  static isServerError(error: StandardError): boolean {
    return error.category === ErrorCategory.SERVER;
  }
}