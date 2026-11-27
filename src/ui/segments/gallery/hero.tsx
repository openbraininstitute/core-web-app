/* eslint-disable @next/next/no-img-element */
import React from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { cn } from '@/utils/css-class';

import styles from '@/ui/segments/landing/layout/hero/hero.module.css';

type HeroProps = {
  videoURL: string;
  posterURL: string;
  posterWidth: number;
  posterHeight: number;
  title: string;
};

export default function HeroGallery({
  videoURL,
  posterURL,
  posterWidth,
  posterHeight,
  title,
}: HeroProps) {
  const [videoReady, setVideoReady] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    // Force video to load in Firefox/Windows 11
    // Firefox sometimes needs explicit load() call
    if (videoRef.current && videoURL) {
      videoRef.current.load();
      // Try to play in case autoplay is blocked
      videoRef.current.play().catch(() => {
        // Autoplay was prevented, video will show when user interacts
      });
    }
  }, [videoURL]);

  return (
    <div className={cn(styles.hero, styles.withMedia)}>
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
          ref={videoRef}
          className={videoReady ? styles.show : styles.hide}
          loop
          muted
          autoPlay
          playsInline
          preload="auto"
          disablePictureInPicture
          src={videoURL ?? ''}
          onCanPlay={() => setVideoReady(true)}
          onLoadedData={() => setVideoReady(true)}
          onLoadedMetadata={() => {
            // Additional event handler for Firefox compatibility
            setVideoReady(true);
          }}
        >
          <track kind="captions" />
        </video>
      </div>
      <div className={styles.text}>
        <div className="flex flex-col items-center">
          <h1>{title}</h1>
          <div className={styles.content}>
            Discover image and video assets created by our team. Made with our tools and technologies.
          </div>
        </div>
      </div>
    </div>
  );
}
