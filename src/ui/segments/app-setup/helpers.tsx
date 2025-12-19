import head from 'es-toolkit/compat/head';
import { isMatching, P } from 'ts-pattern';
import { tryCatch } from '@/api/utils';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import type {
  Project,
  RecentWorkspace,
  UserProfileResponse,
  VirtualLab,
} from '@/api/virtual-lab-svc/queries/types';
import { getUserProfile, getUserRecentWorkspace } from '@/api/virtual-lab-svc/queries/user';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';

export type TResolvedWorkspace = {
  project: Project | null;
  virtualLab: VirtualLab | null;
  profile: UserProfileResponse | null;
};

export const resolveWorkspace = async () => {
  let virtualLabId: string | undefined;
  let project: Project | null = null;
  let virtualLab: VirtualLab | null = null;
  let recentWorkspace: RecentWorkspace['recent_workspace']['workspace'] | null = null;

  const [virtualLabResult, profileResult, recentWorkspaceResult] = await Promise.all([
    tryCatch(listVirtualLabs({ include: [LabTypeEnum.MY_LAB] })),
    tryCatch(getUserProfile()),
    tryCatch(getUserRecentWorkspace()),
  ]);
  const profile = profileResult.data?.profile ?? null;
  recentWorkspace = recentWorkspaceResult.data?.data?.recent_workspace.workspace ?? null;
  virtualLab = virtualLabResult?.data?.data?.virtual_lab ?? null;

  if (virtualLab) {
    virtualLabId = virtualLab.id;
    const { data: projectResult } = await tryCatch(
      listProjects({ virtualLabId, page: 1, size: 1 }),
    );
    const oneProject = head(projectResult?.data?.results);
    if (oneProject) {
      project = oneProject;
    }
  }

  return {
    recentWorkspace,
    project,
    virtualLab,
    profile,
  };
};

export const hasNoVirtualLab = isMatching({
  virtualLab: P.nullish,
});

export const hasNoProject = isMatching({
  project: P.nullish,
});

export const isAccountPayload = isMatching({
  name: P.string,
  first_name: P.string,
  last_name: P.string,
  email: P.string,
  entity: P.string,
  email_status: P.string.regex(/^verified$/),
});

export const isCustomizationPayload = isMatching({
  virtualLabId: P.string,
  virtualLabName: P.string,
  projectName: P.string,
  projectId: P.string,
});

export const WizardSteps = {
  Identity: 'identity',
  Provision: 'provision',
  Customization: 'customization',
} as const;

export type TWizardSteps = (typeof WizardSteps)[keyof typeof WizardSteps];

export const WorkspaceBootstrapStep = {
  Identity: 'identity',
  VirtualLab: 'virtual-lab',
  Project: 'project',
} as const;

export const WorkspaceBootstrap = [
  {
    step: WorkspaceBootstrapStep.Identity,
    message: 'Your account ...',
    progress: 33,
  },
  {
    step: WorkspaceBootstrapStep.VirtualLab,
    message: 'Setting up your Virtual Lab ...',
    progress: 66,
  },
  {
    step: WorkspaceBootstrapStep.Project,
    message: 'Initializing your first project ...',
    progress: 100,
  },
] as const;

export type TWorkspaceBootstrapStep = (typeof WorkspaceBootstrap)[number]['step'];

export const WorkspaceBootstrapStepStatus = {
  InProgress: 'in_progress',
  Completed: 'completed',
  Passed: 'passed',
  Error: 'error',
} as const;

export type TWorkspaceBootstrapStepStatus =
  (typeof WorkspaceBootstrapStepStatus)[keyof typeof WorkspaceBootstrapStepStatus];
