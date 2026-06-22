'use server';

import { log } from '@/utils/logger';

import {
  type LaunchGradingInput,
  resolveGradingLaunch,
  type StartResult,
  startGradingNotebook,
} from './launch';

// Re-verifies the signed params, confirms the chosen project is one the caller actually belongs
// to (blocks launching into an arbitrary project_id), then starts the notebook.
export async function launchGradingNotebook(input: LaunchGradingInput): Promise<StartResult> {
  const launch = await resolveGradingLaunch(input);
  if (!launch.ok) {
    // An action can't redirect to log-in — surface the re-auth case as `invalid` so the picker
    // shows an error and the user re-launches from Moodle.
    return { ok: false, reason: launch.reason === 'needs-login' ? 'invalid' : launch.reason };
  }

  const { params, projects, cloud } = launch;
  if (!projects.some((p) => p.id === input.project_id)) {
    log('info', '[grading-launch] action: project_id not among accessible projects', {
      virtual_lab_id: params.virtual_lab_id,
      project_id: input.project_id,
    });
    return { ok: false, reason: 'no-project-access' };
  }

  log('info', '[grading-launch] action: launching', {
    virtual_lab_id: params.virtual_lab_id,
    project_id: input.project_id,
    exercise_id: params.exercise_id,
  });

  return startGradingNotebook({
    exercise_id: params.exercise_id,
    virtual_lab_id: params.virtual_lab_id,
    project_id: input.project_id,
    compute_cell: cloud,
    token: params.token,
  });
}
