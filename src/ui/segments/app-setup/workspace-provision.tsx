'use client';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { ComponentProps, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import unionBy from 'es-toolkit/compat/unionBy';
import delay from 'es-toolkit/compat/delay';
import find from 'es-toolkit/compat/find';

import { streamingFetch, type StreamItem } from '@/ui/segments/app-setup/stream-fetch';
import { WorkspaceCustomization } from '@/ui/segments/app-setup/workspace-customization';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';
import {
  WorkspaceBootstrap,
  WorkspaceBootstrapStep,
  WorkspaceBootstrapStepStatus,
} from '@/ui/segments/app-setup/helpers';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

import type { TWorkspaceIdentitySchema } from '@/ui/segments/app-setup/workspace-identity';
import type { Prettify } from '@/utils/type';
import type {
  TResolvedWorkspace,
  TWorkspaceBootstrapStep,
  TWorkspaceBootstrapStepStatus,
} from '@/ui/segments/app-setup/helpers';

type FinalStepProps = Prettify<ComponentProps<typeof WorkspaceCustomization>>;

type Props = {
  accountPayload: TWorkspaceIdentitySchema | undefined;
  workspaceResolution: TResolvedWorkspace;
  shouldCreateVirtualLab: boolean;
  shouldCreateProject: boolean;
  move: (v: FinalStepProps) => void;
};

export function WorkspaceProvision({
  accountPayload,
  workspaceResolution,
  shouldCreateVirtualLab,
  shouldCreateProject,
  move,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<
    Array<{
      status: TWorkspaceBootstrapStepStatus;
      step: TWorkspaceBootstrapStep;
      message: string;
    }>
  >([]);
  const session = useSession();

  useEffect(() => {
    const asyncFetch = async () => {
      setProgress(0);
      setCompletedSteps([]);

      try {
        const it = streamingFetch('/api/sync/boot', {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            accountPayload,
            workspaceResolution,
            shouldCreateVirtualLab,
            shouldCreateProject,
          }),
        });

        for await (const value of it) {
          try {
            const chunk = value as StreamItem;
            setProgress(chunk.progress);
            setCompletedSteps((prev) => {
              const existingStep = prev.find((p) => p.step === chunk.step);
              // Only update if status changed or if it's the first time we see this step
              if (!existingStep || existingStep.status !== chunk.status) {
                return unionBy(
                  [
                    {
                      status: chunk.status,
                      message: chunk.message,
                      step: chunk.step as TWorkspaceBootstrapStep,
                    },
                  ],
                  prev ?? [],
                  'step'
                );
              }
              return prev;
            });
            if (
              chunk.step === WorkspaceBootstrapStep.Project &&
              chunk.status === WorkspaceBootstrapStepStatus.Completed &&
              chunk.data?.virtualLab &&
              chunk.data?.project
            ) {
              delay(
                () =>
                  move({
                    virtualLabId: chunk.data.virtualLab.id,
                    virtualLabName: chunk.data.virtualLab.name,
                    projectId: chunk.data.project.id,
                    projectName: chunk.data.project.name,
                  }),
                2000
              );
            }
          } catch (e: any) {
            log('error', e.message);
          }
        }
      } catch (error) {
        log('error', 'Streaming error:', error);
      }
    };

    asyncFetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HydrateWrapper>
      <div className="flex w-full max-w-max flex-col items-center justify-center space-y-2">
        <svg className="h-64 w-64 -rotate-90 transform xl:h-72 xl:w-72" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="4" fill="none" />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="#003a8c"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
            className="transition-all duration-300 ease-out"
          />
        </svg>

        <div className="flex flex-col items-center justify-start">
          <p className="text-primary-8 mb-2 text-lg font-light">We are creating for you</p>
          <div className="space-y-3">
            {WorkspaceBootstrap.map(({ step, message }) => {
              const cs = find(completedSteps, { step });
              const done = cs?.status === WorkspaceBootstrapStepStatus.Completed;
              const failed = cs?.status === WorkspaceBootstrapStepStatus.Error;
              const text = failed ? cs?.message : message;

              return (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'border-neutral-2 flex h-5 w-5 items-center justify-center rounded-full border bg-gray-50 transition-colors duration-300',
                      {
                        'bg-secondary-2': done,
                        'bg-error': failed,
                      }
                    )}
                  >
                    {done && <CheckOutlined className="h-3 w-3 text-white" />}
                    {failed && <CloseOutlined className="h-3 w-3 text-white" />}
                  </div>
                  <span
                    className={cn(
                      'text-primary-8 text-lg font-light transition-colors duration-300',
                      {
                        'text-secondary-2 font-bold': done,
                        'text-error font-bold': failed,
                      }
                    )}
                  >
                    {text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </HydrateWrapper>
  );
}
