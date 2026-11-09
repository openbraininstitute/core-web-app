'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import styles from './landing-tile-stage.module.css';

const FEATURES = [
  {
    label: 'Simulate activity',
    image: 'simulate',
    width: 900,
    height: 1012,
    alt: 'Simulated cortical microcircuit',
  },
  {
    label: 'Explore data',
    image: 'explore',
    width: 560,
    height: 853,
    alt: 'Reconstructed fly neurons',
  },
  { label: 'Build models', image: 'build', width: 700, height: 720, alt: 'Whole-brain model' },
  { label: 'Virtual labs', image: 'virtual-labs', width: 580, height: 876, alt: 'Brain atlas' },
];

/** The supplied landing composition, with accessible controls and a stacked phone layout. */
export function LandingTileStage({
  scene,
  reduced,
  visible,
  onSelect,
  onInteraction,
}: {
  scene: number;
  reduced: boolean;
  visible: boolean;
  onSelect: (index: number) => void;
  onInteraction: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const picks = useRef<HTMLDivElement>(null);
  const engine = useRef<{ setVisible: (visible: boolean) => void; dispose: () => void } | null>(
    null
  );
  const latest = useRef({ scene, onSelect, onInteraction, visible });
  latest.current = { scene, onSelect, onInteraction, visible };
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ctaState, setCtaState] = useState('waiting');

  useEffect(() => {
    if (!ready && !failed) return;
    if (reduced) {
      setCtaState('alive');
      return;
    }
    const entrance = window.setTimeout(() => setCtaState('enter'), 1250);
    const pulse = window.setTimeout(() => setCtaState('alive'), 3000);
    return () => {
      window.clearTimeout(entrance);
      window.clearTimeout(pulse);
    };
  }, [ready, failed, reduced]);

  useEffect(() => {
    const container = host.current;
    const composition = stage.current;
    const surface = canvas.current;
    const controls = picks.current;
    if (!container || !composition || !surface || !controls) return;
    let disposed = false;
    const resize = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      const phone = width < 800;
      const scale = phone ? Math.min(width / 1000, 0.39) : Math.min(width / 1920, height / 1080);
      composition.style.setProperty('--stage-scale', String(scale));
      if (!phone) {
        composition.style.left = `${(width - 1920 * scale) / 2}px`;
        composition.style.top = `${(height - 1080 * scale) / 2}px`;
      } else {
        composition.style.left = '0px';
        composition.style.top = '0px';
      }
    });
    resize.observe(container);
    void import('./landing-tile-renderer')
      .then(({ createLandingTileRenderer }) => {
        if (disposed) return;
        try {
          engine.current = createLandingTileRenderer(surface, controls, {
            initialIndex: latest.current.scene,
            reduced,
            onSelect: (index: number) => latest.current.onSelect(index),
            onInteraction: () => latest.current.onInteraction(),
            onReady: () => {
              if (!disposed) setReady(true);
            },
            onError: () => {
              if (!disposed) setFailed(true);
            },
          });
          engine.current.setVisible(latest.current.visible);
        } catch {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      engine.current?.dispose();
      engine.current = null;
      resize.disconnect();
    };
  }, [reduced]);

  useEffect(() => engine.current?.setVisible(visible), [visible]);

  return (
    <div ref={host} className={styles.host} data-tile-landing data-ready={ready || failed}>
      <div ref={stage} className={styles.stage}>
        <canvas ref={canvas} className={styles.tiles} />
        <div ref={picks} className={styles.picks} />
        <h1 className={styles.headline}>
          <span>Neuroscience</span>
          <span>at the speed</span>
          <span>of thought</span>
        </h1>
        <div className={styles.actionRow}>
          <span className={styles.line} aria-hidden="true" />
          <p className={styles.label} data-testid="science-caption" aria-live="polite" key={scene}>
            {FEATURES[scene].label}
          </p>
          <span className={styles.line} aria-hidden="true" />
          <div className={styles.ctaGroup}>
            <Link className={styles.cta} data-cta-state={ctaState} href="/app/virtual-lab">
              Try it now
            </Link>
            <p className={styles.reassurance}>In your browser. Nothing to install.</p>
          </div>
        </div>
        <figure className={styles.heroImage} aria-label={FEATURES[scene].alt}>
          {FEATURES.map((feature, index) => (
            <Image
              key={feature.image}
              src={`/static/landing-v1/${feature.image}.png`}
              width={1280}
              height={feature.height}
              unoptimized
              loading="eager"
              alt={index === scene ? feature.alt : ''}
              aria-hidden={index !== scene}
              data-active={index === scene}
              style={{ width: feature.width }}
            />
          ))}
        </figure>
      </div>
    </div>
  );
}
