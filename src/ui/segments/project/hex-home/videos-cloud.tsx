'use client';

import { RiCloseLine, RiPlayFill } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { config } from '@/config';
import { getClient } from '@/services/sanity/client';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { LOCAL_VIDEOS } from '@/ui/segments/project/hex-home/content';
import { cloudFillers } from '@/ui/segments/project/hex-home/hex-geometry';
import { burstMs, HexTile } from '@/ui/segments/project/hex-home/hex-tile';
import { type TTutorial, TutorialQuery } from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';

import styles from './hex-cloud.module.css';

import type { IExampleVideo } from '@/ui/segments/project/hex-home/content';
import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';

const WIDTH = 1360;
const HEIGHT = 520;
/** The layout px the cloud is drawn in, for the page to place and scale it. */
export const VIDEOS_FRAME = { width: WIDTH, height: HEIGHT };
const R = 88;
/** Tiles zigzag along one honeycomb strip: the upper row's titles above it, the lower row's under it. */
const STEP = 176;
const ROWS = [175, 327];
/** Tutorials from Sanity after the platform's own recordings. */
const MAX_TUTORIALS = 5;

function layout(count: number): IHexBox[] {
  const cols = Math.ceil(count / 2);
  const span = (cols - 1) * STEP + (count > 1 ? STEP / 2 : 0);
  const x0 = (WIDTH - span) / 2;
  return Array.from({ length: count }, (_, i) => ({
    x: x0 + Math.floor(i / 2) * STEP + (i % 2 ? STEP / 2 : 0),
    y: ROWS[i % 2],
    r: R,
  }));
}

function VideoTile({
  video,
  box,
  below,
  from,
  onOpen,
}: {
  video: IExampleVideo;
  box: IHexBox;
  below: boolean;
  from: IPoint;
  onOpen: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <HexTile
      box={box}
      lift={0.65}
      href={video.href}
      onClick={video.href ? undefined : onOpen}
      onHover={setHover}
      title={video.title}
      from={from}
      appearMs={burstMs(box, from, 200, 0.45)}
      overlay={
        <span
          className={cn(
            styles.label,
            'flex w-[190px] flex-col items-center text-center whitespace-normal',
            below ? 'top-[calc(100%+10px)]' : 'bottom-[calc(100%+10px)]'
          )}
        >
          <span className="text-[10px] leading-[13px] font-semibold tracking-[1px] text-neutral-400 uppercase">
            {video.kind}
          </span>
          <span
            className={cn(
              'text-primary-9 mt-[2px] text-[13px] leading-[16px] font-semibold transition-colors',
              hover && 'text-primary-7'
            )}
          >
            {video.title}
          </span>
        </span>
      }
    >
      <img src={video.poster} alt="" className={styles.cover} draggable={false} />
      {video.video && hover && (
        <video className={styles.cover} src={video.video} autoPlay muted loop playsInline />
      )}
      <span
        className={cn(
          'absolute top-1/2 left-1/2 flex size-[38px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-all duration-300',
          hover ? 'scale-90 opacity-0' : 'opacity-100'
        )}
      >
        <RiPlayFill className="text-primary-9 ml-[2px] size-[18px]" />
      </span>
    </HexTile>
  );
}

export function Player({ video, onClose }: { video: IExampleVideo; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div
      className={cn(styles.fadeIn, 'fixed inset-0 z-[80] flex items-center justify-center bg-white/80 p-8 backdrop-blur-sm')}
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-[1100px] flex-col gap-3 rounded-2xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-1">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-[1px] text-neutral-400 uppercase">
              {video.kind}
            </span>
            <span className="text-primary-9 text-[20px] leading-[26px] font-semibold">{video.title}</span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="hover:bg-neutral-1 rounded-full p-1 text-neutral-500"
          >
            <RiCloseLine className="size-6" />
          </button>
        </div>
        {video.video ? (
          <video
            className="w-full rounded-xl bg-neutral-100"
            src={video.video}
            poster={video.poster}
            autoPlay
            controls
            playsInline
          />
        ) : (
          <img src={video.poster} alt={video.title} className="w-full rounded-xl bg-neutral-100" />
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * Example videos as a cloud: the platform's recordings and Sanity's tutorials raised along a honeycomb strip in a
 * scatter of white tiles; each plays in place on hover and large on a click (a tutorial opens its page). All of it
 * comes out of `from`, the tile it was opened from.
 */
export function VideosCloud({ from }: { from: IPoint }) {
  const { virtualLabId, projectId } = useWorkspace();
  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;
  const [open, setOpen] = useState<IExampleVideo | null>(null);

  const client = getClient();
  const { data: tutorials } = useQuery({
    queryKey: keyBuilderExternal.discoverTutorialsList(),
    queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery, {}, { next: { revalidate: 0 } }),
  });

  const videos = useMemo<IExampleVideo[]>(
    () => [
      ...LOCAL_VIDEOS,
      ...(tutorials ?? [])
        .filter((t) => t.posterImage && t.slug)
        .slice(0, MAX_TUTORIALS)
        .map((t) => ({
          key: `tutorial-${t.slug}`,
          kind: t.category ?? 'Tutorial',
          title: t.title,
          poster: `${t.posterImage}?w=400&h=400&fit=crop`,
          href: `${base}/tutorials/${t.slug}`,
        })),
    ],
    [tutorials, base]
  );
  const boxes = layout(videos.length);

  const fillers = useMemo(
    () =>
      cloudFillers({
        seed: 23,
        width: WIDTH,
        height: HEIGHT,
        R: 30,
        centre: { x: WIDTH / 2, y: 250 },
        reach: { x: 720, y: 270 },
        // the titles above and under the strip keep clear too
        avoid: [
          ...boxes,
          ...boxes.flatMap((b, i) =>
            [-48, 48].map((dx) => ({ x: b.x + dx, y: b.y + (i % 2 ? 1 : -1) * (R + 30), r: 44 }))
          ),
        ],
        gap: 8,
        density: 0.6,
        strays: 16,
      }),
    [videos.length]
  );

  return (
    <>
      <>
        {fillers.map((f) => (
          <HexTile
            key={f.key}
            box={f}
            lift={f.lift}
            drift={f.drift}
            tone={f.lift < 0.2 ? 'floor' : 'white'}
            from={from}
            appearMs={burstMs(f, from, 0, 0.45)}
          />
        ))}
        {videos.map((video, i) => (
          <VideoTile
            key={video.key}
            video={video}
            box={boxes[i]}
            below={i % 2 === 1}
            from={from}
            onOpen={() => setOpen(video)}
          />
        ))}
      </>
      {open && <Player video={open} onClose={() => setOpen(null)} />}
    </>
  );
}
