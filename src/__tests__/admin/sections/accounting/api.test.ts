import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listJobs, reportPath } from '@/admin/sections/accounting/api';
import { isForbidden } from '@/admin/shared/errors';
import { ApiError } from '@/api/error';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('accounting client', () => {
  it('calls the proxy without empty filters and unwraps a page', async () => {
    fetchMock.mockResolvedValue(
      json({
        message: 'ok',
        data: {
          items: [{ id: 'j1' }],
          meta: { page: 1, page_size: 20, total_pages: 1, total_items: 1 },
        },
      })
    );

    const page = await listJobs({ page: 1, page_size: 20, status: undefined, vlab_id: 'v1' });

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/admin/accounting/admin/job?page=1&page_size=20&vlab_id=v1'
    );
    expect(page).toEqual({ data: [{ id: 'j1' }], pagination: { total: 1 } });
  });

  it("throws the proxy's message, keeping a denial a 403", async () => {
    fetchMock.mockResolvedValue(json({ message: "Your account isn't allowed to do this" }, 403));

    const error = await listJobs({ page: 1, page_size: 20 }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(isForbidden(error)).toBe(true);
  });

  it('keeps an unreachable service apart from a denial', async () => {
    fetchMock.mockResolvedValue(
      json({ message: "Accounting isn't reachable from this environment." }, 502)
    );

    const error = await listJobs({ page: 1, page_size: 20 }).catch((caught) => caught);

    expect(isForbidden(error)).toBe(false);
    expect(error.message).toBe("Accounting isn't reachable from this environment.");
  });
  it('throws a readable error for a success reply it cannot read', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"trunc', { headers: { 'content-type': 'application/json' } })
    );

    const error = await listJobs({ page: 1, page_size: 20 }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.cause?.status).toBe(200);
  });
});

describe('reportPath', () => {
  it('prefers the project, then the lab, then the whole system', () => {
    expect(reportPath({ vlabId: 'v', projectId: 'p' })).toBe('report/project/p');
    expect(reportPath({ vlabId: 'v' })).toBe('report/virtual-lab/v');
    expect(reportPath({})).toBe('report/system');
  });
});
