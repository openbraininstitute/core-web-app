'use client';

import { useEffect, useState } from 'react';

import { CourseFigureLive } from '@/features/learn/ui/course-preview';
import { ModelView } from '@/ui/segments/project/models/model-views';
import { cn } from '@/utils/css-class';

import { ExamplesGallery } from './examples-gallery';
import { COURSE_WIDGET } from './scenes';

import type { ReactNode } from 'react';
import type { IChapter } from './chapters';
import type { TWalkthroughScene } from './scenes';

import '@/styles/learn.css';

/** How long a chapter stays on before its scene is drawn: scrolling past it draws nothing. */
const SETTLE_MS = 250;
/** How long a scene takes to fade out, before it is let go of. */
const FADE_MS = 700;

export type TWalkthroughVideos = Partial<Record<'workflows' | 'notebooks', string | null>>;

/**
 * The right of the page, under the words: `scene` drawn by `draw`, fading in over the scene before.
 * A scene is drawn only once its chapter has stayed on a moment, and the one going is kept until it
 * has faded.
 */
export function FadingStage<S extends string>({
  scene: asked,
  draw,
  wide,
  full,
  passThrough,
}: {
  scene: S;
  draw: (scene: S, leaving: boolean) => ReactNode;
  /** The scenes as wide as the page, under words across its top, rather than beside them. */
  wide?: (scene: S) => boolean;
  /** The scenes over the whole page, the words' side too, which place what they draw themselves. */
  full?: (scene: S) => boolean;
  /** The scenes that let the pointer through, to what floats under the stage. */
  passThrough?: (scene: S) => boolean;
}) {
  const [scene, setScene] = useState(asked);
  useEffect(() => {
    if (asked === scene) return;
    const timer = setTimeout(() => setScene(asked), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [asked, scene]);

  // The scenes mounted, by their key: the one on, and those still fading out.
  const [layers, setLayers] = useState<Array<{ scene: S; leaving: boolean }>>([
    { scene, leaving: false },
  ]);
  useEffect(() => {
    setLayers((now) => [
      ...now.filter((layer) => layer.scene !== scene).map((layer) => ({ ...layer, leaving: true })),
      { scene, leaving: false },
    ]);
    const timer = setTimeout(
      () => setLayers((now) => now.filter((layer) => !layer.leaving)),
      FADE_MS
    );
    return () => clearTimeout(timer);
  }, [scene]);

  return (
    <>
      {layers.map((layer) => (
        <div
          key={layer.scene}
          data-stage-current={layer.scene === asked && !layer.leaving}
          className={cn(
            full?.(layer.scene)
              ? 'absolute inset-0'
              : wide?.(layer.scene)
                ? 'absolute inset-x-0 top-[33%] bottom-0'
                : 'absolute inset-x-0 top-0 h-[55%] beside:inset-y-0 beside:left-auto beside:h-full beside:w-[62%]',
            layer.leaving
              ? 'pointer-events-none opacity-0 transition-opacity duration-700'
              : cn(
                  'animate-fade-in',
                  passThrough?.(layer.scene) ? 'pointer-events-none' : 'pointer-events-auto'
                )
          )}
          inert={layer.leaving || undefined}
        >
          {draw(layer.scene, layer.leaving)}
        </div>
      ))}
    </>
  );
}

/** The walkthrough's stage: its models, the course's figure, and the platform's animations. */
export function WalkthroughStage({
  chapter,
  colorSlot,
  videos,
}: {
  chapter: IChapter;
  /** Where the chapter on puts colour-by, null where it offers none. */
  colorSlot: HTMLElement | null;
  videos: TWalkthroughVideos;
}) {
  return (
    <FadingStage
      scene={chapter.scene}
      wide={(scene) => scene === 'examples'}
      draw={(scene, leaving) => (
        <Scene
          scene={scene}
          flat={chapter.scene === 'cell' && !!chapter.flat}
          colorSlot={leaving || !chapter.colorBy ? null : colorSlot}
          videos={videos}
        />
      )}
    />
  );
}

function Scene({
  scene,
  flat,
  colorSlot,
  videos,
}: {
  scene: TWalkthroughScene;
  flat: boolean;
  colorSlot: HTMLElement | null;
  videos: TWalkthroughVideos;
}) {
  if (scene === 'course') return <CourseLayer />;
  if (scene === 'examples') return <ExamplesGallery />;
  if (scene === 'workflows' || scene === 'notebooks') {
    return <VideoLayer src={videos[scene] ?? null} />;
  }
  return <ModelView model={scene} flat={flat} colorSlot={colorSlot} />;
}

/** The course's own figure, playing as on its slide. */
function CourseLayer() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-[clamp(16px,4vw,56px)]">
      <CourseFigureLive widget={COURSE_WIDGET} className="w-full max-w-[820px]" />
    </div>
  );
}

/** One of the platform's animations, looping, as a figure on the page. */
function VideoLayer({ src }: { src: string | null }) {
  if (!src) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center p-[clamp(24px,5vw,72px)]">
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        className="max-h-full w-full rounded-[18px] object-cover shadow-[0_24px_60px_rgba(0,39,102,0.18)]"
      />
    </div>
  );
}
