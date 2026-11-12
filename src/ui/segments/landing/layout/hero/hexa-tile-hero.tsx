'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { randomTileImageOrder } from './tile-image-order';

import styles from './hexa-tile-hero.module.css';

/** Only the supplied export's visual stage; the host page owns all copy and navigation. */
export default function HexaTileHero() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const container = host.current;
    const surface = canvas.current;
    const layout = stage.current;
    if (!container || !surface || !layout) return;
    let previousFirst: number | undefined;
    try {
      previousFirst = Number(sessionStorage.getItem('obi-information-first-image') ?? -1);
    } catch {}
    const imageOrder = randomTileImageOrder(previousFirst);
    try {
      sessionStorage.setItem('obi-information-first-image', String(imageOrder[0]));
    } catch {}
    let disposed = false;
    let visible = false;
    let renderer:
      | {
          setVisible: (value: boolean, reduced: boolean) => void;
          resize: (w: number, h: number, x: number, y: number) => void;
          dispose: () => void;
        }
      | undefined;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => renderer?.setVisible(visible && !document.hidden, preference.matches);
    const measure = () => {
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
        renderer?.resize(1920, 1080, 0, 0);
      } else {
        const w = Math.round(width / scale),
          h = Math.round(height / scale);
        layout.style.width = `${w}px`;
        layout.style.height = `${h}px`;
        layout.style.transform = `scale(${scale})`;
        renderer?.resize(w, h, (w - 1920) / 2, (h - 1080) / 2);
      }
    };
    const resize = new ResizeObserver(measure);
    resize.observe(container);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(container);
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    void import('./hexa-tile-renderer')
      .then(({ createHexaTileRenderer }) => {
        if (disposed) return;
        try {
          renderer = createHexaTileRenderer(surface, {
            imageOrder,
            onReady: () => {
              if (!disposed) setReady(true);
            },
            onError: () => {
              if (!disposed) setReady(false);
            },
          });
          measure();
          update();
        } catch {
          setReady(false);
        }
      })
      .catch(() => {
        if (!disposed) setReady(false);
      });
    return () => {
      disposed = true;
      renderer?.dispose();
      observer.disconnect();
      resize.disconnect();
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return (
    <div ref={host} className={styles.artwork} data-hexa-tile-hero aria-hidden="true">
      <div ref={stage} className={styles.stage}>
        {/* The image remains available on browsers without WebGL2. */}
        <Image
          width={1000}
          height={666}
          unoptimized
          src="/static/hexa-tiles/flywire.png"
          alt=""
          className={styles.fallback}
          style={{ opacity: ready ? 0 : 1 }}
        />
        <canvas
          ref={canvas}
          width={1920}
          height={1080}
          className={styles.canvas}
          style={{ opacity: ready ? 1 : 0 }}
        />
      </div>
    </div>
  );
}
