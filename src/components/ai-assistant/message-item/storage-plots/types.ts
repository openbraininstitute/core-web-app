import { logError } from '@/util/logger';
import { assertType } from '@/util/type-guards';

type FileIdentifier = string | string[];

export interface ToolResult {
  storage_id?: FileIdentifier;
  url_link?: FileIdentifier;
  image_link?: FileIdentifier;
}

export function isToolResult(data: unknown): data is ToolResult {
  try {
    assertType(data, [
      'partial',
      {
        storage_id: ['?', ['|', 'string', ['array', 'string']]],
        url_link: ['?', ['|', 'string', ['array', 'string']]],
        image_link: ['?', ['|', 'string', ['array', 'string']]],
      },
    ]);
    return true;
  } catch (ex) {
    logError('This is not a valid tool result:', data, ex);
    return false;
  }
}
