import { ApiError } from '@/api/error';

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.cause?.status === 403;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.cause?.status === 404;
}
