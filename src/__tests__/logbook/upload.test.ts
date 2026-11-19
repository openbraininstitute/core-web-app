// One upload: one call to the logbook server, then the bytes straight to S3, with no token.
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('@/auth-fetch', () => ({ getSession: () => Promise.resolve({ accessToken: 'token' }) }));

import { config } from '@/config';
import { planFile, uploadLogFile } from '@/features/logbook/api/log-files';

const PROJECT = { virtualLabId: 'lab', projectId: 'project' };
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

interface ISent {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly body: string;
}

// The logbook server answers `answer`; S3 answers `putStatus`. Every request is kept.
function serve(answer: (path: string) => unknown, putStatus = 200): ISent[] {
  const sent: ISent[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    // The API client sends a Request; the S3 PUT sends a URL and its init.
    const request = input instanceof Request ? input : null;
    const url = request?.url ?? input.toString();
    const headers = request?.headers ?? new Headers(init?.headers);
    const method = request?.method ?? init?.method ?? 'GET';
    const body = request ? await request.text() : '';
    sent.push({ url, method, headers, body });
    if (method === 'PUT') return new Response(null, { status: putStatus });
    const { name, sha256 } = JSON.parse(body) as { name: string; sha256: string };
    return Response.json(answer(`${name.replace('.png', '')}.${sha256.slice(0, 12)}.png`));
  }) as typeof fetch;
  return sent;
}

// The message a promise fails with ('' when it does not fail).
const failureOf = (promise: Promise<unknown>): Promise<string> =>
  promise.then(
    () => '',
    (error: unknown) => (error instanceof Error ? error.message : 'not an Error')
  );

// An answer with a PUT to send and no signed header.
const target = (path: string) => ({ path, upload: { url: 'https://s3.test/put', headers: {} } });

const file = new File(['rate plot v1'], 'rate.png');
const signed = { 'If-None-Match': '*', 'Content-Length': '12', 'x-amz-checksum-sha256': 'c' };

test('one call names the file; the PUT goes to S3 with the signed headers, no token', async () => {
  const planned = await planFile(file);
  const sent = serve((path) => ({ path, upload: { url: 'https://s3.test/put', headers: signed } }));
  await uploadLogFile('log-1', PROJECT, file, planned);
  expect(sent.map((s) => `${s.method} ${s.url}`)).toEqual([
    `POST ${config.LOGBOOK_URL}/v1/research/log-1/upload`,
    'PUT https://s3.test/put',
  ]);
  expect(JSON.parse(sent[0]?.body ?? '')).toEqual({
    name: 'rate.png',
    size: 12,
    sha256: planned.sha256,
  });
  expect(sent[0]?.headers.get('project-id')).toBe('project');
  expect(sent[1]?.headers.get('authorization')).toBeNull();
  expect(sent[1]?.headers.get('content-length')).toBeNull(); // the browser sets it
  expect(sent[1]?.headers.get('x-amz-checksum-sha256')).toBe('c');
});

test('saved already (upload null, or 412 from S3) is done; another S3 error throws', async () => {
  const planned = await planFile(file);
  serve((path) => ({ path, upload: null }));
  await uploadLogFile('log-1', PROJECT, file, planned);
  serve(target, 412);
  await uploadLogFile('log-1', PROJECT, file, planned);
  serve(target, 500);
  expect(await failureOf(uploadLogFile('log-1', PROJECT, file, planned))).toContain('HTTP 500');
});

test('a name the server picked differently is an error, and nothing is sent to S3', async () => {
  const planned = await planFile(file);
  const sent = serve(() => ({
    path: 'inputs/other',
    upload: { url: 'https://s3.test/put', headers: {} },
  }));
  expect(await failureOf(uploadLogFile('log-1', PROJECT, file, planned))).toContain('inputs/other');
  expect(sent.filter((s) => s.method === 'PUT')).toHaveLength(0);
});
