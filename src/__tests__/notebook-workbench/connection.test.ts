import { describe, expect, it } from 'vitest';

import { fileUrl, parsePodUrl } from '@/features/notebook-workbench/jupyter/connection';

/**
 * notebook_service hands back the URL a browser would be redirected to, which
 * points at JupyterLab rather than the server's API root. These cases cover the
 * shapes JupyterHub produces so the workbench connects to the right base URL.
 */
describe('parsePodUrl', () => {
  it('splits a /lab/tree URL into server root and notebook path', () => {
    const { target, notebookPath } = parsePodUrl(
      'https://hub.example.org/user/alice/lab/tree/analysis_notebook.ipynb'
    );
    expect(target.baseUrl).toBe('https://hub.example.org/user/alice');
    expect(notebookPath).toBe('analysis_notebook.ipynb');
    expect(target.token).toBe('');
  });

  it('keeps a hub mounted under a base path', () => {
    const { target, notebookPath } = parsePodUrl(
      'https://staging.cell-a.openbraininstitute.org/jupyterhub/user/bob/lab/tree/nested/dir/run.ipynb'
    );
    expect(target.baseUrl).toBe(
      'https://staging.cell-a.openbraininstitute.org/jupyterhub/user/bob'
    );
    expect(notebookPath).toBe('nested/dir/run.ipynb');
  });

  it('extracts a token when the spawn URL carries one', () => {
    const { target } = parsePodUrl(
      'https://hub.example.org/user/alice/lab/tree/a.ipynb?token=secret-token'
    );
    expect(target.token).toBe('secret-token');
    expect(target.baseUrl).toBe('https://hub.example.org/user/alice');
  });

  it('handles a bare server URL with no notebook', () => {
    const { target, notebookPath } = parsePodUrl('https://hub.example.org/user/alice/');
    expect(target.baseUrl).toBe('https://hub.example.org/user/alice');
    expect(notebookPath).toBeNull();
  });

  it('handles the /tree and /notebooks legacy prefixes', () => {
    expect(parsePodUrl('https://h.org/user/a/tree/x.ipynb').target.baseUrl).toBe(
      'https://h.org/user/a'
    );
    expect(parsePodUrl('https://h.org/user/a/notebooks/x.ipynb').notebookPath).toBe('x.ipynb');
  });

  it('decodes escaped path segments', () => {
    expect(parsePodUrl('https://h.org/user/a/lab/tree/my%20notebook.ipynb').notebookPath).toBe(
      'my notebook.ipynb'
    );
  });
});

describe('fileUrl', () => {
  it('builds a files URL and appends the token when there is one', () => {
    expect(fileUrl({ baseUrl: 'https://h.org/user/a', token: 't' }, 'data/x.csv')).toBe(
      'https://h.org/user/a/files/data/x.csv?token=t'
    );
  });

  it('omits the query entirely when authenticating by cookie', () => {
    expect(fileUrl({ baseUrl: 'https://h.org/user/a', token: '' }, 'x.csv')).toBe(
      'https://h.org/user/a/files/x.csv'
    );
  });
});
