'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import React from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { classNames } from '@/util/utils';

import styles from '@/ui/segments/landing/layout/hero/hero.module.css';

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
  return (
    <div className={classNames(className, styles.hero, styles.withMedia)}>
      <div className={styles.media}>
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
        <div className="flex flex-col items-center">
          <h1 style={{ fontSize: 'clamp(32px, 3.2vw, 48px)' }}>{title}</h1>
          <div className={classNames(styles.content, 'flex flex-col gap-[6px]')}>
            <div>November 15 – 19</div>
            <div>San Diego Convention Center</div>
            <div>Booth #3631</div>
          </div>
          <Link
            href="/app/virtual-lab"
            aria-label="Create virtual lab"
            className="bg-primary-9 mt-[24px] rounded-full px-[23px] py-[13px] text-[15px]! font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#00428b]"
            id="create-virtual-lab"
          >
            Create your Virtual Lab
          </Link>
        </div>
      </div>
    </div>
  );
}
