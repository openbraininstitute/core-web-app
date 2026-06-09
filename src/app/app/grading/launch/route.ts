import { type NextRequest, NextResponse } from 'next/server';

import { getNotebooks } from '@/api/entitycore/queries/notebook';
import { tryCatch } from '@/api/utils';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { auth } from '@/auth';
import { serverConfig } from '@/config/server';
import { makeRoles } from '@/hooks/use-user-membership';
import { startNotebook } from '@/services/notebooks';
import { log } from '@/utils/logger';

import type { IVirtualLabExpandedResponse } from '@/api/virtual-lab-svc/queries/types';

import { createHmac, timingSafeEqual } from 'node:crypto';

const ERROR_PATH = '/app/grading/launch/error';
const LOG_IN_PATH = '/app/log-in';
const DEFAULT_COMPUTE_CELL = 'aws';

type LaunchErrorReason =
  | 'invalid'
  | 'expired'
  | 'disabled'
  | 'notebook-service-failed'
  | 'insufficient-funds'
  | 'accounting-error'
  | 'jupyter-error'
  | 'no-project-access'
  | 'template-not-initialized'
  | 'notebook-not-found';

interface VerifiedParams {
  token: string;
  exercise_id: string;
  virtual_lab_id: string;
  exp: string;
  sig: string;
}

type VerificationResult =
  | { ok: true; params: VerifiedParams }
  | { ok: false; reason: 'invalid' | 'expired' };

// Sign the raw `exp` string from the URL (not the re-stringified int) so a value like
// "007" round-trips without breaking the signature.
function verifyLaunch(request: NextRequest, secret: string): VerificationResult {
  const q = request.nextUrl.searchParams;
  const token = q.get('token');
  const exercise_id = q.get('exercise_id');
  const virtual_lab_id = q.get('virtual_lab_id');
  const exp = q.get('exp');
  const sig = q.get('sig');

  if (!token || !exercise_id || !virtual_lab_id || !exp || !sig) {
    return { ok: false, reason: 'invalid' };
  }
  if (!/^\d+$/.test(exp)) {
    return { ok: false, reason: 'invalid' };
  }
  const expN = Number.parseInt(exp, 10);
  if (!Number.isFinite(expN) || expN <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  const signingString = `${token}|${exercise_id}|${virtual_lab_id}|${exp}`;
  const expected = createHmac('sha256', secret).update(signingString, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sig, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'invalid' };
  }

  return {
    ok: true,
    params: { token, exercise_id, virtual_lab_id, exp, sig },
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

type WorkspaceResolution =
  | { ok: true; virtualLab: IVirtualLabExpandedResponse; projectId: string }
  | { ok: false; reason: LaunchErrorReason };

// VL admin → template project (instructor flow).
// Otherwise → first project under this VL where user has admin membership (student flow).
async function resolveGradingWorkspace(virtualLabId: string): Promise<WorkspaceResolution> {
  const [groupsResult, vlResult] = await Promise.all([
    tryCatch(getUserGroups()),
    tryCatch(getVirtualLab({ id: virtualLabId })),
  ]);

  if (groupsResult.error || !groupsResult.data || vlResult.error || !vlResult.data) {
    log('error', '[grading-launch] workspace resolve failed', {
      groups_error: groupsResult.error,
      vl_error: vlResult.error,
    });
    return { ok: false, reason: 'notebook-service-failed' };
  }

  const groups = groupsResult.data;
  const virtualLab = vlResult.data;
  const { isVirtualLabAdmin } = makeRoles(groups, virtualLabId, undefined);

  if (isVirtualLabAdmin) {
    const templateProjectId = virtualLab.course?.template_project_id;
    if (!templateProjectId) {
      return { ok: false, reason: 'template-not-initialized' };
    }
    return { ok: true, virtualLab, projectId: templateProjectId };
  }

  const projectGroup = groups.data?.groups?.find(
    (g) => g.group_type === 'project' && g.virtual_lab_id === virtualLabId && g.role === 'admin'
  );
  if (!projectGroup?.project_id) {
    return { ok: false, reason: 'no-project-access' };
  }
  return { ok: true, virtualLab, projectId: projectGroup.project_id };
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
  const { token, exercise_id, virtual_lab_id, exp } = verified.params;
  log('info', '[grading-launch] launch URL verified', {
    exercise_id,
    virtual_lab_id,
    exp,
  });

  const session = await auth();
  // A `RefreshAccessTokenError` session decrypts as authenticated but can no longer
  // mint fresh access tokens — bounce through log-in to re-auth (matches
  // `log-in/page.tsx:62`).
  if (!session || session.error === 'RefreshAccessTokenError') {
    return loginRedirect(request);
  }

  const resolved = await resolveGradingWorkspace(virtual_lab_id);
  if (!resolved.ok) {
    log('info', '[grading-launch] workspace not resolved', {
      reason: resolved.reason,
      virtual_lab_id,
    });
    return errorRedirect(request, resolved.reason);
  }
  const { virtualLab, projectId } = resolved;
  const cloud = virtualLab.compute_cell ?? DEFAULT_COMPUTE_CELL;

  log('info', '[grading-launch] workspace resolved', {
    virtual_lab_id,
    project_id: projectId,
    exercise_id,
  });

  const { data: notebooksResponse, error: notebooksError } = await tryCatch(
    getNotebooks({
      filters: { exercise_id },
      context: { virtualLabId: virtual_lab_id, projectId },
    })
  );
  if (notebooksError) {
    log('error', '[grading-launch] getNotebooks failed', notebooksError);
    return errorRedirect(request, 'notebook-service-failed');
  }
  const notebookId = notebooksResponse?.data?.[0]?.id;
  if (!notebookId) {
    log('info', '[grading-launch] no analysis notebook for exercise_id', {
      exercise_id,
      virtual_lab_id,
      project_id: projectId,
    });
    return errorRedirect(request, 'notebook-not-found');
  }

  try {
    const retval = await startNotebook(notebookId, '', virtual_lab_id, projectId, cloud, 0, {
      token,
      exercise_id,
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
