'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { BareViewers, ViewOverlay } from '@/features/viewer-3d/bare';
import { getClient } from '@/services/sanity/client';
import {
  DEFAULT_GET_STARTED_VIDEO_SLUG,
  ProjectHomeGetStartedQuery,
  type TProjectHomeData,
  type TTutorial,
  TutorialQuery,
} from '@/ui/segments/project/get-started/query';
import { FLY_FRAME } from '@/ui/segments/project/brains-walkthrough/brains';
import { ModelActions } from '@/ui/segments/project/models/actions';
import { ModelView } from '@/ui/segments/project/models/model-views';
import { modelTitle } from '@/ui/segments/project/models/models';
import { buildStartItems } from '@/ui/segments/project/start/items';
import { Stage } from '@/ui/segments/project/start/stage';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';

import { ModelStrip } from './model-strip';
import { ShortcutPanel } from './shortcut-panel';

import type { TModel } from '@/ui/segments/project/models/models';

/**
 * The stage's box, the first home's and the design's, 811 × 485, for the video and a model alike: as
 * large as fits in the room above the models, kept to its shape.
 */
const STAGE_BOX = 'relative aspect-[811/485] w-[min(100cqw,calc(100cqh*811/485))]';

/**
 * The models home, where the walkthrough ends: the first home's places as a small neural network
 * on the left, a stage on the right with the platform's video until a model is picked, and the
 * models themselves along the foot, turning, each brought up on the stage by a click.
 */
export function ModelsHomePage() {
  const client = getClient();
  const [selected, setSelected] = useState<TModel | null>(null);
  const { data: home } = useQuery({
    queryKey: keyBuilderExternal.projectHomeGetStarted(),
    queryFn: () =>
      client.fetch<TProjectHomeData>(ProjectHomeGetStartedQuery, {}, { next: { revalidate: 0 } }),
  });
  const { data: tutorials } = useQuery({
    queryKey: keyBuilderExternal.discoverTutorialsList(),
    queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery, {}, { next: { revalidate: 0 } }),
  });
  // The first home's featured video, on the stage until a model is.
  const video = useMemo(
    () =>
      buildStartItems({
        featured: tutorials?.find(({ slug }) => slug === DEFAULT_GET_STARTED_VIDEO_SLUG),
        cards: home?.getStarted ?? [],
      }).find((item) => item.kind === 'tutorial'),
    [home, tutorials]
  );

  return (
    <BareViewers>
      <div className="bg-background flex h-full min-h-[720px] w-full flex-col gap-[6px] px-[30px] pt-[26px] pb-[22px]">
        <div className="flex min-h-0 w-full flex-1 items-stretch gap-[clamp(28px,4vw,72px)]">
          <ShortcutPanel className="w-[min(40%,560px)] shrink-0" />
          <div className="flex min-h-0 min-w-0 flex-1 items-start justify-end [container-type:size]">
            {selected ? (
              <ModelStage key={selected} model={selected} />
            ) : (
              <Stage item={video} className={cn(STAGE_BOX, 'max-h-none min-h-0 min-w-0')} />
            )}
          </div>
        </div>
        <ModelStrip selected={selected} onSelect={setSelected} />
      </div>
    </BareViewers>
  );
}

/** A model on the stage, bare on white, with its name, colour-by for a circuit, and what can be done with it. */
function ModelStage({ model }: { model: TModel }) {
  const [colorSlot, setColorSlot] = useState<HTMLElement | null>(null);
  return (
    <div className={STAGE_BOX}>
      <div className="absolute inset-0 flex flex-col gap-[12px]">
        <div className="animate-fade-in relative min-h-0 flex-1 overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
          {model === 'fly' ? (
            // The fly's brain upright and from in front, as the walkthrough shows it, not as FlyWire's axes lie.
            <ViewOverlay frame={FLY_FRAME} render={() => null}>
              <ModelView model={model} colorSlot={colorSlot} />
            </ViewOverlay>
          ) : (
            <ModelView model={model} colorSlot={colorSlot} />
          )}
        </div>
        <div className="text-primary-9 flex shrink-0 items-end justify-between gap-[24px]">
          <div className="flex min-w-0 flex-col gap-[8px]">
            <h2 className="truncate text-[22px] leading-[28px] font-bold">{modelTitle(model)}</h2>
            <div ref={setColorSlot} />
          </div>
          <div className="flex shrink-0 gap-[8px]">
            <ModelActions model={model} />
          </div>
        </div>
      </div>
    </div>
  );
}
