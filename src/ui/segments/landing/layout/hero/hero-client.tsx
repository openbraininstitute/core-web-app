'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import NewsletterForm from '@/ui/segments/landing/components/coming-soon/newsletter-form';
import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { EnumSection } from '@/ui/segments/landing/sections/sections';
import { getSection } from '@/ui/segments/landing/utils';
import { classNames } from '@/util/utils';

import { HEXAGON_ARTWORKS } from './hexagon-artworks';
import HexagonHero from './hexagon-hero';
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
  const hasMedia = backgroundType === 'video' || (backgroundType === 'image' && Boolean(imageURL));
  const sectionSlug = getSection(section).slug.replace(/^\//, '') || 'home';
  const hexagonArtwork =
    hasMedia && section !== EnumSection.Home ? HEXAGON_ARTWORKS[sectionSlug] : undefined;
  const heroTestIdPrefix = `landing-${sectionSlug}-hero`;
  return (
    <div
      data-page-section
      className={classNames(
        className,
        styles.hero,
        hasMedia ? styles.withMedia : styles.wordsOnly,
        hasMedia && section !== EnumSection.Home && styles.immersive,
        hexagonArtwork && styles.hexagonHero
      )}
    >
      {hasMedia && (
        <div
          className={classNames(styles.media, hexagonArtwork && styles.hexagonMedia)}
          data-header-media
        >
          {hexagonArtwork && <HexagonHero key={hexagonArtwork.mosaic} artwork={hexagonArtwork} />}
          {!hexagonArtwork && backgroundType === 'video' && (
            <>
              {posterURL && posterWidth && posterHeight && (
                <ProgressiveImage
                  src={posterURL}
                  width={posterWidth}
                  height={posterHeight}
                  alt="Hero image"
                  testId={`${heroTestIdPrefix}-image`}
                />
              )}
              <video
                className={videoReady ? styles.show : styles.hide}
                loop
                muted
                autoPlay
                playsInline
                disablePictureInPicture
                crossOrigin="anonymous"
                src={videoURL ?? ''}
                onCanPlay={() => setVideoReady(true)}
              />
            </>
          )}
          {!hexagonArtwork && backgroundType === 'image' && imageURL && (
            <Image
              src={imageURL}
              alt=""
              fill
              sizes="100vw"
              preload
              data-testid={`${heroTestIdPrefix}-image`}
            />
          )}
        </div>
      )}
      {section === EnumSection.ComingSoon ? (
        <div className={styles.comingSoon}>
          <ComingSoon />
        </div>
      ) : (
        <div className={styles.text}>
          <div className="flex flex-col items-center">
            <h1
              className={styles.largeTitle}
              data-testid={
                section === EnumSection.Home ? 'home-hero-heading' : `${heroTestIdPrefix}-heading`
              }
            >
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
        <NextPanel testId={`${heroTestIdPrefix}-next`}>{next}</NextPanel>
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
          <h1 className="mb-4 font-serif text-4xl font-bold tracking-[0.040em] text-primary-9 select-none sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Releasing soon
          </h1>
          <p className="mx-auto mr-4 max-w-3xl text-justify text-lg font-medium text-primary-9 select-none sm:text-left md:text-xl">
            The platform will be launched soon with access to features such as single cell modeling
            and experiment design in addition to access to notebooks
          </p>
        </div>
        <NewsletterForm position="page" key="main-newsletter-form" />
      </div>
    </main>
  );
}
