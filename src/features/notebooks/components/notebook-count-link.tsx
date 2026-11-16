'use client';

import { WarningOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { useNotebookCount } from '@/features/notebooks/hooks/use-notebook-count';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';

export function NotebookCountLink({
  title,
  extendedType,
  href,
  scope,
  isActive,
}: {
  title: string;
  extendedType: TExtendedEntitiesTypeDict;
  href: string;
  scope: TWorkspaceScope;
  isActive: boolean;
}) {
  const { filtered, total, isLoading, isError } = useNotebookCount({
    extendedType,
    scope,
    isActive,
  });

  return (
    <Button
      asChild
      rounded
      variant="outline"
      size="lg"
      active={isActive}
      data-testid={`notebook-count-link-${extendedType}`}
      // as Reports' list pills: white with a hairline, the open one navy (the user asked Notebooks to match Reports)
      className={cn(
        'group h-auto w-full shrink grow border-none py-3 text-base',
        !isActive && 'bg-white shadow-none ring-1 ring-[rgb(19_48_111/0.12)] ring-inset'
      )}
    >
      <Link href={href} className="flex! w-full items-center justify-between!">
        <span className="font-bold text-current">{title}</span>
        <span
          data-testid={`notebook-count-${extendedType}`}
          data-active={isActive}
          data-count={filtered ?? undefined}
          data-total={total ?? undefined}
          className={cn('text-neutral-4 group-hover:text-label text-sm font-light', {
            'font-bold text-white': isActive,
          })}
        >
          {isError ? (
            // as `BrowseLink`: a failed count must not read as "0 of n"
            <WarningOutlined className="text-warning" />
          ) : isLoading ? (
            <span className="flex items-center justify-center gap-1">
              <Skeleton className="h-3 w-5 rounded-full" />
              <span className="text-neutral-2 font-light">of</span>
              <Skeleton className="h-3 w-5 rounded-full" />
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1">
              <span className="font-bold">{filtered ?? 0}</span>
              <span className="font-light">of</span>
              <span className="font-bold">{total ?? 0}</span>
            </span>
          )}
        </span>
      </Link>
    </Button>
  );
}
