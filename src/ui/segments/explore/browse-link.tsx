/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import snakeCase from 'es-toolkit/compat/snakeCase';
import Link from 'next/link';

import type { ReactNode } from 'react';

import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { getEntityTypeFromUrlOnEntityScope } from '@/ui/segments/explore/helpers';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { TWorkspaceScope, WorkspaceScope } from '@/constants';

type Props = {
  isLoading: boolean;
  isUploadable?: boolean;
  type: TExtendedEntitiesTypeDict;
  title: string;
  count: ReactNode;
  href: string;
};

export function BrowseLinkContent({ isLoading, isUploadable, type, title, count, href }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const scope = (searchParams.get('scope') ?? WorkspaceScope.Public) as TWorkspaceScope;

  const entityType = snakeCase(getEntityTypeFromUrlOnEntityScope(pathname) ?? '');

  const onContribute = () => {
    makeSelectContributionEntityClickEvent({
      display: true,
      entityType: type,
      sessionId: crypto.randomUUID(),
    });
  };

  const onClick = () => {
    userJourneyTracker.registerArtifactClick(title);
  };

  return (
    <div className="group flex w-full items-center justify-center gap-0">
      <div className="relative flex w-full items-center">
        <Button
          asChild
          rounded
          key={`counter-${type}`}
          variant="outline"
          size="lg"
          className="group w-full shrink grow border-none text-base"
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
        {isUploadable && scope === WorkspaceScope.Project && (
          <div
            className={cn(
              'transition-all duration-500 ease-out',
              'w-0 scale-0 opacity-0',
              'group-hover:w-auto group-hover:scale-100 group-hover:opacity-100',
              'flex origin-left items-center'
            )}
          >
            <Button
              rounded
              variant="outline"
              className={cn(
                'border-neutral-2 hover:bg-primary-9 hover:border-primary-9',
                'h-12 w-12! bg-transparent p-0 hover:text-white',
                'transition-all duration-900 ease-out',
                'shadow-md group-hover:ml-2 group-hover:shadow-xl',
                'group-hover:scale-100',
                { 'h-10! w-10!': breakpoint === 'l' },
                { 'h-12! w-12!': breakpoint === 'xl' }
              )}
              onClick={onContribute}
            >
              <PlusOutlined />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function BrowseLink(props: Props) {
  return (
    <HydrateWrapper>
      <BrowseLinkContent {...props} />
    </HydrateWrapper>
  );
}
