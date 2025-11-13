import { logError } from '@/util/logger';
import { assertType } from '@/util/type-guards';

type StorageIds = string | string[];

export interface ToolResult {
  storage_id: StorageIds;
}

export function isToolResult(data: unknown): data is ToolResult {
  try {
    assertType(data, { storage_id: ['|', 'string', ['array', 'string']] }); // string or string[]
    return true;
  } catch (ex) {
    logError('This is not a valid tool result:', data, ex);
    return false;
  }
}
