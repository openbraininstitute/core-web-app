import { tryCatch } from '@/api/utils';
import { createProject } from '@/api/virtual-lab-svc/queries/project';
import { updateUserOnboardingProfile } from '@/api/virtual-lab-svc/queries/user';
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
  resumeFromStep?: string;
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
  errorCode?: string;
};

type StepResult = {
  status: TWorkspaceBootstrapStepStatus;
  message: string;
  errorCode?: string;
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
  const { shouldCreateVirtualLab, accountPayload } = body;

  if (!shouldCreateVirtualLab || !accountPayload) {
    return {
      status: WorkspaceBootstrapStepStatus.Passed,
      message: 'Your account  completed!',
    };
  }

  const { data, error } = await tryCatch(
    updateUserOnboardingProfile({
      first_name: accountPayload.first_name,
      last_name: accountPayload.last_name,
<<<<<<< HEAD
      country: accountPayload.country,
      email: accountPayload.email,
||||||| parent of 7532d7c84 (update profile validation flow and virtual lab user update typing)
    updateUserProfile({
      ...pick(workspaceResolution?.profile, ['first_name', 'last_name', 'address']),
      ...pick(accountPayload, ['first_name', 'last_name', 'email']),
=======
      country: workspaceResolution.profile?.address.country,
>>>>>>> 7532d7c84 (update profile validation flow and virtual lab user update typing)
    })
  );

  if (data) {
    state.profile = data.data?.profile;
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

    if (data?.data?.virtual_lab) {
      state.virtualLab = data.data.virtual_lab;
      return {
        status: WorkspaceBootstrapStepStatus.Completed,
        message: 'Setting up your Virtual Lab  completed!',
      };
    }

    const cause = (error as Error & { cause?: Record<string, string> })?.cause;
    if (cause?.error_code === 'ENTITY_ALREADY_EXISTS') {
      return {
        status: WorkspaceBootstrapStepStatus.Retryable,
        message: 'The name is already taken. Please choose a different name for your Virtual Lab.',
        errorCode: 'ENTITY_ALREADY_EXISTS',
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

  const { resumeFromStep } = body;
  let shouldProcess = !resumeFromStep;

  for (const sequence of WorkspaceBootstrap) {
    // when resuming, skip steps until we reach the resume point
    if (!shouldProcess) {
      if (sequence.step === resumeFromStep) {
        shouldProcess = true;
      } else {
        // emit the skipped step as passed so the client sees it as done
        yield {
          step: sequence.step,
          status: WorkspaceBootstrapStepStatus.Passed,
          message: `${sequence.message.replace('...', '')} completed!`,
          progress: sequence.progress,
          data: { ...state },
        };
        continue;
      }
    }

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
      ...(result.errorCode && { errorCode: result.errorCode }),
    };

    log('debug', sequence.step, chunk);
    yield chunk;

    if (
      result.status === WorkspaceBootstrapStepStatus.Error ||
      result.status === WorkspaceBootstrapStepStatus.Retryable
    )
      return;
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
