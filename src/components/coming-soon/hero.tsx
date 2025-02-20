'use client';

import { useState } from 'react';
import Image from 'next/image';

import { useSanityContentForHero } from '@/components/LandingPage/content/hero';
import { EnumSection } from '@/components/LandingPage/sections/sections';

import { basePath } from '@/config';
import { classNames } from '@/util/utils';

export default function Hero() {
  const [videoReady, setVideoReady] = useState(false);
  const { videoURL } = useSanityContentForHero(EnumSection.ComingSoon);

  return (
    <div className="relative h-svh min-h-screen w-screen bg-primary-8 text-white">
      <div className="absolute inset-0">
        <Image
          fill
          priority
          alt="coming-soon"
          src={`${basePath}/images/coming-soon/background.webp`}
          className="absolute inset-0 h-screen min-h-screen w-screen object-cover"
        />
        <video
          className={classNames(
            'absolute inset-0 h-screen w-screen object-cover',
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
