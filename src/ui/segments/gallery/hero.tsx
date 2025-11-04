/* eslint-disable @next/next/no-img-element */
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
  return (
    <div className="relative flex h-screen w-screen items-center px-[14vw]">
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
          className={cn('h-screen w-screen object-cover', videoReady ? 'block' : 'hidden')}
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
        <h1 className="my-0! text-[10vmin]! text-white">{title}</h1>
        <h2 className="font-gabarito text-4xl! leading-normal! font-bold text-white">
          Discover image and video assets created by our team. Made with our tools and technologies.
        </h2>
      </div>
    </div>
  );
}
