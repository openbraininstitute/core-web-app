import { useAtom } from 'jotai';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import CentralLoadingWheel from '@/components/CentralLoadingWheel';

import { DataType } from '@/constants/explore-section/list-views';
import { resolveExploreDetailsPageUrl, resolveProjectUrl } from '@/utils/url-builder';

import { runValidationAtomFamily } from '@/features/model-analysis/runner/atoms';
import { JobStatus } from '@/services/small-scale-simulator/types';
import type { WorkspaceContext } from '@/types/common';

// Format elapsed time as HH:mm:ss
const formatElapsedTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    remainingSeconds.toString().padStart(2, '0'),
  ].join(':');
};

function ElapsedTime() {
  const [startTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  const elapsed = currentTime - startTime;
  const elapsedStr = formatElapsedTime(elapsed);

  return (
    <div className="text-primary-8">
      <div>Time elapsed:</div>
      <div>{elapsedStr}</div>
    </div>
  );
}

type Props = {
  modelId: string;
  workspace: WorkspaceContext;
};

function ValidationInit({ modelId, workspace }: Props) {
  const meModelPageUrl = `${resolveExploreDetailsPageUrl({
    ctx: workspace,
    dataType: DataType.CircuitMEModel,
    entityId: modelId,
  })}`;

  return (
    <div className="flex flex-col items-center justify-center gap-y-3">
      <h2 className="text-primary-8 items-start gap-x-2 text-4xl font-bold">
        Initiating validation
      </h2>
      <p className="text-primary-8">
        Once the validation process finishes, you can view the results in your project&apos;s
        Activity section.
      </p>

      <p className="text-primary-8">
        You can close the window at any time now. Analysis results will appear under the
        <Link className="ml-2 font-bold text-nowrap underline" href={meModelPageUrl}>
          ME-model details page
        </Link>
        .
      </p>

      <CentralLoadingWheel
        text={
          <>
            <span className="text-md">Validation is launching</span>
          </>
        }
        noResults
        style={{ display: 'table', width: '100%', height: '200px' }}
      />

      <div className="mt-10 flex flex-row gap-3">
        <a
          className="border-primary-8 text-primary-8 border px-4 py-2"
          href={`${resolveProjectUrl(workspace)}/activity`}
        >
          View activity
        </a>
      </div>
    </div>
  );
}

function ValidationRunning({ modelId, workspace }: Props) {
  const meModelPageUrl = resolveExploreDetailsPageUrl({
    ctx: workspace,
    dataType: DataType.CircuitMEModel,
    entityId: modelId,
  });

  return (
    <div className="flex flex-col items-center justify-center gap-y-3">
      <h2 className="text-primary-8 items-start gap-x-2 text-4xl font-bold">Running validation</h2>
      <p className="text-primary-8">
        Once the validation process finishes, you can view the results in your project&apos;s
        Activity section.
      </p>

      <p className="text-primary-8">
        You can close the window at any time now. Analysis results will appear under the
        <Link className="ml-2 font-bold text-nowrap underline" href={meModelPageUrl}>
          ME-model details page
        </Link>
        .
      </p>

      <CentralLoadingWheel
        text={<ElapsedTime />}
        style={{ display: 'table', width: '100%', height: '200px' }}
      />

      <div className="mt-10 flex flex-row gap-3">
        <a
          className="border-primary-8 text-primary-8 border px-4 py-2"
          href={`${resolveProjectUrl(workspace)}/activity`}
        >
          View activity
        </a>
      </div>
    </div>
  );
}

function ValidationSuccess({ modelId, workspace }: Props) {
  const router = useRouter();
  const meModelPageUrl = `${resolveExploreDetailsPageUrl({
    ctx: workspace,
    dataType: DataType.CircuitMEModel,
    entityId: modelId,
  })}?tab=analysis`;

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(meModelPageUrl);
    }, 3000);

    return () => clearTimeout(timer);
  }, [meModelPageUrl, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-y-3">
      <h2 className="text-primary-8 items-start gap-x-2 text-4xl font-bold">
        Validation finished successfully
      </h2>
      <p className="text-primary-8">You will be redirected to ME-model page shortly</p>

      <Link className="border-primary-8 text-primary-8 border px-4 py-2" href={meModelPageUrl}>
        View ME-model details
      </Link>
    </div>
  );
}

function ValidationError({ modelId, workspace }: Props) {
  const meModelPageUrl = resolveExploreDetailsPageUrl({
    ctx: workspace,
    dataType: DataType.CircuitMEModel,
    entityId: modelId,
  });

  return (
    <div className="flex flex-col items-center justify-center gap-y-3">
      <h2 className="text-warning items-start gap-x-2 text-4xl font-bold">Validation error</h2>
      <p className="text-primary-8">An unexpected error occurred during the validation process.</p>

      <Link className="border-primary-8 text-primary-8 border px-4 py-2" href={meModelPageUrl}>
        ME-model details
      </Link>
    </div>
  );
}

export default function ModelAnalysisContainer({
  ctx,
  modelId,
}: {
  ctx: WorkspaceContext;
  modelId: string;
}) {
  const router = useRouter();

  const runValidationAtom = runValidationAtomFamily({ modelId, ctx });
  const [validationJobStatus, runValidation] = useAtom(runValidationAtom);

  useEffect(() => {
    runValidation();
  }, [modelId, router, ctx, runValidation]);

  if ([JobStatus.CREATED, JobStatus.PENDING].includes(validationJobStatus)) {
    return <ValidationInit workspace={ctx} modelId={modelId as string} />;
  }

  if (validationJobStatus === JobStatus.RUNNING) {
    return <ValidationRunning workspace={ctx} modelId={modelId as string} />;
  }

  if (validationJobStatus === JobStatus.DONE) {
    return <ValidationSuccess workspace={ctx} modelId={modelId as string} />;
  }

  return <ValidationError workspace={ctx} modelId={modelId as string} />;
}
