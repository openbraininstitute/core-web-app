import { type NextRequest, NextResponse } from 'next/server';

import { tryCatch } from '@/api/utils';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { auth } from '@/auth';
import { serverConfig } from '@/config/server';
import { startNotebook } from '@/services/notebooks';
import { resolveWorkspace } from '@/ui/segments/app-setup/helpers';
import { log } from '@/utils/logger';

import { createHmac, timingSafeEqual } from 'node:crypto';

const ERROR_PATH = '/app/grading/launch/error';
const LOG_IN_PATH = '/app/log-in';
const SYNC_PATH = '/app/virtual-lab/sync';
const DEFAULT_COMPUTE_CELL = 'aws';

type LaunchErrorReason =
  | 'invalid'
  | 'expired'
  | 'disabled'
  | 'notebook-service-failed'
  | 'insufficient-funds'
  | 'accounting-error'
  | 'jupyter-error';

interface VerifiedParams {
  token: string;
  exercise_id: string;
  notebook_id: string;
  tenant_id: string;
  exp: string;
  sig: string;
}

type VerificationResult =
  | { ok: true; params: VerifiedParams }
  | { ok: false; reason: 'invalid' | 'expired' };

// HMAC verification per launch-contract.md §1 and web-launch-route-spec.md §4.
// Sign the raw `exp` string from the URL (not the re-stringified int) so a value like
// "007" round-trips without breaking the signature.
function verifyLaunch(request: NextRequest, secret: string): VerificationResult {
  const q = request.nextUrl.searchParams;
  const token = q.get('token');
  const exercise_id = q.get('exercise_id');
  const notebook_id = q.get('notebook_id');
  const tenant_id = q.get('tenant_id');
  const exp = q.get('exp');
  const sig = q.get('sig');

  if (!token || !exercise_id || !notebook_id || !tenant_id || !exp || !sig) {
    return { ok: false, reason: 'invalid' };
  }
  if (!/^\d+$/.test(exp)) {
    return { ok: false, reason: 'invalid' };
  }
  const expN = Number.parseInt(exp, 10);
  if (!Number.isFinite(expN) || expN <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  const signingString = `${token}|${exercise_id}|${notebook_id}|${tenant_id}|${exp}`;
  const expected = createHmac('sha256', secret).update(signingString, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sig, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'invalid' };
  }

  return {
    ok: true,
    params: { token, exercise_id, notebook_id, tenant_id, exp, sig },
  };
}

// Shared CDNs/proxies must not cache the 302 — its Location header is per-user
// (e.g. `https://jupyter.../user-A-pod`) and would otherwise be replayable.
function redirectWithNoStore(url: string | URL, status: 302 | 303 | 307 | 308 = 302) {
  const res = NextResponse.redirect(url, status);
  res.headers.set('Cache-Control', 'no-store, private');
  return res;
}

function errorRedirect(request: NextRequest, reason: LaunchErrorReason): NextResponse {
  const url = new URL(ERROR_PATH, request.nextUrl);
  url.search = '';
  url.searchParams.set('reason', reason);
  return redirectWithNoStore(url);
}

function loginRedirect(request: NextRequest): NextResponse {
  const url = new URL(LOG_IN_PATH, request.nextUrl);
  url.search = '';
  url.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);
  return redirectWithNoStore(url);
}

function syncRedirect(request: NextRequest): NextResponse {
  const url = new URL(SYNC_PATH, request.nextUrl);
  url.search = '';
  url.searchParams.set('redirectUrl', request.nextUrl.pathname + request.nextUrl.search);
  return redirectWithNoStore(url);
}

function notebookErrorReason(err: unknown): LaunchErrorReason {
  const code = (err as { cause?: { error_code?: string } } | null | undefined)?.cause?.error_code;
  switch (code) {
    case 'INSUFFICIENT_FUNDS_ERROR':
      return 'insufficient-funds';
    case 'ACCOUNTING_RESERVATION_ERROR':
      return 'accounting-error';
    case 'JUPYTER_ERROR':
      return 'jupyter-error';
    default:
      return 'notebook-service-failed';
  }
}

// Outlook Safe Links, Slack unfurls, and email link scanners issue HEAD requests
// on delivery. Without an explicit handler, Next.js aliases HEAD to GET and would
// spawn a notebook pod on every link preview.
export function HEAD() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'GET' } });
}

export async function GET(request: NextRequest) {
  const secret = serverConfig.GRADING_WEB_LAUNCH_HMAC_SECRET;
  if (!secret) {
    log('warn', '[grading-launch] GRADING_WEB_LAUNCH_HMAC_SECRET is not configured');
    return errorRedirect(request, 'disabled');
  }

  const verified = verifyLaunch(request, secret);
  if (!verified.ok) {
    log('info', '[grading-launch] launch URL rejected', { reason: verified.reason });
    return errorRedirect(request, verified.reason);
  }
  const { token, exercise_id, notebook_id, tenant_id, exp } = verified.params;
  log('info', '[grading-launch] launch URL verified', {
    exercise_id,
    notebook_id,
    tenant_id,
    exp,
  });

  const session = await auth();
  // A `RefreshAccessTokenError` session decrypts as authenticated but can no longer
  // mint fresh access tokens — bounce through log-in to re-auth (matches
  // `log-in/page.tsx:62`).
  if (!session || session.error === 'RefreshAccessTokenError') {
    return loginRedirect(request);
  }

  const { data: workspace, error: workspaceError } = await tryCatch(resolveWorkspace());
  if (workspaceError || !workspace) {
    log('error', '[grading-launch] resolveWorkspace failed', workspaceError);
    return errorRedirect(request, 'notebook-service-failed');
  }

  let virtualLabId: string | undefined;
  let projectId: string | undefined;
  if (workspace.recentWorkspace) {
    virtualLabId = workspace.recentWorkspace.virtual_lab_id;
    projectId = workspace.recentWorkspace.project_id;
  } else if (workspace.virtualLab && workspace.project) {
    virtualLabId = workspace.virtualLab.id;
    projectId = workspace.project.id;
  }

  if (!virtualLabId || !projectId) {
    log('info', '[grading-launch] no resolved workspace; routing through sync wizard');
    return syncRedirect(request);
  }

  log('info', '[grading-launch] workspace resolved', {
    virtualLabId,
    projectId,
    exercise_id,
    notebook_id,
    tenant_id,
  });

  let cloud: string;
  try {
    const lab = await getVirtualLab(virtualLabId);
    cloud = lab?.data?.virtual_lab?.compute_cell ?? DEFAULT_COMPUTE_CELL;
  } catch (err) {
    log('error', '[grading-launch] getVirtualLab failed', err);
    return errorRedirect(request, 'notebook-service-failed');
  }

  try {
    const retval = await startNotebook(notebook_id, '', virtualLabId, projectId, cloud, 0, {
      token,
      exercise_id,
      tenant_id,
    });
    if (!retval?.url) {
      log('error', '[grading-launch] notebook service returned empty url');
      return errorRedirect(request, 'notebook-service-failed');
    }
    return redirectWithNoStore(retval.url);
  } catch (err) {
    log('error', '[grading-launch] startNotebook failed', err);
    return errorRedirect(request, notebookErrorReason(err));
  }
}
