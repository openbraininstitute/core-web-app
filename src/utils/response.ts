import { log } from '@/utils/logger';

/**
 * Reads and processes NDJSON (newline-delimited JSON) data from a streaming HTTP response.
 *
 * This function handles streaming responses containing multiple JSON objects separated by newlines.
 * Each line is parsed as JSON and passed to the optional callback function as it becomes available.
 *
 * @template T The type of the JSON objects expected in each line
 * @param response The HTTP Response object to read from
 * @param onMessage Optional callback function called for each parsed JSON object
 *
 * @throws {Error} When the HTTP response status is not ok (status >= 400)
 * @throws {Error} When the response body is empty or null
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/stream');
 * await readNdjsonResponse<{id: string, message: string}>(response, (data) => {
 *   console.log('Received:', data.message);
 * });
 * ```
 */
export async function readNdjsonResponse<T>(response: Response, onMessage?: (data: T) => void) {
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Response body is empty');
  }

  let buffer = '';

  const stream = response.body
    .pipeThrough(new TextDecoderStream()) // UTF-8 by default
    .pipeThrough(
      new TransformStream({
        start() {
          buffer = '';
        },
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() as string;
          for (const line of lines) {
            if (line.trim()) {
              controller.enqueue(line);
            }
          }
        },
        flush(controller) {
          if (buffer.trim()) {
            controller.enqueue(buffer);
          }
        },
      })
    );

  const reader = stream.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    try {
      const message = JSON.parse(value) as T;
      onMessage?.(message);
    } catch (e) {
      log('warn', 'Invalid JSON line:', value, e);
    }
  }
}
