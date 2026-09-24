// @vitest-environment node
import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestDownloadTicket } from '@/api/entity-download';
import { POST } from '@/app/api/entity-download/[entityType]/ticket/route';

vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: {} })) }));
vi.mock('@/utils/logger', () => ({ logError: vi.fn(), logInfo: vi.fn() }));

function answer(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(body, { status }))
  );
}

describe('requestDownloadTicket', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the route's message when it is a string", async () => {
    answer(503, { error: 'Too many downloads are being prepared right now.' });

    await expect(requestDownloadTicket('/ticket', {})).rejects.toThrow(
      'Too many downloads are being prepared right now.'
    );
  });

  it('never shows a non-string error payload such as raw zod issues', async () => {
    answer(400, {
      error: [
        { code: 'too_big', message: 'x' },
        { code: 'invalid', message: 'y' },
      ],
    });

    const failure = requestDownloadTicket('/ticket', {});

    await expect(failure).rejects.toThrow('Download could not be prepared (error 400).');
    await expect(failure).rejects.not.toThrow('[object Object]');
  });
});

describe('POST /api/entity-download/[entityType]/ticket', () => {
  it('explains the 100-item limit a data-table selection can exceed', async () => {
    const request = new NextRequest('http://localhost/api/entity-download/cell-morphology/ticket', {
      method: 'POST',
      body: JSON.stringify({ entityIds: Array.from({ length: 101 }, () => randomUUID()) }),
    });

    const response = await POST(request, { params: { entityType: 'cell-morphology' } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('You can download at most 100 items at once.');
  });
});
