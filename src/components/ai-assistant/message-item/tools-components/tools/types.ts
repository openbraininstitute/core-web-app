import { logError } from '@/util/logger';
import { assertType } from '@/util/type-guards';

export interface ToolResult {
  storage_id: string;
}

export function isToolResult(data: unknown): data is ToolResult {
  try {
    assertType(data, { storage_id: 'string' });
    return true;
  } catch (ex) {
    logError('This is not a valid tool result:', data, ex);
    return false;
  }
}
