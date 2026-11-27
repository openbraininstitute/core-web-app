'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef, useState } from 'react';

import { INFO_PICTURES, pagePicture } from './info-pictures';
import { randomTileImageOrder } from './tile-image-order';

import styles from './hexa-tile-hero.module.css';

const loadRenderer = () => import('./hexa-tile-renderer');

/** The placeholder the last page without a picture of its own opened on. */
const PLACEHOLDER_KEY = 'obi-information-first-image';
/** How long the tiles outlive the last information page, ms: long enough for the next one to take them over. */
const KEEP_MS = 5000;

type Renderer = ReturnType<typeof import('./hexa-tile-renderer').createHexaTileRenderer>;

/**
 * The tiles, shared by the information pages: one canvas and its renderer, handed from a page to the next as it
 * opens, so going to another page turns the same tiles to its picture (as a chapter picked on infoPage.html)
 * instead of drawing new ones.
 */
const shared: {
  canvas: HTMLCanvasElement | null;
  renderer: Renderer | null;
  loading: boolean;
  ready: boolean;
  failed: boolean;
  /** The picture the page now holding the tiles opens on. */
  wanted: number;
  /** The page now holding the tiles: told when they are up or have failed, and sizes and shows them. */
  owner: { ready: () => void; failed: () => void; measure: () => void; update: () => void } | null;
  release: number;
} = {
  canvas: null,
  renderer: null,
  loading: false,
  ready: false,
  failed: false,
  wanted: 0,
  owner: null,
  release: 0,
};

/** Let the tiles go once no information page has taken them over. */
function releaseTiles() {
  shared.renderer?.dispose();
  shared.canvas?.remove();
  Object.assign(shared, {
    canvas: null,
    renderer: null,
    loading: false,
    ready: false,
    failed: false,
    owner: null,
    release: 0,
  });
}

/** Scales the 1920 x 1080 stage to the hero; the renderer's view, in stage px. */
function layoutStage(container: HTMLElement, layout: HTMLElement) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const phone = width < 800;
  const scale = phone
    ? Math.max(width / 1160, height / 850)
    : Math.min(width / 1920, height / 1080);
  if (phone) {
    layout.style.width = '1920px';
    layout.style.height = '1080px';
    layout.style.transform = `translate(${(width - 1160 * scale) / 2 - 760 * scale}px, ${(height - 1080 * scale) / 2}px) scale(${scale})`;
    return { w: 1920, h: 1080, x: 0, y: 0 };
  }
  const w = Math.round(width / scale),
    h = Math.round(height / scale);
  layout.style.width = `${w}px`;
  layout.style.height = `${h}px`;
  layout.style.transform = `scale(${scale})`;
  return { w, h, x: (w - 1920) / 2, y: (h - 1080) / 2 };
}

/** The picture a page opens on: its own, or a placeholder other than the one the last such page opened on. */
function openingPicture(page: string) {
  let previous: number | undefined;
  try {
    previous = Number(sessionStorage.getItem(PLACEHOLDER_KEY) ?? -1);
  } catch {}
  const placeholder = randomTileImageOrder(previous)[0];
  const first = pagePicture(page, placeholder);
  if (first === placeholder) {
    try {
      sessionStorage.setItem(PLACEHOLDER_KEY, String(placeholder));
    } catch {}
  }
  return first;
}

/** Only the supplied export's visual stage; the host page owns all copy and navigation. */
export default function HexaTileHero({ page }: { page: string }) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  // `null` until the tiles are placed (in the browser, before the first paint)
  const [state, setState] = useState<{
    picture: number;
    ready: boolean;
    failed: boolean;
    /** The tiles were not up yet as the page opened: its picture is shown under them until they are. */
    still: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const container = host.current;
    const layout = stage.current;
    if (!container || !layout) return;
    const picture = openingPicture(page);
    const view = layoutStage(container, layout);

    // take the tiles over from the page before, if it was one of these (in the same commit as it let them go, so
    // they never leave the screen), or start them
    window.clearTimeout(shared.release);
    shared.release = 0;
    shared.wanted = picture;
    let canvas = shared.canvas;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      canvas.className = styles.canvas;
      canvas.style.opacity = '0';
      shared.canvas = canvas;
    }
    layout.appendChild(canvas);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => {
      if (shared.owner === owner)
        shared.renderer?.setVisible(visible && !document.hidden, preference.matches);
    };
    const measure = () => {
      const next = layoutStage(container, layout);
      if (shared.owner === owner) shared.renderer?.resize(next.w, next.h, next.x, next.y);
    };
    const owner = {
      ready: () => setState((now) => now && { ...now, ready: true }),
      failed: () => setState((now) => now && { ...now, ready: false, failed: true }),
      measure,
      update,
    };
    shared.owner = owner;
    setState({ picture, ready: shared.ready, failed: shared.failed, still: !shared.ready });

    if (shared.renderer) {
      // the same tiles, turned to this page's picture
      shared.renderer.resize(view.w, view.h, view.x, view.y);
      shared.renderer.show(picture);
    } else if (!shared.loading) {
      shared.loading = true;
      void loadRenderer()
        .then(({ createHexaTileRenderer }) => {
          const surface = shared.canvas;
          if (!shared.loading || !surface) return;
          shared.loading = false;
          shared.renderer = createHexaTileRenderer(surface, {
            pictures: INFO_PICTURES,
            first: shared.wanted,
            onReady: () => {
              shared.ready = true;
              surface.style.opacity = '1';
              shared.owner?.ready();
            },
            onError: () => {
              shared.failed = true;
              surface.style.opacity = '0';
              shared.owner?.failed();
            },
          });
          shared.owner?.measure();
          shared.owner?.update();
        })
        .catch(() => {
          shared.loading = false;
          shared.failed = true;
          shared.owner?.failed();
        });
    }

    const resize = new ResizeObserver(measure);
    resize.observe(container);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(container);
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      resize.disconnect();
      observer.disconnect();
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      if (shared.owner !== owner) return;
      // let the tiles go: the next information page takes them over, or after a while they are let go of for good
      shared.owner = null;
      shared.renderer?.setVisible(false, preference.matches);
      canvas.remove();
      shared.release = window.setTimeout(releaseTiles, KEEP_MS);
    };
  }, [page]);

  // The page's own picture under the tiles while they first come up (or for good without WebGL2); none when the
  // page took over tiles already up.
  const fallback = state?.still || state?.failed ? INFO_PICTURES[state.picture] : null;
  return (
    <div ref={host} className={styles.artwork} data-hexa-tile-hero aria-hidden="true">
      <div ref={stage} className={styles.stage}>
        {fallback && (
          <Image
            width={1000}
            height={666}
            unoptimized
            priority
            src={fallback.src}
            alt=""
            className={fallback.full ? styles.fallbackFull : styles.fallback}
            style={{ opacity: state?.ready && !state.failed ? 0 : 1 }}
          />
        )}
      </div>
    </div>
  );
}
