import { redirect, RedirectType } from 'next/navigation';
import { match, P } from 'ts-pattern';

import { resolveWorkspace, WizardSteps } from '@/ui/segments/app-setup/helpers';
import { WorkspaceWizard } from '@/ui/segments/app-setup/bootsync-wizard';
import { ROOT_ROUTE } from '@/config';
import { tryCatch } from '@/api/utils';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({
  searchParams,
}: ServerSideComponentProp<null, { redirectUrl: string | undefined }>) {
  const queryParams = await searchParams;
  const { data: workspace, error } = await tryCatch(resolveWorkspace());

  if (!workspace || error) throw new Error('Workspace resolution failed');

  const { virtualLab, project } = workspace;

  if (virtualLab && project) {
    if (queryParams.redirectUrl) {
      redirect(queryParams.redirectUrl, RedirectType.replace);
    } else {
      // if the user has already visited a virtual lab/project and stored
      // then forward it first
      if (workspace.recentWorkspace) {
        redirect(
          `${ROOT_ROUTE}/${workspace.recentWorkspace.virtual_lab_id}/${workspace.recentWorkspace.project_id}`,
          RedirectType.replace
        );
      }
      // if there is no stored recent workspace, redirect to first fetched workspace
      redirect(`${ROOT_ROUTE}/${virtualLab.id}/${project.id}`, RedirectType.replace);
    }
  }

  const content = match({ virtualLab, project })
    .with({ virtualLab: P.nullish }, () => (
      <WorkspaceWizard step={WizardSteps.Identity} resolvedWorkspace={workspace} />
    ))
    .with({ virtualLab: P.nonNullable, project: P.nullish }, () => (
      <WorkspaceWizard step={WizardSteps.Provision} resolvedWorkspace={workspace} />
    ))
    .otherwise(() => null);

  return content;
}
