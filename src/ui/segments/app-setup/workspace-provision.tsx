'use client';

import {
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  CloseOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { delay, find, unionBy } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { checkVirtualLabExists } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
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

type CompletedStep = {
  status: TWorkspaceBootstrapStepStatus;
  step: TWorkspaceBootstrapStep;
  message: string;
  errorCode?: string;
};

type RetryState = {
  step: TWorkspaceBootstrapStep;
  errorCode: string;
} | null;

function useDebouncedValue(value: string, delayMs = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function RetryRenameInput({
  onConfirm,
  originalName,
}: {
  onConfirm: (newName: string) => void;
  originalName: string;
}) {
  const [value, setValue] = useState('');
  const debouncedName = useDebouncedValue(value.trim());
  const enabled = debouncedName.length >= 2;

  const { data: exists, isLoading } = useQuery({
    queryKey: ['check-virtual-lab-name', debouncedName],
    queryFn: () => checkVirtualLabExists({ name: debouncedName }),
    enabled,
  });

  const available = enabled && exists === false;
  const taken = enabled && exists === true;
  const canSubmit = available && !isLoading;

  return (
    <div className="mt-3 w-full flex flex-col gap-2">
      <div className="flex w-full items-center gap-2">
        <div className="relative w-full">
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={cn(
              'border-neutral-1 h-auto rounded-full bg-white shadow-sm',
              'placeholder:text-sm placeholder:font-light disabled:font-black disabled:opacity-70',
              'focus-visible:text-primary-8! font-black! focus-visible:font-bold! text-primary-8!',
              'h-10 gap-1.5 py-3 px-4 rounded-full focus-within:border-none text-lg!',
              taken && 'border-error',
              available && 'border-secondary-2'
            )}
            aria-label="New virtual lab name"
          />
          {!value && (
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-light text-neutral-400 line-through">
              {originalName}
            </span>
          )}
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            {isLoading && <LoadingOutlined className="text-primary-8 size-4 animate-spin" />}
            {!isLoading && available && <CheckCircleFilled className="text-secondary-2 size-4" />}
            {!isLoading && taken && <CloseCircleFilled className="text-error size-4" />}
          </div>
        </div>
        <Button
          type="button"
          rounded
          size="md"
          variant="outline"
          disabled={!canSubmit}
          onClick={() => onConfirm(value.trim())}
          className={cn('transition-colors cursor-pointer', {
            'bg-neutral-100 text-neutral-400 pointer-events-none': !canSubmit,
          })}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}

function StepIcon({
  done,
  failed,
  retryable,
  inProgress,
}: {
  done: boolean;
  failed: boolean;
  retryable: boolean;
  inProgress: boolean;
}) {
  return (
    <div
      className={cn(
        'border-neutral-2 mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border bg-neutral-50 transition-all duration-300',
        {
          'bg-secondary-2 border-secondary-2': done,
          'bg-error border-error': failed,
          'border-amber-500 bg-amber-500': retryable,
          'border-primary-8 bg-primary-8': inProgress,
        }
      )}
    >
      {done && <CheckOutlined className="size-3 text-white" />}
      {failed && <CloseOutlined className="size-3 text-white" />}
      {retryable && <CloseOutlined className="size-3 text-white" />}
      {inProgress && <LoadingOutlined className="size-3 animate-spin text-white" />}
    </div>
  );
}

function StepLabel({
  message,
  done,
  failed,
  retryable,
}: {
  message: string;
  done: boolean;
  failed: boolean;
  retryable: boolean;
}) {
  return (
    <span
      className={cn('text-primary-8 text-lg font-light transition-colors duration-300', {
        'text-secondary-2 font-bold': done,
        'text-error font-bold': failed,
        'text-amber-600 font-bold': retryable,
      })}
    >
      {message}
    </span>
  );
}

function processChunk(
  chunk: StreamItem,
  setProgress: (p: number) => void,
  setCompletedSteps: React.Dispatch<React.SetStateAction<CompletedStep[]>>,
  setRetryState: React.Dispatch<React.SetStateAction<RetryState>>,
  move: (v: TWorkspaceCustomization) => void
) {
  if (
    chunk.status === WorkspaceBootstrapStepStatus.Completed ||
    chunk.status === WorkspaceBootstrapStepStatus.Passed
  ) {
    setProgress(chunk.progress);
  }

  setCompletedSteps((prev) => {
    const existingStep = prev.find((p) => p.step === chunk.step);
    if (!existingStep || existingStep.status !== chunk.status) {
      return unionBy(
        [
          {
            status: chunk.status,
            message: chunk.message,
            step: chunk.step as TWorkspaceBootstrapStep,
            errorCode: chunk.errorCode,
          },
        ],
        prev ?? [],
        'step'
      );
    }
    return prev;
  });

  // Only set retry state for ENTITY_ALREADY_EXISTS — the only retryable scenario
  if (
    chunk.status === WorkspaceBootstrapStepStatus.Retryable &&
    chunk.errorCode === 'ENTITY_ALREADY_EXISTS'
  ) {
    setRetryState({
      step: chunk.step as TWorkspaceBootstrapStep,
      errorCode: chunk.errorCode,
    });
  }

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
}

export function WorkspaceProvision({
  accountPayload,
  workspaceResolution,
  shouldCreateVirtualLab,
  shouldCreateProject,
  move,
}: Props) {
  const [{ progress, completedSteps, retryState }, setBootstrapState] = useState<{
    progress: number;
    completedSteps: CompletedStep[];
    retryState: RetryState;
  }>({
    progress: 0,
    completedSteps: [],
    retryState: null,
  });
  const [isResuming, setIsResuming] = useState(false);
  const session = useSession();

  const setProgress = useCallback((progress: number) => {
    setBootstrapState((prev) => ({ ...prev, progress }));
  }, []);

  const setCompletedSteps = useCallback((update: React.SetStateAction<CompletedStep[]>) => {
    setBootstrapState((prev) => ({
      ...prev,
      completedSteps: typeof update === 'function' ? update(prev.completedSteps) : update,
    }));
  }, []);

  const setRetryState = useCallback((update: React.SetStateAction<RetryState>) => {
    setBootstrapState((prev) => ({
      ...prev,
      retryState: typeof update === 'function' ? update(prev.retryState) : update,
    }));
  }, []);

  const streamBootstrap = useCallback(
    async (
      cancelled: { current: boolean },
      payload: TWorkspaceIdentitySchema | undefined,
      resumeFromStep?: string,
      signal?: AbortSignal
    ) => {
      try {
        const it = streamingFetch('/api/sync/boot', {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            accountPayload: payload,
            workspaceResolution,
            shouldCreateVirtualLab,
            shouldCreateProject,
            ...(resumeFromStep && { resumeFromStep }),
          }),
          signal,
        });

        for await (const value of it) {
          if (cancelled.current) return;
          processChunk(value as StreamItem, setProgress, setCompletedSteps, setRetryState, move);
        }
      } catch (error) {
        if (!cancelled.current) {
          log('error', 'Streaming error:', error);
        }
      }
    },
    [
      session.data?.accessToken,
      workspaceResolution,
      shouldCreateVirtualLab,
      shouldCreateProject,
      move,
      setProgress,
      setCompletedSteps,
      setRetryState,
    ]
  );

  const streamRef = useRef(streamBootstrap);
  streamRef.current = streamBootstrap;

  const payloadRef = useRef(accountPayload);
  payloadRef.current = accountPayload;

  // Auto-start the full bootstrap stream on mount.
  // AbortController ensures only one in-flight request survives across
  // React Strict Mode's mount → unmount → remount cycle.
  useEffect(() => {
    const abortController = new AbortController();
    setBootstrapState({ progress: 0, completedSteps: [], retryState: null });
    streamRef.current({ current: false }, payloadRef.current, undefined, abortController.signal);
    return () => {
      abortController.abort('unmounted');
    };
  }, []);

  const handleRetryWithNewName = useCallback(
    async (newName: string) => {
      if (!accountPayload || !retryState) return;

      const resumeStep = retryState.step;
      const updatedPayload = { ...accountPayload, name: newName };

      setRetryState(null);
      setIsResuming(true);
      setCompletedSteps((prev) =>
        prev.map((s) =>
          s.step === resumeStep
            ? {
                ...s,
                status: WorkspaceBootstrapStepStatus.InProgress,
                message: '',
                errorCode: undefined,
              }
            : s
        )
      );

      await new Promise((r) => setTimeout(r, 300));

      const cancelled = { current: false };
      await streamBootstrap(cancelled, updatedPayload, resumeStep);
      setIsResuming(false);
    },
    [accountPayload, retryState, streamBootstrap, setCompletedSteps, setRetryState]
  );

  return (
    <HydrateWrapper>
      <div className="flex w-full max-w-max flex-col items-center justify-center gap-y-2">
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
              const retryable = cs?.status === WorkspaceBootstrapStepStatus.Retryable;
              const inProgress = cs?.status === WorkspaceBootstrapStepStatus.InProgress;
              const isRetryTarget =
                retryState?.step === step && retryState?.errorCode === 'ENTITY_ALREADY_EXISTS';

              return (
                <div key={step} className="flex items-start gap-3">
                  <StepIcon
                    done={done}
                    failed={failed}
                    retryable={retryable}
                    inProgress={inProgress}
                  />
                  <div className="flex flex-col">
                    <StepLabel
                      message={message}
                      done={done}
                      failed={failed}
                      retryable={retryable}
                    />
                    {failed && cs?.message && (
                      <span className="text-error text-sm">{cs.message}</span>
                    )}
                    {isRetryTarget && (
                      <span className="text-amber-600 text-sm max-w-80">
                        The name <strong>&quot;{accountPayload?.name}&quot;</strong> is already
                        taken. Please choose a different name for your Virtual Lab.
                      </span>
                    )}
                    {isRetryTarget && !isResuming && (
                      <RetryRenameInput
                        onConfirm={handleRetryWithNewName}
                        originalName={accountPayload?.name ?? ''}
                      />
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
