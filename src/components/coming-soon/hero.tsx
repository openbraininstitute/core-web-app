'use client';

import Image from 'next/image';
import { useState } from 'react';

import { useSanityContentForHero } from '../LandingPage/content';
import { EnumSection } from '../LandingPage/sections/sections';

import { basePath } from '@/config';
import { classNames } from '@/util/utils';

export default function Hero() {
  const [videoReady, setVideoReady] = useState(false);
  const { videoURL } = useSanityContentForHero(EnumSection.ComingSoon);

  return (
    <div className="relative h-svh w-screen bg-primary-8 text-white">
      <div className="absolute inset-0">
        <Image
          fill
          priority
          alt="coming-soon"
          src={`${basePath}/images/coming-soon/background.webp`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <video
          className={classNames(
            'absolute inset-0 h-full w-full object-cover',
            'transition-opacity duration-1000',
            videoReady ? 'opacity-100' : 'opacity-0'
          )}
          loop
          muted
          autoPlay
          playsInline
          disablePictureInPicture
          src={videoURL ?? ''}
          onCanPlay={() => setVideoReady(true)}
        />
      </div>
    </div>
  );
}
