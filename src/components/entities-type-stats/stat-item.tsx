import { LoadingOutlined, WarningOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { ReactNode, useMemo } from 'react';

import { useQueryState } from 'nuqs';
import { unwrap } from 'jotai/utils';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { selectedBrainRegionAtom } from '@/state/brain-regions';
import { useCurrentExplorerArtifact } from '@/state/explore-section/artifact';
import { ensureString } from '@/util/type-guards';
import { classNames } from '@/util/utils';
import {
  brainRegionHierarchyAtom,
  DEFAULT_BRAIN_REGION_QUERY_ID,
} from '@/features/brain-region-hierarchy/context';

// TODO: to delete when confirm the LiteratureForExperimentType is not needed
export default function StatItem({
  href,
  title,
  subtitle,
  testId,
}: {
  href: string;
  testId: string;
  title: ReactNode;
  subtitle: ReactNode;
}) {
  const [, setCurrentExplorerArtifact] = useCurrentExplorerArtifact();
  const [brainRegionId] = useQueryState(DEFAULT_BRAIN_REGION_QUERY_ID);
  const brainRegionHierarchy = useAtomValue(useMemo(() => unwrap(brainRegionHierarchyAtom), []));

  const onClick = async () => {
    const brainRegionName = brainRegionHierarchy?.options.find(
      (o) => o.value === brainRegionId
    )?.label;
    if (!(await userJourneyTracker.getCurrentTuple())) {
      await userJourneyTracker.handleBrainRegionClick(brainRegionName!);
    }
    const artifact = ensureString(title, 'Morphology');
    setCurrentExplorerArtifact(artifact);
    await userJourneyTracker.handleClick('artifact', artifact);
  };

  return (
    <Link
      href={href}
      className="hover:text-primary-4 flex h-[50px] w-full justify-between rounded-xs bg-[#013a8c] px-3 py-4 text-white"
      onClick={onClick}
      data-testid={testId}
    >
      <span className="text-base font-bold">{title}</span>
      <span className="mr-2 font-light">{subtitle}</span>
    </Link>
  );
}

export function EntityTypeCountSkeleton() {
  return (
    <div className="bg-neutral-7 flex h-[50px] w-full animate-pulse justify-between rounded-xs px-3 py-4 opacity-85" />
  );
}

// TODO: to delete
export function StatError({ text }: { text: string }) {
  return (
    <div
      className={classNames(
        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'bg-neutral-7 flex h-[50px] items-center gap-3 rounded-xs p-4 text-white'
      )}
    >
      <WarningOutlined className="text-xl" />
      {text}
    </div>
  );
}

export function EntityTypeCount({
  href,
  title,
  records,
  type,
  isError,
  isLoading = false,
}: {
  href: string;
  title: string;
  records: string;
  type: string;
  isError: boolean;
  isLoading?: boolean;
}) {
  const [, setCurrentExplorerArtifact] = useCurrentExplorerArtifact();
  const [brainRegionId] = useQueryState(DEFAULT_BRAIN_REGION_QUERY_ID);
  const brainRegionHierarchy = useAtomValue(useMemo(() => unwrap(brainRegionHierarchyAtom), []));

  const onClick = async () => {
    const brainRegionName = brainRegionHierarchy?.options.find(
      (o) => o.value === brainRegionId
    )?.label;
    if (!(await userJourneyTracker.getCurrentTuple())) {
      await userJourneyTracker.handleBrainRegionClick(brainRegionName!);
    }
    const artifact = ensureString(title, 'Morphology');
    setCurrentExplorerArtifact(artifact);
    await userJourneyTracker.handleClick('artifact', artifact);
  };

  return (
    <Link
      href={href}
      className="hover:text-primary-4 flex h-[50px] w-full justify-between rounded-xs bg-[#013a8c] px-3 py-4 text-white"
      onClick={onClick}
      data-testid={`dataset-${type}`}
    >
      <span className="text-base font-bold">{title}</span>
      {isLoading && !isError && <LoadingOutlined className="ml-auto" />}
      {isError ? (
        <WarningOutlined className="text-xl" />
      ) : (
        <span className="mr-2 font-light">{records}</span>
      )}
    </Link>
  );
}
