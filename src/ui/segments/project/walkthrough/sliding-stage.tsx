'use client';

import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { useState } from 'react';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type StageProps<S extends string> = {
  scene: S;
  order: readonly S[];
  draw: (scene: S) => ReactNode;
  full?: (scene: S) => boolean;
  passThrough?: (scene: S) => boolean;
};

/** Move the media with the chapter's reading direction, retaining both scenes during the handover. */
export function SlidingStage<S extends string>({ scene, order, ...props }: StageProps<S>) {
  const [position, setPosition] = useState({ scene, direction: 1 });
  if (position.scene !== scene) {
    setPosition({
      scene,
      direction: order.indexOf(scene) > order.indexOf(position.scene) ? 1 : -1,
    });
  }
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence initial={false} custom={position.direction}>
        <SceneLayer
          key={scene}
          scene={scene}
          direction={position.direction}
          reduced={!!reduced}
          {...props}
        />
      </AnimatePresence>
    </div>
  );
}

function SceneLayer<S extends string>({
  scene,
  direction,
  reduced,
  draw,
  full,
  passThrough,
}: Omit<StageProps<S>, 'order'> & { direction: number; reduced: boolean }) {
  const present = useIsPresent();
  return (
    <motion.div
      data-stage-current={present}
      data-stage-scene={scene}
      custom={direction}
      variants={{
        enter: (direction: number) => ({ y: reduced ? 0 : `${direction * 100}%` }),
        active: { y: 0 },
        leave: (direction: number) => ({ y: reduced ? 0 : `${direction * -100}%` }),
      }}
      initial="enter"
      animate="active"
      exit="leave"
      transition={{ duration: reduced ? 0 : 0.7, ease: 'easeOut' }}
      className={cn(
        full?.(scene)
          ? 'absolute inset-0'
          : 'absolute inset-x-0 top-0 h-[55%] beside:inset-y-0 beside:left-auto beside:h-full beside:w-[62%]',
        !present || passThrough?.(scene) ? 'pointer-events-none' : 'pointer-events-auto'
      )}
      inert={!present || undefined}
    >
      {draw(scene)}
    </motion.div>
  );
}
