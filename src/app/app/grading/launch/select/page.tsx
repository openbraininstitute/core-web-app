import { redirect } from 'next/navigation';

import { LAUNCH_PATHS, type RawParams, resolveGradingLaunch, signedParams } from '../_lib';
import { ProjectPicker } from './project-picker';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({ searchParams }: ServerSideComponentProp<null, RawParams>) {
  const launch = await resolveGradingLaunch(await searchParams);

  if (!launch.ok) {
    if (launch.reason === 'needs-login') {
      const signedQuery = new URLSearchParams(signedParams(launch.params)).toString();
      redirect(
        `${LAUNCH_PATHS.logIn}?callbackUrl=${encodeURIComponent(`${LAUNCH_PATHS.launch}?${signedQuery}`)}`
      );
    }
    redirect(`${LAUNCH_PATHS.error}?reason=${launch.reason}`);
  }

  // 0 or 1 accessible projects — hand back to the route handler to auto-launch (1) or report
  // no-project-access (0). The picker is only meaningful for 2+.
  if (launch.projects.length <= 1) {
    const signedQuery = new URLSearchParams(signedParams(launch.params)).toString();
    redirect(`${LAUNCH_PATHS.launch}?${signedQuery}`);
  }

  return (
    <ProjectPicker
      projects={launch.projects}
      virtualLabName={launch.virtualLab.name}
      params={launch.params}
    />
  );
}
