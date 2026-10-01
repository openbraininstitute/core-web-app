/** Cache Storage in memory, which Node lacks, with the failures the pipeline must survive. */

type Key = RequestInfo | URL;

const urlOf = (key: Key) =>
  new URL(typeof key === 'string' || key instanceof URL ? key : key.url).href;

export class FakeCache {
  entries = new Map<string, { body: Uint8Array; headers: Headers }>();
  /** A write fails once its body has passed this many bytes. */
  quotaBytes = Infinity;
  /** What a failed write leaves: nothing, as Chrome commits, or what had arrived, as Firefox may. */
  onFailure: 'nothing' | 'partial' = 'nothing';

  async match(key: Key): Promise<Response | undefined> {
    const entry = this.entries.get(urlOf(key));
    return entry && new Response(entry.body.slice(), { headers: entry.headers });
  }

  async put(key: Key, response: Response): Promise<void> {
    const chunks: Uint8Array[] = [];
    let size = 0;
    const commit = () => {
      const body = new Uint8Array(size);
      let at = 0;
      for (const c of chunks) {
        body.set(c, at);
        at += c.byteLength;
      }
      this.entries.set(urlOf(key), { body, headers: new Headers(response.headers) });
    };
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.byteLength;
        if (size > this.quotaBytes) throw new DOMException('quota', 'QuotaExceededError');
      }
    } catch (e) {
      if (this.onFailure === 'partial') commit();
      throw e;
    }
    commit();
  }

  async delete(key: Key): Promise<boolean> {
    return this.entries.delete(urlOf(key));
  }

  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url));
  }
}

export class FakeCacheStorage {
  buckets = new Map<string, FakeCache>();

  async open(name: string): Promise<FakeCache> {
    let cache = this.buckets.get(name);
    if (!cache) {
      cache = new FakeCache();
      this.buckets.set(name, cache);
    }
    return cache;
  }

  bucket(name: string): FakeCache {
    const cache = this.buckets.get(name);
    if (!cache) throw new Error(`no bucket ${name}`);
    return cache;
  }
}

/**
 * A server for `fetch`: each URL's body, served in chunks, with its length. It counts the chunks read, and errors
 * the body when the request is aborted.
 */
export function fakeServer(
  files: Record<string, Uint8Array>,
  { chunk = 1024, length = true } = {}
) {
  const served = { requests: 0, chunks: 0, aborted: 0 };
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    served.requests++;
    const bytes = files[urlOf(input)];
    if (!bytes) return new Response('not found', { status: 404 });
    let at = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        init?.signal?.addEventListener('abort', () => {
          served.aborted++;
          controller.error(new DOMException('aborted', 'AbortError'));
        });
      },
      pull(controller) {
        if (at >= bytes.byteLength) {
          controller.close();
          return;
        }
        served.chunks++;
        controller.enqueue(bytes.slice(at, at + chunk));
        at += chunk;
      },
    });
    const headers: Record<string, string> = length
      ? { 'Content-Length': String(bytes.byteLength) }
      : {};
    return new Response(body, { headers });
  };
  return { fetch, served };
}
