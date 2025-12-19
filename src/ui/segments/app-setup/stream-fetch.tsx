import type { TWorkspaceBootstrapStepStatus } from '@/ui/segments/app-setup/helpers';
import { log } from '@/utils/logger';

export interface StreamItem {
  step: string;
  status: TWorkspaceBootstrapStepStatus;
  message: string;
  progress: number;
  data: any;
}

export async function* streamingFetch(
  url: string,
  options: RequestInit,
): AsyncGenerator<StreamItem, void, unknown> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  try {
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            yield data as StreamItem;
          } catch (e) {
            log('error', 'Failed to parse JSON:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
