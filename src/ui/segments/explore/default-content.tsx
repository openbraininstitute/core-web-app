'use client';

import { useState, type ReactNode } from 'react';

import { useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { ExploreMenu } from '@/ui/segments/explore/left-menu';
import { Card } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

type Props = { dataKey: string; children: ReactNode };

export function DefaultContent({ children, dataKey }: Props) {
  const [miniViewPresent, setMiniViewPresent] = useState(false);
  useSelectEntityClickEvent((ev) => {
    setMiniViewPresent(ev.detail.display);
  });

  return (
    <>
      <div
        id="explore-left-menu"
        data-testid="explore-left-menu"
        className={cn(
          'h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full overflow-hidden [grid-area:aside]',
          { hidden: miniViewPresent }
        )}
      >
        <Card borderless className="h-full w-full gap-0 bg-white py-0 shadow-lg">
          <ExploreMenu dataKey={dataKey} />
        </Card>
      </div>
      {children}
    </>
  );
}
