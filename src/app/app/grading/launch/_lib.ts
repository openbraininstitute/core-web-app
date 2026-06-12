import { createHmac, timingSafeEqual } from 'node:crypto';

import { getNotebooks } from '@/api/entitycore/queries/notebook';
import { tryCatch } from '@/api/utils';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { auth } from '@/auth';
import { serverConfig } from '@/config/server';
import { startNotebook } from '@/services/notebooks';
import { log } from '@/utils/logger';

import type { IVirtualLabExpandedResponse } from '@/api/virtual-lab-svc/queries/types';
import type { LaunchErrorReason } from './_errors';

export const DEFAULT_COMPUTE_CELL = 'aws';

export interface VerifiedParams {
  token: string;
  exercise_id: string;
  virtual_lab_id: string;
  exp: string;
  sig: string;
}

// Picker action input: the signed params plus the project the user chose.
export interface LaunchGradingInput extends VerifiedParams {
  project_id: string;
}

export type StartResult = { ok: true; url: string } | { ok: false; reason: LaunchErrorReason };

type RawParams = {
  token?: string | null;
  exercise_id?: string | null;
  virtual_lab_id?: string | null;
  exp?: string | null;
  sig?: string | null;
};

type VerificationResult =
  | { ok: true; params: VerifiedParams }
  | { ok: false; reason: 'invalid' | 'expired' };

// Sign the raw `exp` string from the URL (not the re-stringified int) so a value like
// "007" round-trips without breaking the signature.
export function verifyLaunchParams(raw: RawParams, secret: string): VerificationResult {
  const { token, exercise_id, virtual_lab_id, exp, sig } = raw;

  if (!token || !exercise_id || !virtual_lab_id || !exp || !sig) {
    return { ok: false, reason: 'invalid' };
  }
  if (!/^\d+$/.test(exp)) {
    return { ok: false, reason: 'invalid' };
  }
  // The `/^\d+$/` guard guarantees a finite integer here.
  const expN = Number.parseInt(exp, 10);
  if (expN <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  const signingString = `${token}|${exercise_id}|${virtual_lab_id}|${exp}`;
  const expected = createHmac('sha256', secret).update(signingString, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sig, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'invalid' };
  }

  return { ok: true, params: { token, exercise_id, virtual_lab_id, exp, sig } };
}

// The 5 signed params as a plain string record, ready for `URLSearchParams` / redirect building.
// Single source of truth for which params travel through the launch → select → action handoff.
export function signedParams(p: VerifiedParams): Record<string, string> {
  return {
    token: p.token,
    exercise_id: p.exercise_id,
    virtual_lab_id: p.virtual_lab_id,
    exp: p.exp,
    sig: p.sig,
  };
}

export function notebookErrorReason(err: unknown): LaunchErrorReason {
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

export interface AccessibleProject {
  id: string;
  name: string;
}

type AccessibleProjectsResolution =
  | { ok: true; virtualLab: IVirtualLabExpandedResponse; projects: AccessibleProject[] }
  | { ok: false; reason: LaunchErrorReason };

// Every project under this VL the caller belongs to — member/user OR admin role.
// (Replaces the template-project / VL-admin resolution which depended on the unfinished
// virtual-lab `course` API.)
export async function resolveAccessibleProjects(
  virtualLabId: string
): Promise<AccessibleProjectsResolution> {
  const [groupsResult, vlResult, projectsResult] = await Promise.all([
    tryCatch(getUserGroups()),
    tryCatch(getVirtualLab({ id: virtualLabId })),
    tryCatch(listProjects({ virtualLabId, pagination: { page: 1, page_size: 100 } })),
  ]);

  if (groupsResult.error || !groupsResult.data || vlResult.error || !vlResult.data) {
    log('error', '[grading-launch] accessible projects resolve failed', {
      groups_error: groupsResult.error,
      vl_error: vlResult.error,
    });
    return { ok: false, reason: 'notebook-service-failed' };
  }

  // The user-groups payload only carries id-like group names, so map project_id -> the real,
  // human-readable IProject.name. A listProjects failure is non-fatal — fall back to the group name.
  const nameById = new Map<string, string>();
  if (projectsResult.error) {
    log('warn', '[grading-launch] listProjects failed; falling back to group names', {
      error: projectsResult.error,
    });
  } else {
    for (const p of projectsResult.data?.data ?? []) {
      nameById.set(p.id, p.name);
    }
  }

  const byId = new Map<string, AccessibleProject>();
  for (const g of groupsResult.data.data?.groups ?? []) {
    if (g.group_type === 'project' && g.virtual_lab_id === virtualLabId && g.project_id) {
      if (!byId.has(g.project_id)) {
        byId.set(g.project_id, { id: g.project_id, name: nameById.get(g.project_id) ?? g.name });
      }
    }
  }

  return { ok: true, virtualLab: vlResult.data, projects: [...byId.values()] };
}

export type LaunchResolution =
  | {
      ok: true;
      params: VerifiedParams;
      virtualLab: IVirtualLabExpandedResponse;
      projects: AccessibleProject[];
      cloud: string;
    }
  // Authenticated session is missing/expired — caller decides how to re-auth (redirect vs. error).
  | { ok: false; reason: 'needs-login'; params: VerifiedParams }
  | { ok: false; reason: LaunchErrorReason };

// The shared preamble for every entry point into the flow (route handler, picker page, picker
// action): config secret → HMAC verify → auth → accessible-project resolution. Returns a tagged
// result the caller maps onto its own response (HTTP redirect, RSC redirect, or action return).
export async function resolveGradingLaunch(raw: RawParams): Promise<LaunchResolution> {
  const secret = serverConfig.GRADING_WEB_LAUNCH_HMAC_SECRET;
  if (!secret) {
    log('warn', '[grading-launch] GRADING_WEB_LAUNCH_HMAC_SECRET is not configured');
    return { ok: false, reason: 'disabled' };
  }

  const verified = verifyLaunchParams(raw, secret);
  if (!verified.ok) {
    log('info', '[grading-launch] launch params rejected', { reason: verified.reason });
    return { ok: false, reason: verified.reason };
  }

  // A `RefreshAccessTokenError` session decrypts as authenticated but can no longer mint fresh
  // access tokens — treat it as logged-out so the caller bounces through log-in to re-auth.
  const session = await auth();
  if (!session || session.error === 'RefreshAccessTokenError') {
    return { ok: false, reason: 'needs-login', params: verified.params };
  }

  const acc = await resolveAccessibleProjects(verified.params.virtual_lab_id);
  if (!acc.ok) {
    log('info', '[grading-launch] workspace not resolved', {
      reason: acc.reason,
      virtual_lab_id: verified.params.virtual_lab_id,
    });
    return { ok: false, reason: acc.reason };
  }

  return {
    ok: true,
    params: verified.params,
    virtualLab: acc.virtualLab,
    projects: acc.projects,
    cloud: acc.virtualLab.compute_cell ?? DEFAULT_COMPUTE_CELL,
  };
}

// Looks up the analysis notebook for an exercise within a project, then starts it carrying the
// grading payload. Shared by the route's single-project auto-launch and the picker's action.
export async function startGradingNotebook(args: {
  exercise_id: string;
  virtual_lab_id: string;
  project_id: string;
  compute_cell: string;
  token: string;
}): Promise<StartResult> {
  const { exercise_id, virtual_lab_id, project_id, compute_cell, token } = args;

  const { data: notebooksResponse, error: notebooksError } = await tryCatch(
    getNotebooks({
      filters: { exercise_id },
      context: { virtualLabId: virtual_lab_id, projectId: project_id },
    })
  );
  if (notebooksError) {
    log('error', '[grading-launch] getNotebooks failed', notebooksError);
    return { ok: false, reason: 'notebook-service-failed' };
  }
  const notebookId = notebooksResponse?.data?.[0]?.id;
  if (!notebookId) {
    log('info', '[grading-launch] no analysis notebook for exercise_id', {
      exercise_id,
      virtual_lab_id,
      project_id,
    });
    return { ok: false, reason: 'notebook-not-found' };
  }

  try {
    const retval = await startNotebook(
      notebookId,
      '',
      virtual_lab_id,
      project_id,
      compute_cell,
      0,
      {
        token,
        exercise_id,
      }
    );
    if (!retval?.url) {
      log('error', '[grading-launch] notebook service returned empty url');
      return { ok: false, reason: 'notebook-service-failed' };
    }
    return { ok: true, url: retval.url };
  } catch (err) {
    log('error', '[grading-launch] startNotebook failed', err);
    return { ok: false, reason: notebookErrorReason(err) };
  }
}
