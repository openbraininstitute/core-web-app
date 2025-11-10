'use client';

import { useMemo, useState } from 'react';

import Media from '@/ui/segments/gallery/media';

import type { GalleryContentProps } from '@/api/sanity/gallery/route';
import GalleryFilters from '@/ui/segments/gallery/filters';
import { MediaModal } from '@/ui/segments/gallery/modal';

type GalleryContentComponentProps = {
  galleryContent: GalleryContentProps[];
};

export default function GalleryContent({ galleryContent }: GalleryContentComponentProps) {
  const [loadedMedia, setLoadedMedia] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<GalleryContentProps | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBrainRegion, setSelectedBrainRegion] = useState<string | null>(null);
  const [selectedMediaType] = useState<string | null>(null);

  const filteredContent = useMemo(() => {
    return galleryContent.filter((item) => {
      if (selectedBrainRegion && item.brainRegion !== selectedBrainRegion) {
        return false;
      }
      if (selectedMediaType && item.mediaType !== selectedMediaType) {
        return false;
      }
      return true;
    });
  }, [galleryContent, selectedBrainRegion, selectedMediaType]);

  const handleMediaLoad = (mediaUrl: string) => {
    setLoadedMedia((prev) => new Set(prev).add(mediaUrl));
  };

  const handleOpenModal = (item: GalleryContentProps) => {
    setSelectedMedia(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMedia(null);
  };

  return (
    <>
      <div className="relative flex min-h-screen w-full flex-col gap-6 px-4 py-8 md:px-6">
        <GalleryFilters
          galleryContent={galleryContent}
          selectedBrainRegion={selectedBrainRegion}
          // selectedMediaType={selectedMediaType}
          onBrainRegionChange={setSelectedBrainRegion}
          // onMediaTypeChange={setSelectedMediaType}
        />
        <div className="grid h-full w-full grid-cols-2 gap-6 md:grid-cols-5">
          {filteredContent.map((item) => {
            const mediaUrl = item.mediaType === 'video' ? item.video : item.image;
            const isLoaded = mediaUrl ? loadedMedia.has(mediaUrl) : false;

            if (!mediaUrl) return null;

            return (
              <Media
                key={`${item.title}-${mediaUrl}`}
                item={item}
                isLoaded={isLoaded}
                onLoad={() => handleMediaLoad(mediaUrl)}
                onOpenModal={() => handleOpenModal(item)}
              />
            );
          })}
        </div>
      </div>
      <MediaModal open={isModalOpen} onClose={handleCloseModal} item={selectedMedia} />
    </>
  );
}
