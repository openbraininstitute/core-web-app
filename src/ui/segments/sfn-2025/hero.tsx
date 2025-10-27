/* eslint-disable @next/next/no-img-element */
import React from 'react';

import useFullHeight from '@/hooks/useFullHeight';
import { classNames } from '@/util/utils';

import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
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
        <div className="font-title text-whit flex flex-row gap-x-12 rounded-full border border-solid border-white px-16 py-8 text-3xl!">
          <div>November 15 – 19</div>
          <div>Booth #3631</div>
          <div>San Diego Convention Center</div>
        </div>
      </div>
    </div>
  );
}
