import React from 'react';

import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';

import { cn } from '@/utils/css-class';

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
    <div className="relative flex h-screen w-screen items-center px-10 md:px-[14vw]">
      <div className="absolute top-0 left-0 z-0 h-screen w-screen">
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
          className={cn('h-screen w-screen object-cover', videoReady ? 'block' : 'hidden')}
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
      <div className="relative top-0 left-0 z-10 flex flex-col">
        <h1 className="my-0! text-[16vmin]! text-white md:text-[10vmin]!">{title}</h1>
        <h2 className="font-gabarito text-2xl! leading-normal! font-bold hyphens-auto text-white md:text-4xl!">
          Discover image and video assets created by our team. Made with our tools and technologies.
        </h2>
      </div>
    </div>
  );
}
