export function createAsyncIterableStream<T>(
  stream: ReadableStream<T>,
): ReadableStream<T> & AsyncIterable<T> {
  const asyncIterable = {
    async *[Symbol.asyncIterator]() {
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };

  return Object.assign(stream, asyncIterable);
}

export async function createTextStream(
  response: Response,
): Promise<ReadableStream<string> | undefined> {
  if (!response.body) return undefined;

  return response.body
    .pipeThrough(new TextDecoderStream()) // convert bytes → string
    .pipeThrough(
      new TransformStream<string, string>({
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      }),
    );
}

export async function* messageGenerator<T>(
  textStream: ReadableStream<string> | undefined,
): AsyncIterable<T> {
  if (!textStream) {
    return;
  }

  const reader = textStream.getReader();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;
      let eolIndex: number;

      // eslint-disable-next-line no-cond-assign
      while ((eolIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, eolIndex).trim();
        buffer = buffer.slice(eolIndex + 1);
        if (!line) continue;

        try {
          const msg = JSON.parse(line) as T;
          yield msg;
        } catch (_err) {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* emptyStream() {
  yield* [];
}
