/**
 * Result<T, E> — server actions return this instead of throwing. Errors stay
 * within the request boundary; the client renders them as toasts.
 */

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface AppError {
  code:
    | 'unauthenticated'
    | 'forbidden'
    | 'rate_limited'
    | 'invalid_input'
    | 'not_found'
    | 'conflict'
    | 'extraction_failed'
    | 'storage_failed'
    | 'unknown';
  message: string;
  details?: Record<string, unknown>;
}

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (code: AppError['code'], message: string, details?: AppError['details']): Result<never, AppError> => ({
  ok: false,
  error: { code, message, ...(details ? { details } : {}) },
});
