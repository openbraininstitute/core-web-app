import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import BluePyEModelCls from '@/services/virtual-lab/build/me-model/bluepy-emodel';
import { meModelSelfUrlAtom, selectedMEModelIdAtom } from '@/state/virtual-lab/build/me-model';
import CentralLoadingWheel from '@/components/CentralLoadingWheel';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { to64 } from '@/util/common';

function getMEModelPageUrl(meModelId: string, virtualLabInfo: VirtualLabInfo) {
  const { virtualLabId, projectId } = virtualLabInfo;

  const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);
  const idSegment = to64(`${virtualLabId}/${projectId}!/!${meModelId}`);

  return `${vlProjectUrl}/explore/interactive/model/me-model/${idSegment}`;
}

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
    <>
      <div className="text-primary-8">
        <div>Time elapsed:</div>
        <div>{elapsedStr}</div>
      </div>
    </>
  );
}

type AnalisysState = 'initializing' | 'running' | 'error' | 'done';

function ValidationInit({
  meModelId,
  virtualLabInfo,
}: {
  meModelId: string;
  virtualLabInfo: VirtualLabInfo;
}) {
  const meModelPageUrl = getMEModelPageUrl(meModelId, virtualLabInfo);

  return (
    <div className="flex flex-col items-center justify-center gap-y-3">
      <h2 className="items-start gap-x-2 text-4xl font-bold text-primary-8">
        Initiating validation
      </h2>
      <p className="text-primary-8">
        Once the validation process finishes, you can view the results in your project's Activity
        section.
      </p>

      <CentralLoadingWheel
        text={
          <>
            <div>Please don’t close the window</div>
            <span className="text-sm font-light">Validation is launching</span>
          </>
        }
        noResults
        style={{ display: 'table', width: '100%', height: '200px' }}
      />

      <Link className="border border-primary-8 px-4 py-2 text-primary-8" href={meModelPageUrl}>
        Cancel Validation
      </Link>
    </div>
  );
}

function ValidationRunning({
  meModelId,
  virtualLabInfo,
}: {
  meModelId: string;
  virtualLabInfo: VirtualLabInfo;
}) {
  const meModelPageUrl = getMEModelPageUrl(meModelId, virtualLabInfo);

  return (
    <div className="flex flex-col items-center justify-center gap-y-3">
      <h2 className="items-start gap-x-2 text-4xl font-bold text-primary-8">Running validation</h2>
      <p className="text-primary-8">
        Once the validation process finishes, you can view the results in your project&apos;s
        Activity section.
      </p>

      <p className="text-primary-8">
        You can close the window at any time now. Analysis results will appear under the
        <Link className="ml-2 font-bold underline" href={meModelPageUrl}>
          EModel details page
        </Link>
      </p>

      <CentralLoadingWheel
        text={<ElapsedTime />}
        style={{ display: 'table', width: '100%', height: '200px' }}
      />

      <div className="mt-10 flex flex-row gap-3">
        <a
          className="border border-primary-8 px-4 py-2 text-primary-8"
          href={`${generateVlProjectUrl(virtualLabInfo.virtualLabId, virtualLabInfo.projectId)}/activity`}
        >
          View activity
        </a>
      </div>
    </div>
  );
}

function ValidationSuccess({
  meModelId,
  virtualLabInfo,
}: {
  meModelId: string;
  virtualLabInfo: VirtualLabInfo;
}) {
  const router = useRouter();

  const meModelPageUrl = getMEModelPageUrl(meModelId, virtualLabInfo);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(meModelPageUrl);
    }, 3000);

    return () => clearTimeout(timer);
  }, [meModelPageUrl, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-y-3">
      <h2 className="items-start gap-x-2 text-4xl font-bold text-primary-8">
        Validation finished successfully
      </h2>
      <p className="text-primary-8">You will be redirected to ME-Model page shortly</p>

      <Link className="border border-primary-8 px-4 py-2 text-primary-8" href={meModelPageUrl}>
        View EModel details
      </Link>
    </div>
  );
}

function ValidationError({
  meModelId,
  virtualLabInfo,
}: {
  meModelId: string;
  virtualLabInfo: VirtualLabInfo;
}) {
  const meModelPageUrl = getMEModelPageUrl(meModelId, virtualLabInfo);

  return (
    <div className="flex flex-col items-center justify-center gap-y-3">
      <h2 className="items-start gap-x-2 text-4xl font-bold text-warning">Validation error</h2>
      <p className="text-primary-8">An unexpected error occurred during the validation process.</p>

      <Link className="border border-primary-8 px-4 py-2 text-primary-8" href={meModelPageUrl}>
        EModel details
      </Link>
    </div>
  );
}

export default function BluePyEModelContainer({
  virtualLabInfo,
  accessToken,
}: {
  virtualLabInfo: VirtualLabInfo;
  accessToken: string;
}) {
  const router = useRouter();

  const meModelSelfUrl = useAtomValue(meModelSelfUrlAtom);
  const meModelId = useAtomValue(selectedMEModelIdAtom);

  const bluePyEModelInstance = useRef<BluePyEModelCls | null>(null);

  const [analysisState, setAnalysisState] = useState<AnalisysState>('initializing');

  useEffect(() => {
    if (bluePyEModelInstance.current || !meModelSelfUrl || !accessToken) return;

    const onInit = () => {
      bluePyEModelInstance.current?.runAnalysis();
      setAnalysisState('running');
    };

    const onAnalysisDone = () => {
      setAnalysisState('done');
    };

    const onAnalysisError = () => {
      setAnalysisState('error');
    };

    bluePyEModelInstance.current = new BluePyEModelCls(meModelSelfUrl, accessToken, {
      onInit,
      onAnalysisDone,
      onAnalysisError,
    });

    return () => {
      if (!bluePyEModelInstance.current) return;
      bluePyEModelInstance.current.destroy();
      bluePyEModelInstance.current = null;
    };
  }, [meModelSelfUrl, router, accessToken, virtualLabInfo.projectId, virtualLabInfo.virtualLabId]);

  if (analysisState === 'initializing') {
    return <ValidationInit virtualLabInfo={virtualLabInfo} meModelId={meModelId as string} />;
  }

  if (analysisState === 'running') {
    return <ValidationRunning virtualLabInfo={virtualLabInfo} meModelId={meModelId as string} />;
  }

  if (analysisState === 'done') {
    return <ValidationSuccess virtualLabInfo={virtualLabInfo} meModelId={meModelId as string} />;
  }

  return <ValidationError virtualLabInfo={virtualLabInfo} meModelId={meModelId as string} />;
}
