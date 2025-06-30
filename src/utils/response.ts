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
      console.warn('Invalid JSON line:', value, e);
    }
  }
}
