'use client';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type StageProps<S extends string> = {
  scene: S;
  active: boolean;
  draw: (scene: S) => ReactNode;
  full?: (scene: S) => boolean;
  passThrough?: (scene: S) => boolean;
};

/** Media lives in the same scrolling section as the text, without a separate animation clock. */
export function SlidingStage<S extends string>({
  scene,
  active,
  draw,
  full,
  passThrough,
}: StageProps<S>) {
  return (
    <div
      data-stage-current={active}
      data-stage-scene={scene}
      className={cn(
        full?.(scene)
          ? 'absolute inset-0'
          : 'absolute inset-x-0 top-0 h-[55%] beside:inset-y-0 beside:left-auto beside:h-full beside:w-[62%]',
        !active || passThrough?.(scene) ? 'pointer-events-none' : 'pointer-events-auto'
      )}
      inert={!active || undefined}
    >
      {draw(scene)}
    </div>
  );
}
