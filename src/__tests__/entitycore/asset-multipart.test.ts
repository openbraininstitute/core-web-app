import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAsset } from '@/api/entitycore/queries/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';

import type { EntityCoreDataType, IUploadPart } from '@/api/entitycore/types/shared/global';

const { post, del } = vi.hoisted(() => ({ post: vi.fn(), del: vi.fn() }));

vi.mock('@/api/api-client', () => ({
  authApiClient: vi.fn(async () => ({ post, delete: del })),
}));
vi.mock('@/config', () => ({ config: { ENTITY_CORE_URL: 'https://entitycore.test' } }));
vi.mock('@/auth-fetch', () => ({ getSession: vi.fn(async () => null) }));

const FAKE_DIGEST = 'a'.repeat(64);
vi.mock('@/utils/hash', () => ({
  sha256HexOfBlob: vi.fn(
    async (_blob: Blob, opts?: { onProgress?: (n: number) => void }): Promise<string> => {
      opts?.onProgress?.(1);
      return FAKE_DIGEST;
    }
  ),
}));

const MB = 1024 * 1024;
const ENTITY_TYPE = 'electrical_cell_recording' as EntityCoreDataType;
const ENTITY_ID = 'ent-1';
const ASSET_ID = 'asset-1';

const fetchMock = vi.fn();

function baseArgs(payload: BlobPart) {
  return {
    ctx: { virtualLabId: 'vl-1', projectId: 'pr-1' },
    entityType: ENTITY_TYPE,
    entityId: ENTITY_ID,
    fileName: 'recording.nwb',
    mimeType: 'application/nwb',
    label: AssetLabel.nwb,
    payload,
  };
}

// 3 parts of 10MB each; the 25MB test file leaves a 5MB remainder in the last part
function initiateResponse() {
  const parts: IUploadPart[] = [1, 2, 3].map((n) => ({
    part_number: n,
    url: `https://s3.test/part/${n}`,
  }));
  return { id: ASSET_ID, status: 'uploading', upload_meta: { part_size: 10 * MB, parts } };
}

const completedAsset = { id: ASSET_ID, status: 'created' };

function partUrlCalls(partNumber: number) {
  return fetchMock.mock.calls.filter(([url]) => url === `https://s3.test/part/${partNumber}`);
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  post.mockImplementation(async (uri: string) =>
    uri.includes('/multipart-upload/initiate') ? initiateResponse() : completedAsset
  );
  del.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  post.mockReset();
  del.mockReset();
});

describe('createAsset threshold routing', () => {
  it('posts small files as a single FormData request', async () => {
    await createAsset(baseArgs(new Uint8Array(1024)));

    expect(post).toHaveBeenCalledTimes(1);
    const [uri, options] = post.mock.calls[0];
    expect(uri).toBe(`/electrical-cell-recording/${ENTITY_ID}/assets`);
    expect(options.body).toBeInstanceOf(FormData);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads files at the 20MB threshold through the multipart flow', async () => {
    const result = await createAsset(baseArgs(new Uint8Array(25 * MB)));

    expect(post).toHaveBeenCalledTimes(2);
    const [initiateUri, initiateOptions] = post.mock.calls[0];
    expect(initiateUri).toBe(
      `/electrical-cell-recording/${ENTITY_ID}/assets/multipart-upload/initiate`
    );
    expect(initiateOptions.headers).toMatchObject({
      // The ApiClient sends no default content-type; without an explicit one the
      // stringified body goes out as text/plain and entitycore rejects it.
      'content-type': 'application/json',
      'virtual-lab-id': 'vl-1',
      'project-id': 'pr-1',
    });
    expect(initiateOptions.body).toEqual({
      filename: 'recording.nwb',
      filesize: 25 * MB,
      sha256_digest: FAKE_DIGEST,
      content_type: 'application/nwb',
      label: AssetLabel.nwb,
      preferred_part_count: 3,
    });

    expect(post.mock.calls[1][0]).toBe(
      `/electrical-cell-recording/${ENTITY_ID}/assets/${ASSET_ID}/multipart-upload/complete`
    );
    expect(result).toEqual(completedAsset);
  });

  it('omits content_type when the mime type is not a known AssetContentType', async () => {
    await createAsset({ ...baseArgs(new Uint8Array(25 * MB)), mimeType: 'application/x-custom' });

    expect(post.mock.calls[0][1].body).not.toHaveProperty('content_type');
  });

  it('rejects large files without a label', async () => {
    await expect(
      createAsset({ ...baseArgs(new Uint8Array(25 * MB)), label: undefined })
    ).rejects.toThrow(/label/);
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects large files with meta, which the initiate endpoint does not accept', async () => {
    await expect(
      createAsset({ ...baseArgs(new Uint8Array(25 * MB)), meta: { some: 'meta' } })
    ).rejects.toThrow(/meta/);
    expect(post).not.toHaveBeenCalled();
  });
});

describe('multipart part uploads', () => {
  it('PUTs every part slice to its presigned URL without auth headers', async () => {
    await createAsset(baseArgs(new Uint8Array(25 * MB)));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const sizes = fetchMock.mock.calls.map(([, init]) => (init.body as Blob).size);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://s3.test/part/1',
      'https://s3.test/part/2',
      'https://s3.test/part/3',
    ]);
    // 25MB in 10MB parts: every byte covered exactly once, remainder in the last part
    expect(sizes).toEqual([10 * MB, 10 * MB, 5 * MB]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.method).toBe('PUT');
      expect(init.headers).toBeUndefined();
    }
  });

  it('reports hashing then uploading progress up to the total size', async () => {
    const progress: { phase: string; loadedBytes: number; totalBytes: number }[] = [];
    await createAsset({
      ...baseArgs(new Uint8Array(25 * MB)),
      onProgress: (p) => progress.push(p),
    });

    expect(progress[0]).toEqual({ phase: 'hashing', loadedBytes: 0, totalBytes: 25 * MB });
    // The mocked hasher reports 1 hashed byte; verify it is forwarded as hashing progress.
    expect(progress).toContainEqual({ phase: 'hashing', loadedBytes: 1, totalBytes: 25 * MB });
    const uploading = progress.filter((p) => p.phase === 'uploading');
    const loaded = uploading.map((p) => p.loadedBytes);
    expect(loaded).toEqual([...loaded].sort((a, b) => a - b));
    expect(uploading.at(-1)).toEqual({
      phase: 'uploading',
      loadedBytes: 25 * MB,
      totalBytes: 25 * MB,
    });
  });

  it('retries retryable part failures with backoff and then succeeds', async () => {
    vi.useFakeTimers();
    try {
      let attempts = 0;
      fetchMock.mockImplementation(async (url: string) => {
        if (url === 'https://s3.test/part/2') {
          attempts++;
          if (attempts === 1) return { ok: false, status: 500 };
          if (attempts === 2) throw new TypeError('network error');
        }
        return { ok: true, status: 200 };
      });

      const assertion = expect(createAsset(baseArgs(new Uint8Array(25 * MB)))).resolves.toEqual(
        completedAsset
      );
      await vi.runAllTimersAsync();
      await assertion;

      expect(attempts).toBe(3);
      expect(del).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up after exhausting retries and deletes the dangling asset', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation(async (url: string) => ({
        ok: url !== 'https://s3.test/part/2',
        status: url === 'https://s3.test/part/2' ? 503 : 200,
      }));

      const assertion = expect(createAsset(baseArgs(new Uint8Array(25 * MB)))).rejects.toThrow(
        /status 503/
      );
      await vi.runAllTimersAsync();
      await assertion;

      expect(partUrlCalls(2)).toHaveLength(3);
      expect(del).toHaveBeenCalledWith(
        `/electrical-cell-recording/${ENTITY_ID}/assets/${ASSET_ID}`,
        expect.anything()
      );
      expect(post).toHaveBeenCalledTimes(1); // initiate only, no complete
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails fast on a non-retryable status', async () => {
    fetchMock.mockImplementation(async (url: string) => ({
      ok: url !== 'https://s3.test/part/2',
      status: url === 'https://s3.test/part/2' ? 403 : 200,
    }));

    await expect(createAsset(baseArgs(new Uint8Array(25 * MB)))).rejects.toThrow(/status 403/);
    expect(partUrlCalls(2)).toHaveLength(1);
    expect(del).toHaveBeenCalledTimes(1);
  });

  it('cancels in-flight parts on abort and deletes the dangling asset', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );

    const assertion = expect(
      createAsset({ ...baseArgs(new Uint8Array(25 * MB)), signal: controller.signal })
    ).rejects.toThrow();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    controller.abort();
    await assertion;

    expect(del).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1); // initiate only, no complete
  });
});
