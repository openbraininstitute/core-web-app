import { TEST_USERNAME } from './fixtures';

import type { vi } from 'vitest';

type BoundaryMocks = {
  downloadAssetMock: ReturnType<typeof vi.fn>;
  getSessionMock: ReturnType<typeof vi.fn>;
};

export function resetDownloadBoundaryMocks(
  { downloadAssetMock, getSessionMock }: BoundaryMocks,
  body = 'asset-bytes'
) {
  downloadAssetMock.mockReset();
  downloadAssetMock.mockImplementation(async () => {
    const buffer = Buffer.from(body);
    return new Response(buffer, {
      headers: { 'content-length': String(buffer.length) },
    });
  });
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue({
    user: { username: TEST_USERNAME },
    accessToken: 'token',
  });
}
