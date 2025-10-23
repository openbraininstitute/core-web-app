'use client';

import { parseAsString, useQueryState, type Parser } from 'nuqs';
import { useSelectedLayoutSegments } from 'next/navigation';
import { match, P } from 'ts-pattern';
import last from 'es-toolkit/compat/last';
import type { ReactNode } from 'react';

import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { EntityLeftMenu } from '@/ui/segments/explore/entity-left-menu';
import { LibraryLeftMenu } from '@/ui/segments/explore/library-left-menu';
import { Card } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

import { WorkspaceScope, type TWorkspaceScope } from '@/constants';

type Props = { dataKey: string; children: ReactNode };

export function DefaultContent({ children, dataKey }: Props) {
  const segments = useSelectedLayoutSegments();
  const { mdv, setMdv } = useMiniDetailView();
  const [scope] = useQueryState(
    'scope',
    parseAsString.withOptions({ clearOnDefault: false, shallow: true }) as Parser<TWorkspaceScope>
  );

  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  const menu = match({ scope, segments })
    .with(
      {
        scope: P.union(WorkspaceScope.Project, WorkspaceScope.Public),
        segments: P.when((e) => {
          if (last(e) === 'entity') return true;
          return false;
        }),
      },
      () => <EntityLeftMenu dataKey={dataKey} />
    )
    .with(
      {
        segments: P.when((e) => last(e) === 'bookmarks'),
      },
      () => <LibraryLeftMenu />
    )
    .otherwise(() => <EntityLeftMenu dataKey={dataKey} />);

  return (
    <>
      <div
        id="explore-left-menu"
        data-testid="explore-left-menu"
        className={cn(
          'h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full overflow-hidden [grid-area:aside]',
          { hidden: mdv }
        )}
      >
        <Card borderless className="h-full w-full gap-0 py-0 shadow-lg">
          {menu}
        </Card>
      </div>
      {children}
    </>
  );
}
