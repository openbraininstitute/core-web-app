import { LoadingOutlined, WarningOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { useCurrentExplorerArtifact } from '@/state/explore-section/artifact';
import { ensureString } from '@/util/type-guards';

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
  const onClick = async () => {
    const artifact = ensureString(title, 'Morphology');
    setCurrentExplorerArtifact(artifact);
    await userJourneyTracker.registerArtifactClick(artifact);
  };

  return (
    <Link
      href={href}
      className="hover:text-primary-4 flex h-[50px] w-full justify-between rounded-xs bg-[#013a8c] px-3 py-4 text-white"
      onClick={onClick}
      data-testid={`dataset-${type}`}
    >
      <span className="text-base font-bold">{title}</span>
      {((isLoading && !isError) || (isLoading && records)) && (
        <LoadingOutlined className="ml-auto" />
      )}
      {isError ? (
        <WarningOutlined className="text-xl" />
      ) : (
        <span className="mr-2 font-light">{records}</span>
      )}
    </Link>
  );
}
