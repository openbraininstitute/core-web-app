'use client';

import { RiArrowRightLine } from '@remixicon/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CircuitStage } from '@/ui/segments/project/start/circuit-stage';
import { MeshStage } from '@/ui/segments/project/start/mesh-stage';
import { StageTag, StageTitle } from '@/ui/segments/project/start/stage-text';
import { formatDuration, useVideoDuration } from '@/ui/segments/project/start/use-video-duration';
import { cn } from '@/utils/css-class';

import type { TStartItem } from '@/ui/segments/project/start/items';

/** The design's veil over a video: navy at the top and bottom, where the text sits. */
const VEIL =
  'pointer-events-none absolute inset-0 bg-linear-to-b from-[rgba(0,39,102,0.86)] via-[rgba(0,39,102,0.34)] via-50% to-[rgba(0,39,102,0.86)]';

function TutorialStage({ item }: { item: Extract<TStartItem, { kind: 'tutorial' }> }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const duration = useVideoDuration(item.video);

  return (
    <>
      <video
        ref={video}
        src={item.video}
        preload="metadata"
        controls={playing}
        playsInline
        className="absolute inset-0 size-full bg-black object-contain"
      />
      {!playing && (
        <>
          <Image
            src={item.poster}
            alt=""
            fill
            priority
            sizes="(max-width: 1500px) 60vw, 900px"
            className="object-cover"
          />
          <div className={VEIL} />
          <div className="pointer-events-none relative flex h-full flex-col justify-between p-[22px]">
            <div className="flex flex-col gap-[12px]">
              <StageTag>Tutorials · featured</StageTag>
              <StageTitle>{item.title}</StageTitle>
            </div>
            <p className="text-[13px] leading-[17px] text-white">
              {duration ? formatDuration(duration) : ' '}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Play ${item.title}`}
            onClick={() => {
              setPlaying(true);
              void video.current?.play();
            }}
            className="absolute top-1/2 left-1/2 size-[64px] -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-105"
          >
            <img src="/images/start/play.svg" alt="" width={64} height={64} />
          </button>
        </>
      )}
    </>
  );
}

function AnimationStage({ item }: { item: Extract<TStartItem, { kind: 'animation' }> }) {
  const { virtualLabId, projectId } = useWorkspace();

  return (
    <>
      <video
        src={item.video}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
      <div className={VEIL} />
      <div className="relative flex h-full flex-col justify-between p-[22px]">
        <div className="flex flex-col gap-[12px]">
          <StageTag>{item.section}</StageTag>
          <StageTitle>{item.title}</StageTitle>
        </div>
        <div className="flex items-end justify-between gap-6">
          <p className="max-w-[520px] text-[13px] leading-[17px] text-white">{item.description}</p>
          <Link
            href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}${item.href}`}
            className="text-primary-9 flex shrink-0 items-center gap-[10px] rounded-[23px] bg-white px-[20px] pt-[13px] pb-[14px] text-[14px] leading-[19px] font-semibold transition-opacity hover:opacity-90"
          >
            {item.title}
            <RiArrowRightLine className="size-[14px]" />
          </Link>
        </div>
      </div>
    </>
  );
}

/**
 * The large frame at the top right: the featured video, or what was picked from the row below.
 * A circuit or a mesh keeps its title under the view, inside the same frame.
 */
export function Stage({ item, className }: { item: TStartItem | undefined; className?: string }) {
  return (
    <div
      className={cn(
        'relative aspect-[811/485] max-h-[calc(100vh-24rem)] min-h-[320px] w-full min-w-0',
        className
      )}
    >
      {item?.kind === 'circuit' && <CircuitStage key={item.key} example={item} />}
      {item?.kind === 'mesh' && <MeshStage key={item.key} example={item} />}
      {(!item || item.kind === 'tutorial' || item.kind === 'animation') && (
        <div className="bg-primary-9 relative size-full overflow-hidden rounded-[12px]">
          {item?.kind === 'tutorial' && <TutorialStage key={item.key} item={item} />}
          {item?.kind === 'animation' && <AnimationStage key={item.key} item={item} />}
        </div>
      )}
    </div>
  );
}
