'use client';

import Image from 'next/image';
import { useState } from 'react';

import type { GalleryContentProps } from '@/api/sanity/gallery/route';

type GalleryContentComponentProps = {
  galleryContent: GalleryContentProps[];
};

export default function GalleryContent({ galleryContent }: GalleryContentComponentProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (imageUrl: string) => {
    setLoadedImages((prev) => new Set(prev).add(imageUrl));
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col gap-6 px-6 py-8">
      <div>
        <h2 className="text-2xl font-bold">Gallery</h2>
      </div>
      <div className="grid h-full w-full grid-cols-4 gap-6">
        {galleryContent.map((item) => {
          const imageUrl = item.image;
          const isLoaded = imageUrl ? loadedImages.has(imageUrl) : false;

          if (!imageUrl) return null;

          const uniqueKey = `${item.title}-${imageUrl}`;

          return (
            <div
              key={uniqueKey}
              className="relative aspect-square w-full overflow-hidden rounded-lg"
            >
              {!isLoaded && (
                <div
                  className="absolute inset-0 animate-pulse bg-gray-200"
                  style={{
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                />
              )}
              <Image
                src={imageUrl}
                alt={item.title || 'Gallery image'}
                fill
                className={`object-cover transition-opacity duration-300 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => handleImageLoad(imageUrl)}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
