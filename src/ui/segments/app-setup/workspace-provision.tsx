'use client';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { delay, find, unionBy } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import {
  WorkspaceBootstrap,
  WorkspaceBootstrapStep,
  WorkspaceBootstrapStepStatus,
} from '@/ui/segments/app-setup/helpers';
import { type StreamItem, streamingFetch } from '@/ui/segments/app-setup/stream-fetch';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type {
  TResolvedWorkspace,
  TWorkspaceBootstrapStep,
  TWorkspaceBootstrapStepStatus,
} from '@/ui/segments/app-setup/helpers';
import type { Props as TWorkspaceCustomization } from '@/ui/segments/app-setup/workspace-customization';
import type { TWorkspaceIdentitySchema } from '@/ui/segments/app-setup/workspace-identity';

type Props = {
  accountPayload: TWorkspaceIdentitySchema | undefined;
  workspaceResolution: TResolvedWorkspace;
  shouldCreateVirtualLab: boolean;
  shouldCreateProject: boolean;
  move: (v: TWorkspaceCustomization) => void;
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
    let cancelled = false;

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
          if (cancelled) return;
          try {
            const chunk = value as StreamItem;
            console.log('# # asyncFetch # chunk:', chunk);
            if (
              chunk.status === WorkspaceBootstrapStepStatus.Completed ||
              chunk.status === WorkspaceBootstrapStepStatus.Passed
            ) {
              setProgress(chunk.progress);
            }
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
        if (!cancelled) {
          log('error', 'Streaming error:', error);
        }
      }
    };

    asyncFetch();

    return () => {
      cancelled = true;
    };
  }, [
    accountPayload,
    move,
    session.data?.accessToken,
    shouldCreateVirtualLab,
    shouldCreateProject,
    workspaceResolution,
  ]);

  return (
    <HydrateWrapper>
      <div className="flex w-full max-w-max flex-col items-center justify-center space-y-2">
        <svg className="h-64 w-64 -rotate-90 transform xl:h-72 xl:w-72" viewBox="0 0 128 128">
          <title>progress</title>
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
              const done =
                cs?.status === WorkspaceBootstrapStepStatus.Completed ||
                cs?.status === WorkspaceBootstrapStepStatus.Passed;
              const failed = cs?.status === WorkspaceBootstrapStepStatus.Error;

              return (
                <div key={step} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'border-neutral-2 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-gray-50 transition-colors duration-300',
                      {
                        'bg-secondary-2': done,
                        'bg-error': failed,
                      }
                    )}
                  >
                    {done && <CheckOutlined className="h-3 w-3 text-white" />}
                    {failed && <CloseOutlined className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        'text-primary-8 text-lg font-light transition-colors duration-300',
                        {
                          'text-secondary-2 font-bold': done,
                          'text-error font-bold': failed,
                        }
                      )}
                    >
                      {message}
                    </span>
                    {failed && cs?.message && (
                      <span className="text-error text-sm">{cs.message}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </HydrateWrapper>
  );
}
