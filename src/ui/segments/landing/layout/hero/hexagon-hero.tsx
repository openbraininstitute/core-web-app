'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import styles from './hexagon-hero.module.css';

export interface HexagonArtwork {
  mosaic: string;
  solid: string;
}

interface Tile {
  image: HTMLCanvasElement;
  x: number;
  y: number;
  pad: number;
  delay: number;
}

const WAVE_SECONDS = 5.7;
const SOLID_SECONDS = 5;

const smooth = (value: number) => {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
};

/** The approved generated artwork supplies both registered animation states. */
export default function HexagonHero({ artwork }: { artwork: HexagonArtwork }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let disposed = false;
    let frame = 0;
    let elapsed = 0;
    let last = 0;
    let lastDraw = 0;
    let visible = false;
    let loaded = false;
    let holding = false;
    const width = 1280;
    let height = 720;
    let density = 1;
    let tiles: Tile[] = [];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mosaic = new window.Image();
    const solid = new window.Image();

    const drawImage = (image: HTMLImageElement) => {
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
    };
    const draw = () => {
      drawImage(solid);
      canvas.dataset.waveState = reduced.matches || elapsed >= WAVE_SECONDS ? 'solid' : 'wave';
      if (reduced.matches || elapsed >= WAVE_SECONDS) return;
      for (const tile of tiles) {
        const local = elapsed - tile.delay;
        const opacity = 1 - smooth((local - 0.28) / 1.12);
        if (opacity <= 0) continue;
        const lift = local > 0 && local < 0.86 ? Math.sin((local / 0.86) * Math.PI) : 0;
        context.save();
        context.globalAlpha = opacity;
        context.translate(tile.x, tile.y - lift * 9);
        context.scale(1 + lift * 0.075, 1 + lift * 0.075);
        context.drawImage(tile.image, -tile.pad, -tile.pad, tile.pad * 2, tile.pad * 2);
        context.restore();
      }
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      lastDraw = 0;
    };
    const tick = (now: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden || reduced.matches) return;
      if (last) elapsed += Math.min((now - last) / 1000, 0.08);
      last = now;
      if (elapsed >= WAVE_SECONDS + SOLID_SECONDS) {
        elapsed = 0;
        holding = false;
      }
      if (now - lastDraw >= 1000 / 30) {
        if (!holding) draw();
        holding = elapsed >= WAVE_SECONDS;
        lastDraw = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const syncPlayback = () => {
      stop();
      if (!loaded || disposed) return;
      if (reduced.matches) draw();
      else if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);
    document.addEventListener('visibilitychange', syncPlayback);
    reduced.addEventListener('change', syncPlayback);

    mosaic.src = artwork.mosaic;
    solid.src = artwork.solid;
    Promise.all([mosaic.decode(), solid.decode()])
      .then(() => {
        if (disposed) return;
        height = (width * mosaic.naturalHeight) / mosaic.naturalWidth;
        density = Math.min(1.5, mosaic.naturalWidth / width);
        canvas.width = Math.round(width * density);
        canvas.height = Math.round(height * density);
        context.setTransform(density, 0, 0, density, 0, 0);
        context.imageSmoothingQuality = 'high';
        const radius = 32;
        const stepX = Math.sqrt(3) * radius;
        const stepY = 1.5 * radius;
        for (let row = -1; row <= height / stepY + 1; row++) {
          for (let col = -1; col <= width / stepX + 1; col++) {
            const x = col * stepX + ((row % 2) * stepX) / 2;
            const y = row * stepY;
            const pad = radius + 4;
            const tile = document.createElement('canvas');
            tile.width = tile.height = Math.ceil(pad * 2 * density);
            const c = tile.getContext('2d');
            if (!c) continue;
            c.scale(density, density);
            c.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              const px = pad + Math.cos(angle) * (radius + 1);
              const py = pad + Math.sin(angle) * (radius + 1);
              if (i === 0) c.moveTo(px, py);
              else c.lineTo(px, py);
            }
            c.closePath();
            c.clip();
            c.drawImage(mosaic, pad - x, pad - y, width, height);
            tiles.push({
              image: tile,
              x,
              y,
              pad,
              delay: 0.35 + (1 - x / width) * 3.65 + Math.sin(row * 0.8) * 0.055,
            });
          }
        }
        loaded = true;
        if (reduced.matches) draw();
        else drawImage(mosaic);
        setReady(true);
        syncPlayback();
      })
      .catch(() => {
        // The server-rendered artwork remains visible if canvas images fail.
      });

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      reduced.removeEventListener('change', syncPlayback);
      tiles = [];
    };
  }, [artwork]);

  return (
    <div className={styles.artwork} aria-hidden="true" data-hexagon-hero>
      <Image
        src={artwork.mosaic}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 84vw"
        preload
        className={ready ? styles.hidden : undefined}
      />
      <canvas ref={canvasRef} className={ready ? styles.canvas : styles.hidden} />
    </div>
  );
}
