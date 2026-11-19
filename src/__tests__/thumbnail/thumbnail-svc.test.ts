import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPreviewBlob, isTransientThumbnailError, ThumbnailError } from '@/api/thumbnail-svc';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';

vi.mock('@/auth-fetch', () => ({
  getSession: vi.fn().mockResolvedValue({ accessToken: 'token' }),
}));

// A memodel needs no asset (model-trace route), so no entity configuration is involved.
const memodel = { id: 'e1', type: 'memodel', assets: [] } as unknown as EntityCoreResource;

function answer(body: BodyInit, status: number, type: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(body, { status, headers: { 'content-type': type } }))
  );
}

async function refusal(): Promise<ThumbnailError> {
  const error = await getPreviewBlob(memodel).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ThumbnailError);
  return error as ThumbnailError;
}

describe('getPreviewBlob', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the image', async () => {
    answer('png-bytes', 200, 'image/png');
    const blob = await getPreviewBlob(memodel);
    expect(blob.type).toBe('image/png');
  });

  it('carries the RFC 9457 problem of a refusal', async () => {
    const problem = {
      title: 'Asset not ready',
      status: 409,
      detail: 'Uploading',
      code: 'ASSET_NOT_READY',
    };
    answer(JSON.stringify(problem), 409, 'application/problem+json');
    const error = await refusal();
    expect(error.problem).toEqual({ status: 409, code: 'ASSET_NOT_READY', detail: 'Uploading' });
    expect(isTransientThumbnailError(error)).toBe(true);
  });

  it('keeps the status of a body that is not a problem', async () => {
    answer('<html>Bad Gateway</html>', 502, 'text/html');
    const error = await refusal();
    expect(error.problem.status).toBe(502);
    expect(error.problem.code).toBe('UNKNOWN');
  });

  it('does not retry a final refusal', async () => {
    const problem = {
      title: 'Asset not found',
      status: 404,
      detail: 'Gone',
      code: 'ASSET_NOT_FOUND',
    };
    answer(JSON.stringify(problem), 404, 'application/problem+json');
    expect(isTransientThumbnailError(await refusal())).toBe(false);
  });
});
