/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { useSanityContentForHero } from '../../content';
import { EnumSection } from '../../sections/sections';
import ProgressiveImage from '../../components/ProgressiveImage';
import NewsletterForm from '../../components/coming-soon/newsletter-form';
import NextPanel from './NextPanel';
import { classNames } from '@/util/utils';

import styles from './Hero.module.css';

export interface HeroProps {
  className?: string;
  section: EnumSection;
}

export default function Hero({ className, section }: HeroProps) {
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
  } = useSanityContentForHero(section);
  const [videoReady, setVideoReady] = React.useState(false);

  return (
    <div className={classNames(className, styles.hero)}>
      <div className={classNames(styles.background)}>
        {backgroundType === 'video' && (
          <>
            {posterURL && posterWidth && posterHeight && (
              <ProgressiveImage
                src={posterURL}
                width={posterWidth}
                height={posterHeight}
                alt="Hero image"
              />
            )}
            <video
              className={videoReady ? styles.show : styles.hide}
              loop
              muted
              autoPlay
              playsInline
              disablePictureInPicture
              src={videoURL ?? ''}
              onCanPlay={() => setVideoReady(true)}
            />
          </>
        )}
        {backgroundType === 'image' && <img src={imageURL ?? ''} alt="Background" />}
      </div>
      {section === EnumSection.ComingSoon ? (
        <div className={styles.comingSoon}>
          <ComingSoon />
        </div>
      ) : (
        <div className={styles.text}>
          <div>
            <h1 className={styles.largeTitle}>{title}</h1>
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
        <div className="mb-6 animate-fade-in">
          <h1 className="mb-4 select-none font-serif text-4xl font-bold tracking-[0.040em] text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Releasing soon
          </h1>
          <p className="mx-auto mr-4 max-w-3xl select-none text-justify text-lg font-medium text-white sm:text-left md:text-xl">
            The platform will be launched soon with access to features such as single cell modeling
            and experiment design in addition to access to notebooks
          </p>
        </div>
        <NewsletterForm position="page" key="main-newsletter-form" />
      </div>
    </main>
  );
}
