import { WarningOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { ReactNode } from 'react';

import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { useCurrentExplorerArtifact } from '@/state/explore-section/artifact';
import { ensureString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

function StatItem({
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
  const onClick = async () => {
    const artifact = ensureString(title, 'Morphology');
    setCurrentExplorerArtifact(artifact);
    userJourneyTracker.registerArtifactClick(artifact);
  };

  return (
    <Link
      href={href}
      className="hover:text-primary-4 flex h-[50px] w-full justify-between rounded-sm bg-[#013a8c] px-3 py-4 text-white"
      onClick={onClick}
      data-testid={testId}
    >
      <span className="text-base font-bold">{title}</span>
      <span className="mr-2 font-light">{subtitle}</span>
    </Link>
  );
}

function StatItemSkeleton() {
  return (
    <div className="bg-neutral-7 flex h-[50px] w-full animate-pulse justify-between rounded-sm px-3 py-4 opacity-85" />
  );
}

export function StatError({ text }: { text: string }) {
  return (
    <div
      className={classNames(
        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'bg-neutral-7 flex h-[50px] items-center gap-3 rounded-sm p-4 text-white'
      )}
    >
      <WarningOutlined className="text-xl" />
      {text}
    </div>
  );
}
