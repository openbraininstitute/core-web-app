'use client';

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
          'h-full max-h-[calc(100vh-10.8rem)] px-1 min-h-0 w-full overflow-hidden [grid-area:aside]',
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
