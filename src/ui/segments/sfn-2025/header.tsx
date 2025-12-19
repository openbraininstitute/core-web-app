'use client';

import { useState } from 'react';

import Menu from '@/components/LandingPage/layout/Menu';
import styles from '@/ui/segments/sfn-2025/landing-page.module.css';
import { cn } from '@/utils/css-class';
import { useScrollHasStarted } from '@/utils/scroll-has-started';

export default function HeaderSFN2025() {
  const scrollHasStarted = useScrollHasStarted();

  const [videoReady, setVideoReady] = useState(false);

  const videoURL =
    'https://player.vimeo.com/progressive_redirect/playback/1129107045/rendition/1080p/file.mp4?loc=external&log_user=0&signature=24971da0f0dba7530737456770428772dfed7fd99b400c3f31e41638bf741059';

  return (
    <div className={styles.landingPage}>
      <Menu scrollHasStarted={scrollHasStarted} />
      <div className="relative z-10 flex h-screen w-screen items-center justify-center">
        <h1 className="text-[10vw] font-bold text-white">
          SfN 2025 Neuroscience at the Speed of Thought{' '}
        </h1>
      </div>
      <div className="absolute top-0 left-0 z-0 h-screen w-full">
        <video
          className={cn(
            'h-full w-full scale-110 object-cover',
            videoReady ? 'opacity-100' : 'opacity-0',
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
