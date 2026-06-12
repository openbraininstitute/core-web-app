import { redirect } from 'next/navigation';

import { resolveGradingLaunch, signedParams } from '../_lib';
import { ProjectPicker } from './project-picker';

import type { ServerSideComponentProp } from '@/types/common';

const ERROR_PATH = '/app/grading/launch/error';
const LAUNCH_PATH = '/app/grading/launch';
const LOG_IN_PATH = '/app/log-in';

type LaunchSearchParams = {
  token?: string;
  exercise_id?: string;
  virtual_lab_id?: string;
  exp?: string;
  sig?: string;
};

export default async function Page({
  searchParams,
}: ServerSideComponentProp<null, LaunchSearchParams>) {
  const launch = await resolveGradingLaunch(await searchParams);

  if (!launch.ok) {
    if (launch.reason === 'needs-login') {
      const signedQuery = new URLSearchParams(signedParams(launch.params)).toString();
      redirect(`${LOG_IN_PATH}?callbackUrl=${encodeURIComponent(`${LAUNCH_PATH}?${signedQuery}`)}`);
    }
    redirect(`${ERROR_PATH}?reason=${launch.reason}`);
  }

  // 0 or 1 accessible projects — hand back to the route handler to auto-launch (1) or report
  // no-project-access (0). The picker is only meaningful for 2+.
  if (launch.projects.length <= 1) {
    const signedQuery = new URLSearchParams(signedParams(launch.params)).toString();
    redirect(`${LAUNCH_PATH}?${signedQuery}`);
  }

  return (
    <ProjectPicker
      projects={launch.projects}
      virtualLabName={launch.virtualLab.name}
      params={launch.params}
    />
  );
}
