import { pick } from 'es-toolkit/compat';

import { tryCatch } from '@/api/utils';
import { createProject } from '@/api/virtual-lab-svc/queries/project';
import { updateUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { auth } from '@/auth';
import {
  WorkspaceBootstrap,
  WorkspaceBootstrapStep,
  WorkspaceBootstrapStepStatus,
} from '@/ui/segments/app-setup/helpers';
import { log } from '@/utils/logger';

import type { NextRequest } from 'next/server';
import type {
  Project,
  TVirtualLab,
  UserProfileResponse,
} from '@/api/virtual-lab-svc/queries/types';
import type {
  TResolvedWorkspace,
  TWorkspaceBootstrapStepStatus,
} from '@/ui/segments/app-setup/helpers';
import type { TWorkspaceIdentitySchema } from '@/ui/segments/app-setup/workspace-identity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BootstrapBody = {
  accountPayload: TWorkspaceIdentitySchema | undefined;
  workspaceResolution: TResolvedWorkspace;
  shouldCreateVirtualLab: boolean;
  shouldCreateProject: boolean;
};

type BootstrapState = {
  virtualLab: TVirtualLab | null;
  profile: UserProfileResponse | null;
  project: Project | null;
};

export type StreamChunk = {
  step: string;
  status: TWorkspaceBootstrapStepStatus;
  message: string;
  progress: number;
  data?: BootstrapState;
};

type StepResult = {
  status: TWorkspaceBootstrapStepStatus;
  message: string;
};

function createStreamingResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function streamFromGenerator(generator: AsyncGenerator<StreamChunk, void, unknown>) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of generator) {
        controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
      }
      controller.close();
    },
  });
}

async function processIdentity(body: BootstrapBody, state: BootstrapState): Promise<StepResult> {
  const { shouldCreateVirtualLab, accountPayload, workspaceResolution } = body;

  if (!shouldCreateVirtualLab || !accountPayload) {
    return {
      status: WorkspaceBootstrapStepStatus.Passed,
      message: 'Your account  completed!',
    };
  }

  const { data, error } = await tryCatch(
    updateUserProfile({
      ...pick(workspaceResolution?.profile, ['first_name', 'last_name', 'address']),
      ...pick(accountPayload, ['first_name', 'last_name', 'email']),
    })
  );

  if (data) {
    state.profile = data.profile;
    return {
      status: WorkspaceBootstrapStepStatus.Completed,
      message: 'Your account  completed!',
    };
  }

  return {
    status: WorkspaceBootstrapStepStatus.Error,
    message: error?.message || 'Something went wrong while updating the profile',
  };
}

async function processVirtualLab(body: BootstrapBody, state: BootstrapState): Promise<StepResult> {
  const { shouldCreateVirtualLab, shouldCreateProject, accountPayload, workspaceResolution } = body;

  if (shouldCreateVirtualLab && accountPayload) {
    const { data, error } = await tryCatch(
      createVirtualLab({
        entity: accountPayload.entity,
        name: accountPayload.name,
        description: '',
      })
    );
    console.log('–– – processVirtualLab – error––', error?.cause);

    if (data?.data?.virtual_lab) {
      state.virtualLab = data.data.virtual_lab;
      return {
        status: WorkspaceBootstrapStepStatus.Completed,
        message: 'Setting up your Virtual Lab  completed!',
      };
    }

    return {
      status: WorkspaceBootstrapStepStatus.Error,
      message: error?.message || 'Something went wrong while creating the virtual lab',
    };
  }

  // No creation attempted — verify a lab exists if we need one for the project step
  const hasLab = state.virtualLab?.id || workspaceResolution.virtualLab?.id;
  if (shouldCreateProject && !hasLab) {
    return {
      status: WorkspaceBootstrapStepStatus.Error,
      message: 'No virtual lab available to proceed',
    };
  }

  return {
    status: WorkspaceBootstrapStepStatus.Passed,
    message: 'Setting up your Virtual Lab  completed!',
  };
}

async function processProject(body: BootstrapBody, state: BootstrapState): Promise<StepResult> {
  const { shouldCreateProject, workspaceResolution } = body;

  if (!shouldCreateProject) {
    return {
      status: WorkspaceBootstrapStepStatus.Passed,
      message: 'Initializing your first project  completed!',
    };
  }

  const virtualLabId = workspaceResolution.virtualLab?.id ?? state.virtualLab?.id;
  if (!virtualLabId) {
    return {
      status: WorkspaceBootstrapStepStatus.Error,
      message: 'No virtual lab available to create the project',
    };
  }

  const displayName = state.profile?.last_name || state.profile?.preferred_username || '';
  const { data, error } = await tryCatch(
    createProject(virtualLabId, {
      name: `${displayName} first project`,
      description:
        'Your initial project has been set up as a ready-to-use workspace to jumpstart your work. Personalize its name and description to showcase your goals and make it truly yours.',
      include_members: [],
    })
  );

  if (data?.data?.project) {
    state.project = data.data.project;
    return {
      status: WorkspaceBootstrapStepStatus.Completed,
      message: 'Initializing your first project  completed!',
    };
  }

  return {
    status: WorkspaceBootstrapStepStatus.Error,
    message: error?.message || 'Something went wrong while creating the project',
  };
}

const stepProcessors: Record<
  string,
  (body: BootstrapBody, state: BootstrapState) => Promise<StepResult>
> = {
  [WorkspaceBootstrapStep.Identity]: processIdentity,
  [WorkspaceBootstrapStep.VirtualLab]: processVirtualLab,
  [WorkspaceBootstrapStep.Project]: processProject,
};

async function* bootstrapWorkspace(
  body: BootstrapBody
): AsyncGenerator<StreamChunk, void, unknown> {
  const state: BootstrapState = {
    virtualLab: body.workspaceResolution.virtualLab,
    profile: body.workspaceResolution.profile,
    project: body.workspaceResolution.project,
  };

  for (const sequence of WorkspaceBootstrap) {
    const processor = stepProcessors[sequence.step];
    if (!processor) continue;

    yield {
      step: sequence.step,
      status: WorkspaceBootstrapStepStatus.InProgress,
      message: sequence.message,
      progress: sequence.progress,
    };

    const result = await processor(body, state);

    const chunk: StreamChunk = {
      step: sequence.step,
      status: result.status,
      message: result.message,
      progress: sequence.progress,
      data: { ...state },
    };

    log('debug', sequence.step, chunk);
    yield chunk;

    if (result.status === WorkspaceBootstrapStepStatus.Error) return;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as BootstrapBody;
  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const stream = streamFromGenerator(bootstrapWorkspace(body));
  return createStreamingResponse(stream);
}
