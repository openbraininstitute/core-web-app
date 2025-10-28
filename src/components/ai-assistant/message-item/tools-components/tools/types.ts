import { logError } from '@/util/logger';

type StorageIds = string | string[];

export interface ToolResult {
  storage_id: StorageIds;
}

export function isToolResult(data: unknown): data is ToolResult {
  if (
    typeof data === 'object' &&
    data !== null &&
    'storage_id' in data &&
    (typeof data.storage_id === 'string' || Array.isArray(data.storage_id))
  )
    return true;

  logError('This is not a valid tool result:', data);
  return false;
}
