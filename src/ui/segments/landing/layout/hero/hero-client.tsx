'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import React from 'react';

import NewsletterForm from '@/ui/segments/landing/components/coming-soon/newsletter-form';
import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { EnumSection } from '@/ui/segments/landing/sections/sections';
import { classNames } from '@/util/utils';
import useFullHeight from '@/utils/use-full-height';

import NextPanel from './next-panel';

import type { ContentForHero } from '@/services/sanity/api/get-hero-content';

import styles from './hero.module.css';

interface HeroClientProps {
  className?: string;
  section: EnumSection;
  data: ContentForHero;
}

export default function HeroClient({ className, section, data }: HeroClientProps) {
  const {
    title,
    backgroundType,
    imageURL,
    videoURL,
    posterURL,
    posterWidth,
    posterHeight,
    content,
    next,
  } = data;
  const [videoReady, setVideoReady] = React.useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = React.useState(false);
  const heroRef = React.useRef<HTMLDivElement>(null);
  const height = useFullHeight();

  React.useEffect(() => {
    if (!videoURL || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isWideScreen = window.matchMedia('(min-width: 769px)').matches;
    const connection = (
      navigator as Navigator & {
        connection?: { effectiveType?: string; saveData?: boolean };
      }
    ).connection;
    const isSlowConnection =
      connection?.saveData ||
      connection?.effectiveType === 'slow-2g' ||
      connection?.effectiveType === '2g';

    if (prefersReducedMotion || !isWideScreen || isSlowConnection) return;

    const hero = heroRef.current;
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(hero);

    return () => observer.disconnect();
  }, [videoURL]);

  return (
    <div ref={heroRef} className={classNames(className, styles.hero)} style={{ height }}>
      <div className={classNames(styles.background)}>
        {backgroundType === 'video' && (
          <>
            {posterURL && posterWidth && posterHeight && (
              <ProgressiveImage
                src={posterURL}
                width={posterWidth}
                height={posterHeight}
                alt="Hero image"
                priority
                sizes="100vw"
              />
            )}
            {shouldLoadVideo && (
              <video
                className={videoReady ? styles.show : styles.hide}
                loop
                muted
                autoPlay
                playsInline
                preload="none"
                disablePictureInPicture
                src={videoURL ?? ''}
                onCanPlay={() => setVideoReady(true)}
              />
            )}
          </>
        )}
        {backgroundType === 'image' && imageURL && <img src={imageURL} alt="Background" />}
      </div>
      {section === EnumSection.ComingSoon ? (
        <div className={styles.comingSoon}>
          <ComingSoon />
        </div>
      ) : (
        <div className={styles.text}>
          <div className="flex flex-col items-center">
            <h1 className={styles.largeTitle} data-testid="home-hero-heading">
              {title}
            </h1>
            {section === EnumSection.Home && (
              <Link
                href="/app/virtual-lab/sync"
                className={styles.virtualLabsButton}
                data-testid="virtual-labs-link"
              >
                <div className="font-title relative top-0.5 text-lg text-white md:text-xl">
                  Go to
                </div>
                <div className="relative -top-0.5 text-center font-serif text-4xl whitespace-nowrap text-white md:text-5xl">
                  Virtual Labs
                </div>
              </Link>
            )}
            {content && <div className={styles.content}>{content}</div>}
          </div>
        </div>
      )}
      <footer>
        <NextPanel>{next}</NextPanel>
      </footer>
    </div>
  );
}

function ComingSoon() {
  return (
    <main
      className={classNames(
        'relative mx-auto min-h-[calc(100svh-120px)] max-w-3xl',
        'flex flex-col items-center justify-center',
        'px-6 sm:px-12'
      )}
    >
      <div className="flex flex-col items-start justify-start">
        <div className="animate-fade-in mb-6">
          <h1 className="mb-4 font-serif text-4xl font-bold tracking-[0.040em] text-white select-none sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Releasing soon
          </h1>
          <p className="mx-auto mr-4 max-w-3xl text-justify text-lg font-medium text-white select-none sm:text-left md:text-xl">
            The platform will be launched soon with access to features such as single cell modeling
            and experiment design in addition to access to notebooks
          </p>
        </div>
        <NewsletterForm position="page" key="main-newsletter-form" />
      </div>
    </main>
  );
}
