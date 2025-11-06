'use client';

import { useEffect } from 'react';

import FooterPanel from '@/components/LandingPage/layout/FooterPanel';
import Menu from '@/components/LandingPage/layout/Menu';
import ContentSFN from '@/ui/segments/sfn-2025/content';
import HeroSFN from '@/ui/segments/sfn-2025/hero';

import { useScrollHasStarted } from '@/utils/scroll-has-started';

import styles from '@/components/LandingPage/LandingPage.module.css';

export default function Page() {
  const scrollHasStarted = useScrollHasStarted();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, []);

  return (
    <div className={styles.landingPage}>
      <Menu scrollHasStarted={scrollHasStarted} />
      <HeroSFN
        videoURL="https://player.vimeo.com/progressive_redirect/playback/1129107045/rendition/1080p/file.mp4?loc=external&log_user=0&signature=24971da0f0dba7530737456770428772dfed7fd99b400c3f31e41638bf741059"
        posterURL="/video/thumb.jpg"
        posterWidth={1920}
        posterHeight={108}
        title="Visit Us at SfN 2025 and Experience Our Virtual Labs in Action!"
      />
      <ContentSFN />
      <FooterPanel />
    </div>
  );
}
