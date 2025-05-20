import { WarningOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { ReactNode } from 'react';

import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { selectedBrainRegionAtom } from '@/state/brain-regions';
import { useCurrentExplorerArtifact } from '@/state/explore-section/artifact';
import { ensureString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

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
  const selectedBrainRegion = useAtomValue(selectedBrainRegionAtom);
  const onClick = async () => {
    const current = await userJourneyTracker.getCurrentTuple();

    if (!current) {
      await userJourneyTracker.handleBrainRegionClick(selectedBrainRegion?.title!);
    }
    const artifact = ensureString(title, 'Morphology');

    setCurrentExplorerArtifact(artifact);
    await userJourneyTracker.handleClick('artifact', artifact);
  };

  return (
    <Link
      href={href}
      className="flex h-[50px] w-full justify-between rounded-sm bg-[#013a8c] px-3 py-4 text-white hover:text-primary-4"
      onClick={onClick}
      data-testid={testId}
    >
      <span className="text-base font-bold">{title}</span>
      <span className="mr-2 font-light">{subtitle}</span>
    </Link>
  );
}

export function StatItemSkeleton() {
  return (
    <div className="flex h-[50px] w-full animate-pulse justify-between rounded-sm bg-neutral-7 px-3 py-4 opacity-85" />
  );
}

export function StatError({ text }: { text: string }) {
  return (
    <div
      className={classNames(
        'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        'flex h-[50px] items-center gap-3 rounded-sm bg-neutral-7 p-4 text-white'
      )}
    >
      <WarningOutlined className="text-xl" />
      {text}
    </div>
  );
}
