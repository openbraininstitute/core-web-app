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
      | { setVisible: (value: boolean, reduced: boolean) => void; dispose: () => void }
      | undefined;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => renderer?.setVisible(visible && !document.hidden, preference.matches);
    const resize = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const phone = width < 800;
      const scale = Math.max(width / (phone ? 1160 : 1920), height / (phone ? 850 : 1080));
      layout.style.transform = `translate(${(width - (phone ? 1160 : 1920) * scale) / 2 - (phone ? 760 * scale : 0)}px, ${(height - 1080 * scale) / 2}px) scale(${scale})`;
    });
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
        <div className={styles.tint} />
      </div>
    </div>
  );
}
