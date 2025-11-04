/* eslint-disable @next/next/no-img-element */
import React from 'react';

import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
import { cn } from '@/utils/css-class';

import styles from '@/components/LandingPage/LandingPage.module.css';

type HeroProps = {
  videoURL: string;
  posterURL: string;
  posterWidth: number;
  posterHeight: number;
  title: string;
  className?: string;
};

export default function HeroGallery({
  videoURL,
  posterURL,
  posterWidth,
  posterHeight,
  title,
  className,
}: HeroProps) {
  const [videoReady, setVideoReady] = React.useState(false);
  return (
    <div className={cn(className, styles.hero)} style={{ height: '100vh' }}>
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
      <div className="relative top-0 left-0 z-10 flex flex-col">
        <h1 className="text-[10vmin] text-white">{title}</h1>
        <h2 className="font-gabarito text-2xl font-bold text-white">
          Discover image and video assets created by our team. Made with our tools and technologies.
        </h2>
      </div>
    </div>
  );
}
