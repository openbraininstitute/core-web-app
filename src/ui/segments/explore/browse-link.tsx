import { LoadingOutlined } from '@ant-design/icons';
import { usePathname, useSearchParams } from 'next/navigation';
import snakeCase from 'es-toolkit/compat/snakeCase';
import Link from 'next/link';

import type { ReactNode } from 'react';

import { getEntityTypeFromUrlOnEntityScope } from '@/ui/segments/explore/helpers';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';

export function BrowseLink({
  isLoading,
  type,
  title,
  count,
  href,
}: {
  isLoading: boolean;
  type: string;
  title: string;
  count: ReactNode;
  href: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const entityType = snakeCase(getEntityTypeFromUrlOnEntityScope(pathname) ?? '');
  const onClick = () => {
    userJourneyTracker.registerArtifactClick(title);
  };
  return (
    <Button
      asChild
      rounded
      key={`counter-${type}`}
      variant="outline"
      size="lg"
      className="group w-full border-none text-base"
      active={entityType === type}
      onClick={onClick}
    >
      <Link
        href={{
          pathname: href,
          query: searchParams.toString(),
        }}
        className="flex! w-full items-center justify-between!"
      >
        <div className="font-bold text-current">{title}</div>
        <div
          className={cn(
            'text-neutral-4 group-hover:text-label text-sm font-light group-hover:font-bold',
            { 'font-bold text-white': entityType === type }
          )}
        >
          {isLoading ? <LoadingOutlined /> : count}
        </div>
      </Link>
    </Button>
  );
}
