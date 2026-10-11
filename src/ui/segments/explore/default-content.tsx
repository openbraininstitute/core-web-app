'use client';

import { DATA_PANEL_MAX_HEIGHT } from '@/constants';
import { Card } from '@/ui/molecules/card';
import { EntityLeftMenu } from '@/ui/segments/explore/entity-left-menu';
import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type Props = { dataKey: string; children: ReactNode };

export function DefaultContent({ children, dataKey }: Props) {
  const { mdv, setMdv } = useMiniDetailView();

  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  return (
    <>
      <div
        id="explore-left-menu"
        data-testid="explore-left-menu"
        className={cn(
          '-ml-2 h-full min-h-0 overflow-x-clip px-1 [grid-area:aside]',
          DATA_PANEL_MAX_HEIGHT,
          { hidden: mdv }
        )}
      >
        <Card
          id="explore-left-menu-entity-left-menu-card"
          borderless
          className="h-full w-full gap-0 py-0 shadow-none px-0"
        >
          <EntityLeftMenu dataKey={dataKey} />
        </Card>
      </div>
      {children}
    </>
  );
}
