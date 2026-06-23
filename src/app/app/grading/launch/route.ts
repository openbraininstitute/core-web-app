import { type NextRequest, NextResponse } from 'next/server';

import {
  LAUNCH_PATHS,
  resolveGradingLaunch,
  signedParams,
  startGradingNotebook,
} from '@/features/grading/launch';
import { log } from '@/utils/logger';

import type { LaunchErrorReason } from '@/features/grading/errors';

// Build a same-origin relative redirect target (path + query). Relative on purpose: under Amplify
// Lambda `request.url` / `request.nextUrl` resolve to the function's internal binding
// (`http://localhost:3000`), not the public host — an absolute URL built from them would send the
// browser to localhost. A relative `Location` is resolved by the browser against the public
// request URL, so it stays on whatever host the user actually hit.
function buildPath(path: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `${path}?${qs}` : path;
}

// Shared CDNs/proxies must not cache the 302 — its Location header is per-user
// (e.g. `https://jupyter.../user-A-pod`) and would otherwise be replayable. The Location is set
// directly rather than via `NextResponse.redirect`, which rejects relative URLs.
function redirectWithNoStore(location: string, status: 302 | 303 | 307 | 308 = 302) {
  return new NextResponse(null, {
    status,
    headers: { Location: location, 'Cache-Control': 'no-store, private' },
  });
}

function errorRedirect(reason: LaunchErrorReason): NextResponse {
  return redirectWithNoStore(buildPath(LAUNCH_PATHS.error, { reason }));
}

function loginRedirect(request: NextRequest): NextResponse {
  return redirectWithNoStore(
    buildPath(LAUNCH_PATHS.logIn, {
      callbackUrl: request.nextUrl.pathname + request.nextUrl.search,
    })
  );
}

// Outlook Safe Links, Slack unfurls, and email link scanners issue HEAD requests
// on delivery. Without an explicit handler, Next.js aliases HEAD to GET and would
// spawn a notebook pod on every link preview.
export function HEAD() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'GET' } });
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const launch = await resolveGradingLaunch({
    token: q.get('token'),
    exercise_id: q.get('exercise_id'),
    virtual_lab_id: q.get('virtual_lab_id'),
    exp: q.get('exp'),
    sig: q.get('sig'),
  });
  if (!launch.ok) {
    return launch.reason === 'needs-login' ? loginRedirect(request) : errorRedirect(launch.reason);
  }

  const { params, projects, cloud } = launch;
  log('info', '[grading-launch] launch URL verified', {
    exercise_id: params.exercise_id,
    virtual_lab_id: params.virtual_lab_id,
    exp: params.exp,
  });

  if (projects.length === 0) {
    return errorRedirect('no-project-access');
  }

  // Multiple accessible projects — let the user choose. No auto-redirect; hand off to the picker
  // page carrying the signed params so it can re-verify and launch via a server action.
  if (projects.length > 1) {
    return redirectWithNoStore(buildPath(LAUNCH_PATHS.select, signedParams(params)));
  }

  // Exactly one accessible project — launch straight into it.
  const projectId = projects[0].id;
  log('info', '[grading-launch] workspace resolved', {
    virtual_lab_id: params.virtual_lab_id,
    project_id: projectId,
    exercise_id: params.exercise_id,
  });

  const result = await startGradingNotebook({
    exercise_id: params.exercise_id,
    virtual_lab_id: params.virtual_lab_id,
    project_id: projectId,
    compute_cell: cloud,
    token: params.token,
  });
  return result.ok ? redirectWithNoStore(result.url) : errorRedirect(result.reason);
}
