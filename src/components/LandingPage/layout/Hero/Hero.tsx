/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useState } from 'react';

import { classNames } from '@/util/utils';
import ProgressiveImage from '../../components/ProgressiveImage';
import { useSanityContentForHero } from '../../content';
import { EnumSection } from '../../sections/sections';
import styles from './Hero.module.css';
import NextPanel from './NextPanel';

interface HeroProps {
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
  const [videoReady, setVideoReady] = useState(false);
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
        {backgroundType === 'image' && imageURL && <img src={imageURL} alt="Background" />}
      </div>
      (
      <div className={styles.text}>
        <div className="flex flex-col items-center">
          <h1 className={styles.largeTitle}>{title}</h1>
          {section === EnumSection.Home && (
            <Link href="/app/virtual-lab/sync" className={styles.virtualLabsButton}>
              <div className="font-title relative top-0.5 text-lg text-white md:text-xl">Go to</div>
              <div className="relative -top-0.5 text-center font-serif text-4xl whitespace-nowrap text-white md:text-5xl">
                Virtual Labs
              </div>
            </Link>
          )}
          {content && <div className={styles.content}>{content}</div>}
        </div>
      </div>
      )
      <footer>
        <NextPanel>{next}</NextPanel>
      </footer>
    </div>
  );
}
