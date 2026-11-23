import { beforeEach, describe, expect, it, vi } from 'vitest';

const authFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/auth-fetch', () => ({
  default: authFetchMock,
  getSession: vi.fn(),
}));

vi.mock('@/config', () => ({ config: { NOTEBOOK_API_URL: 'http://svc/api/notebook_service' } }));

import {
  listNotebookSessions,
  openNotebookSession,
  startNotebookSession,
  stopNotebookSession,
} from '@/services/notebooks';

const SCOPE = { vlabId: 'vlab', projectId: 'proj', cloud: 'aws' };

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

describe('notebook sessions client', () => {
  beforeEach(() => authFetchMock.mockReset());

  it('lists sessions with the project in the query string', async () => {
    authFetchMock.mockResolvedValue(jsonResponse(200, { sessions: [], max_sessions: 3 }));
    await expect(listNotebookSessions(SCOPE)).resolves.toEqual({ sessions: [], max_sessions: 3 });
    const [url, init] = authFetchMock.mock.calls[0];
    expect(url).toBe(
      'http://svc/api/notebook_service/sessions?vlabId=vlab&projectId=proj&cloud=aws'
    );
    expect(init.method).toBe('GET');
  });

  it('starts a session with a profile and a template', async () => {
    authFetchMock.mockResolvedValue(
      jsonResponse(200, { session_number: 1, url: 'u', message: 'm' })
    );
    await startNotebookSession({
      ...SCOPE,
      profile: 'large',
      template: { id: 'tpl', filename: 'a.ipynb' },
    });
    const [url, init] = authFetchMock.mock.calls[0];
    expect(url).toBe('http://svc/api/notebook_service/sessions');
    expect(JSON.parse(init.body)).toEqual({
      ...SCOPE,
      profile: 'large',
      analysis_notebook_template_id: 'tpl',
      analysis_notebook_template_filename: 'a.ipynb',
    });
  });

  it('omits profile and template when not given', async () => {
    authFetchMock.mockResolvedValue(
      jsonResponse(200, { session_number: 0, url: 'u', message: 'm' })
    );
    await startNotebookSession(SCOPE);
    expect(JSON.parse(authFetchMock.mock.calls[0][1].body)).toEqual(SCOPE);
  });

  it('opens an existing session by number', async () => {
    authFetchMock.mockResolvedValue(
      jsonResponse(200, { session_number: 2, url: 'u', message: 'm' })
    );
    await openNotebookSession(2, SCOPE);
    expect(authFetchMock.mock.calls[0][0]).toBe('http://svc/api/notebook_service/sessions/2/open');
  });

  it('stops a session with DELETE', async () => {
    authFetchMock.mockResolvedValue(
      jsonResponse(200, { session_number: 2, url: '', message: 'm' })
    );
    await stopNotebookSession(2, SCOPE);
    const [url, init] = authFetchMock.mock.calls[0];
    expect(url).toBe(
      'http://svc/api/notebook_service/sessions/2?vlabId=vlab&projectId=proj&cloud=aws'
    );
    expect(init.method).toBe('DELETE');
  });

  it('turns the session limit status into a readable hint', async () => {
    authFetchMock.mockResolvedValue(jsonResponse(470, { detail: 'Maximum of 3' }));
    await expect(startNotebookSession(SCOPE)).rejects.toMatchObject({
      cause: { error_code: 'SESSION_LIMIT_REACHED' },
    });
  });

  it('keeps the credits error recognisable', async () => {
    authFetchMock.mockResolvedValue(jsonResponse(461, { detail: 'x' }));
    await expect(startNotebookSession(SCOPE)).rejects.toMatchObject({
      cause: { error_code: 'INSUFFICIENT_FUNDS_ERROR' },
    });
  });

  it('surfaces the service detail for other errors', async () => {
    authFetchMock.mockResolvedValue(jsonResponse(404, { detail: 'No session 5 in this project' }));
    await expect(openNotebookSession(5, SCOPE)).rejects.toMatchObject({
      cause: { detail: 'No session 5 in this project', status: 404 },
    });
  });
});
