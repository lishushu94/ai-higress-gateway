/**
 * 错误处理模块统一导出
 */

export { ErrorHandler } from './error-handler';
export { useErrorDisplay, ErrorDisplay } from './error-display';
export { ErrorSeverity, ErrorCategory } from './types';
export type { StandardError, ErrorMapping } from './types';
export { ERROR_MAP, STATUS_CODE_MAP } from './error-map';