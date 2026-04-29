'use client';

import { useEffect } from 'react';

import GalleryContent from '@/ui/segments/gallery/content';
import HeroGallery from '@/ui/segments/gallery/hero';
import Menu from '@/ui/segments/landing/layout/menu/menu';
import { EnumSection } from '@/ui/segments/landing/sections/sections';
import { useScrollHasStarted } from '@/utils/scroll-has-started';

import type { GalleryContentProps } from '@/services/sanity';

import styles from '@/ui/segments/landing/landing-page.module.css';

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
      <Menu scrollHasStarted={scrollHasStarted} section={EnumSection.Gallery} />
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
