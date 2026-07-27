import { ServerConnection, ServiceManager } from '@jupyterlab/services';

/**
 * A single-user Jupyter server to drive. In the platform this is a JupyterHub pod
 * spawned by notebook_service; in local development it can be any Jupyter server.
 */
export interface JupyterTarget {
  /** Base URL of the single-user server, e.g. `https://hub.example.org/user/alice`. */
  baseUrl: string;
  /** API token, when the spawn URL carried one. Empty means cookie auth. */
  token: string;
}

export interface ParsedPodUrl {
  target: JupyterTarget;
  /** Notebook to open, relative to the server root, when the URL pointed at one. */
  notebookPath: string | null;
}

/**
 * notebook_service returns the URL a browser would normally be redirected to, which
 * points at JupyterLab rather than at the API root — typically
 * `https://host/user/<name>/lab/tree/<notebook>.ipynb`, sometimes with `?token=`.
 * The workbench needs the server root and the notebook path separately.
 */
export function parsePodUrl(rawUrl: string): ParsedPodUrl {
  const url = new URL(rawUrl);
  const token = url.searchParams.get('token') ?? '';

  // Everything up to /lab, /tree, /notebooks or /doc is the server's base path.
  const match = url.pathname.match(/^(.*?)\/(?:lab\/tree|lab|tree|notebooks|doc\/tree)(\/.*)?$/);
  const basePath = match ? match[1] : url.pathname.replace(/\/$/, '');
  const trailing = match?.[2] ?? '';

  const notebookPath = trailing ? decodeURIComponent(trailing.replace(/^\//, '')) || null : null;

  return {
    target: { baseUrl: `${url.origin}${basePath}`, token },
    notebookPath,
  };
}

export function createServiceManager(target: JupyterTarget): ServiceManager.IManager {
  const baseUrl = target.baseUrl.replace(/\/$/, '');

  const serverSettings = ServerConnection.makeSettings({
    baseUrl,
    wsUrl: `${baseUrl.replace(/^http/, 'ws')}/`,
    token: target.token,
    appendToken: Boolean(target.token),
    init: {
      cache: 'no-store',
      // Falls back to the JupyterHub session cookie when no token was issued.
      credentials: target.token ? 'same-origin' : 'include',
    },
  });

  return new ServiceManager({ serverSettings, standby: 'never' });
}

/** Direct URL for downloading or previewing a file from the server. */
export function fileUrl(target: JupyterTarget, path: string, download = false): string {
  const base = target.baseUrl.replace(/\/$/, '');
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const query = target.token ? `?token=${encodeURIComponent(target.token)}` : '';
  return `${base}/files/${encoded}${query}${download ? `${query ? '&' : '?'}download=1` : ''}`;
}

/**
 * Cross-origin embedding needs the pod to allow this app's origin. Used to turn an
 * opaque network failure into an actionable message rather than a spinner.
 */
export function isLikelyCorsFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed')
  );
}
