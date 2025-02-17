/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { useSanityContentForHero } from '../../content';
import { EnumSection } from '../../sections/sections';
import ProgressiveImage from '../../components/ProgressiveImage';
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
      <div className={styles.text}>
        <div>
          <h1 className={styles.largeTitle}>{title}</h1>
          {content && <div className={styles.content}>{content}</div>}
        </div>
      </div>
      <footer>
        <NextPanel>{next}</NextPanel>
      </footer>
    </div>
  );
}
