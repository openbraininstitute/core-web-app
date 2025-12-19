/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import React from 'react';
import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
import useFullHeight from '@/hooks/useFullHeight';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import styles from './hero.module.css';

type HeroProps = {
  videoURL: string;
  posterURL: string;
  posterWidth: number;
  posterHeight: number;
  title: string;
  className?: string;
};

export default function HeroSFN({
  videoURL,
  posterURL,
  posterWidth,
  posterHeight,
  title,
  className,
}: HeroProps) {
  const [videoReady, setVideoReady] = React.useState(false);
  const height = useFullHeight();
  return (
    <div className={classNames(className, styles.hero)} style={{ height }}>
      <div className={cn(styles.background)}>
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
      </div>
      <div className={styles.text}>
        <div>
          <h1 className={styles.largeTitle}>{title}</h1>
        </div>
        <div className="font-title flex flex-col gap-4 rounded-lg text-2xl! text-white md:flex-row md:items-center md:gap-12 md:text-3xl!">
          <div>November 15 – 19</div>
          <div>San Diego Convention Center</div>
          <div>Booth #3631</div>
          <Link
            href="/app/virtual-lab"
            aria-label="Create virtual lab"
            className={cn(
              'font-gabarito relative rounded-full px-16 py-6 text-2xl! font-medium! whitespace-nowrap text-white shadow-2xl md:py-6 md:text-3xl!',
              styles.rainbowButton,
            )}
            id="create-virtual-lab"
          >
            <span>Create your Virtual Lab</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
