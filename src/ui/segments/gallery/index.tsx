'use client';

import { useEffect } from 'react';

import Menu from '@/components/LandingPage/layout/Menu';
import GalleryContent from '@/ui/segments/gallery/content';
import HeroGallery from '@/ui/segments/gallery/hero';
import { useScrollHasStarted } from '@/utils/scroll-has-started';

import type { GalleryContentProps } from '@/api/sanity/gallery/route';

import styles from '@/components/LandingPage/LandingPage.module.css';

type GalleryPageProps = {
  galleryContent: GalleryContentProps[];
};

export default function GalleryPage({ galleryContent }: GalleryPageProps) {
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
      <HeroGallery
        videoURL="https://player.vimeo.com/progressive_redirect/playback/1129107045/rendition/1080p/file.mp4?loc=external&log_user=0&signature=24971da0f0dba7530737456770428772dfed7fd99b400c3f31e41638bf741059"
        posterURL="/video/thumb.jpg"
        posterWidth={1920}
        posterHeight={1080}
        title="Gallery"
      />
      <GalleryContent galleryContent={galleryContent} />
    </div>
  );
}
