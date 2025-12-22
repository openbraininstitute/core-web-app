/* eslint-disable prefer-destructuring */

import pick from 'es-toolkit/compat/pick';
import type { NextRequest } from 'next/server';

import { tryCatch } from '@/api/utils';
import { createProject } from '@/api/virtual-lab-svc/queries/project';
import type { Project, UserProfileResponse, VirtualLab } from '@/api/virtual-lab-svc/queries/types';
import { updateUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import type { TEmailStatus } from '@/api/virtual-lab-svc/validation';
import { auth } from '@/auth';
import type {
  TResolvedWorkspace,
  TWorkspaceBootstrapStepStatus,
} from '@/ui/segments/app-setup/helpers';
import {
  WorkspaceBootstrap,
  WorkspaceBootstrapStep,
  WorkspaceBootstrapStepStatus,
} from '@/ui/segments/app-setup/helpers';
import type { TWorkspaceIdentitySchema } from '@/ui/segments/app-setup/workspace-identity';
import { log } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  accountPayload: TWorkspaceIdentitySchema | undefined;
  workspaceResolution: TResolvedWorkspace;
  shouldCreateVirtualLab: boolean;
  shouldCreateProject: boolean;
};

export type StreamItem = {
  step: string;
  status: TWorkspaceBootstrapStepStatus;
  message: string;
  progress: number;
  data?: any;
};

class StreamingResponse extends Response {
  constructor(res: ReadableStream<any>, init?: ResponseInit) {
    super(res as any, {
      ...init,
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...init?.headers,
      },
    });
  }
}

const makeStream = <T extends StreamItem>(generator: AsyncGenerator<T, void, unknown>) => {
  const encoder = new TextEncoder();
  return new ReadableStream<any>({
    async start(controller) {
      for await (const chunk of generator) {
        const chunkData = encoder.encode(`${JSON.stringify(chunk)}\n`);
        controller.enqueue(chunkData);
      }
      controller.close();
    },
  });
};

async function* fetchItems<T>(body: Body) {
  let virtualLab: VirtualLab | null = body.workspaceResolution.virtualLab;
  let profile: UserProfileResponse | null = body.workspaceResolution.profile;
  let project: Project | null = body.workspaceResolution.project;

  for (const sequence of WorkspaceBootstrap) {
    yield {
      step: sequence.step,
      status: WorkspaceBootstrapStepStatus.InProgress,
      message: sequence.message,
      progress: sequence.progress,
    } as T;
    const { shouldCreateProject, shouldCreateVirtualLab, accountPayload, workspaceResolution } =
      body;

    if (sequence.step === WorkspaceBootstrapStep.Identity) {
      let IdentityStatus: TWorkspaceBootstrapStepStatus = WorkspaceBootstrapStepStatus.Passed;
      let message: string = `${sequence.message.replace('...', '')} completed!`;
      if (shouldCreateVirtualLab && accountPayload) {
        const { data, error } = await tryCatch(
          updateUserProfile({
            ...pick(workspaceResolution?.profile, ['first_name', 'last_name', 'address', 'email']),
            ...pick(accountPayload, ['first_name', 'last_name', 'email']),
          })
        );
        if (data) {
          profile = data.profile;
          IdentityStatus = WorkspaceBootstrapStepStatus.Completed;
        } else {
          IdentityStatus = WorkspaceBootstrapStepStatus.Error;
          message = error?.message || 'Something went wrong while updating the profile';
        }
      }
      const chunk = {
        message,
        step: sequence.step,
        status: IdentityStatus,
        progress: sequence.progress,
        data: { profile, virtualLab, project },
      } as T;
      log('debug', WorkspaceBootstrapStep.Identity, chunk);
      yield chunk;
    }
    if (sequence.step === WorkspaceBootstrapStep.VirtualLab) {
      let VirtualLabStatus: TWorkspaceBootstrapStepStatus = WorkspaceBootstrapStepStatus.Passed;
      let message: string = `${sequence.message.replace('...', '')} completed!`;
      if (shouldCreateVirtualLab && accountPayload) {
        const { data, error } = await tryCatch(
          createVirtualLab({
            email_status: accountPayload?.email_status as TEmailStatus,
            entity: accountPayload.entity,
            reference_email: accountPayload.email,
            name: accountPayload.name,
            description: '',
          })
        );
        if (data?.data?.virtual_lab) {
          virtualLab = data.data?.virtual_lab;
          VirtualLabStatus = WorkspaceBootstrapStepStatus.Completed;
        } else {
          VirtualLabStatus = WorkspaceBootstrapStepStatus.Error;
          message = error?.message || 'Something went wrong while creating the virtual lab';
        }
      }
      const chunk = {
        message,
        step: sequence.step,
        status: VirtualLabStatus,
        progress: sequence.progress,
        data: { virtualLab, profile, project },
      } as T;
      log('debug', WorkspaceBootstrapStep.VirtualLab, chunk);
      yield chunk;
    }
    if (sequence.step === WorkspaceBootstrapStep.Project) {
      let ProjectStatus: TWorkspaceBootstrapStepStatus = WorkspaceBootstrapStepStatus.Passed;
      let message: string = `${sequence.message.replace('...', '')} completed!`;
      if (shouldCreateProject && (workspaceResolution || virtualLab)) {
        const ID = workspaceResolution.virtualLab?.id ?? virtualLab?.id;
        const fullName = profile?.last_name || profile?.preferred_username || '';
        const { data, error } = await tryCatch(
          createProject(ID!, {
            name: `${fullName} first project`,
            description: `
              Your initial project has been set up as a ready-to-use workspace to jumpstart your work.
              Personalize its name and description to showcase your goals and make it truly yours.
              `,
            include_members: [],
          })
        );
        if (data?.data?.project) {
          project = data.data?.project;
          ProjectStatus = WorkspaceBootstrapStepStatus.Completed;
        } else {
          ProjectStatus = WorkspaceBootstrapStepStatus.Error;
          message = error?.message || 'Something went wrong while creating the project';
        }
      }
      const chunk = {
        message,
        step: sequence.step,
        status: ProjectStatus,
        progress: sequence.progress,
        data: {
          virtualLab,
          project,
          profile,
        },
      } as T;

      log('debug', WorkspaceBootstrapStep.Project, chunk);
      yield chunk;
    }
    yield {
      step: sequence.step,
      status: WorkspaceBootstrapStepStatus.Completed,
      message: `${sequence.message.replace('...', '')} completed!`,
      progress: sequence.progress,
      data: {
        virtualLab,
        project,
        profile,
      },
    } as T;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }
  const stream = makeStream<StreamItem>(fetchItems(body));
  return new StreamingResponse(stream);
}
