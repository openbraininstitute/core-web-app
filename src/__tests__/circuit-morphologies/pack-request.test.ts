// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCircuitMorphologyPackRequest } from '@/api/one/circuit-visualization';

const h = vi.hoisted(() => ({
  getSession: vi.fn(
    async (): Promise<{ accessToken?: string } | null> => ({ accessToken: 'token' })
  ),
}));

vi.mock('@/auth-fetch', () => ({ getSession: h.getSession }));
vi.mock('@/config', () => ({ config: { OBI_ONE_URL: 'https://obi-one.test/api' } }));
vi.mock('@/api/one/utils', () => ({ obioneApi: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

describe('buildCircuitMorphologyPackRequest', () => {
  it("asks OBI-One for the circuit's pack of at most so many segments, as the user in the workspace", async () => {
    const request = await buildCircuitMorphologyPackRequest('circuit-id', 2_000_000, {
      virtualLabId: 'lab',
      projectId: 'project',
    });

    expect(request).toEqual({
      url: 'https://obi-one.test/api/circuit/viz/circuit-id/morphology-pack?max_segments=2000000',
      headers: {
        Authorization: 'Bearer token',
        'virtual-lab-id': 'lab',
        'project-id': 'project',
      },
    });
  });

  it('sends neither a workspace nor a token it does not have', async () => {
    h.getSession.mockResolvedValueOnce(null);

    const request = await buildCircuitMorphologyPackRequest('circuit-id', 1000, null);

    expect(request.headers).toEqual({});
  });
});
